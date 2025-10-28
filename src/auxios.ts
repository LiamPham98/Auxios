import type { AxiosInstance } from 'axios';
import { EventEmitter } from './core/event-emitter';
import { RefreshController } from './core/refresh-controller';
import { RequestQueue } from './core/request-queue';
import { TokenManager } from './core/token-manager';
import { createStorage } from './core/token-storage';
import type {
  AuxiosConfig,
  RetryConfig,
  TokenExpiryConfig,
  TokenPair,
} from './core/types';
import { AxiosInterceptor } from './interceptors/axios-interceptor';
import { FetchWrapper } from './interceptors/fetch-wrapper';
import { MultiTabSync } from './sync/multi-tab-sync';
import { NetworkDetector } from './utils/network-detector';
import { RetryStrategy } from './utils/retry-strategy';

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  exponentialBackoff: true,
};

const DEFAULT_TOKEN_EXPIRY_CONFIG: TokenExpiryConfig = {
  proactiveRefreshOffset: 300,
};

export class Auxios {
  private config: AuxiosConfig;
  private storage: ReturnType<typeof createStorage>;
  private eventEmitter: EventEmitter;
  private tokenManager: TokenManager;
  private requestQueue: RequestQueue;
  private refreshController: RefreshController;
  private multiTabSync: MultiTabSync | null = null;
  private networkDetector: NetworkDetector;
  private retryStrategy: RetryStrategy;
  private axiosInterceptor: AxiosInterceptor | null = null;
  private fetchWrapper: FetchWrapper;

  constructor(config: AuxiosConfig) {
    this.config = {
      storage: 'localStorage',
      multiTabSync: true,
      autoRefresh: true,
      ...config,
      retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
      tokenExpiry: { ...DEFAULT_TOKEN_EXPIRY_CONFIG, ...config.tokenExpiry },
    };

    this.storage = createStorage(this.config.storage!, this.config.storageKeys);
    this.eventEmitter = new EventEmitter(this.config.events);
    this.requestQueue = new RequestQueue();
    this.networkDetector = new NetworkDetector();
    this.retryStrategy = new RetryStrategy(this.config.retry as RetryConfig);

    this.tokenManager = new TokenManager(
      this.storage,
      this.eventEmitter,
      this.config.tokenExpiry as TokenExpiryConfig,
    );

    this.refreshController = new RefreshController(
      this.tokenManager,
      this.eventEmitter,
      this.requestQueue,
    );

    this.fetchWrapper = new FetchWrapper(
      this.tokenManager,
      this.refreshController,
      this.requestQueue,
      this.networkDetector,
      this.retryStrategy,
    );

    if (this.config.multiTabSync) {
      this.multiTabSync = new MultiTabSync(true);
      this.setupMultiTabSync();
    }

    this.setupRefreshFunction();
  }

  private setupRefreshFunction(): void {
    this.refreshController.setRefreshFunction(async () => {
      const refreshToken = this.tokenManager.getRefreshToken();
      if (!refreshToken) {
        const error = new Error(
          'No refresh token available. Please login first by calling auth.setTokens() with your access and refresh tokens.',
        ) as any;
        error.code = 'NO_REFRESH_TOKEN';
        throw error;
      }

      // Use custom refresh function if provided
      if (this.config.refreshTokenFn) {
        return await this.config.refreshTokenFn(refreshToken);
      }

      // Build request using custom config or defaults
      const requestConfig = this.config.buildRefreshRequest
        ? this.config.buildRefreshRequest(refreshToken)
        : {
            body: { refreshToken },
            headers: {},
            method: 'POST',
          };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...requestConfig.headers,
      };

      if (this.config.csrfToken) {
        headers['X-CSRF-Token'] = this.config.csrfToken;
      }

      const response = await fetch(this.config.endpoints.refresh, {
        method: requestConfig.method || 'POST',
        headers,
        body: JSON.stringify(requestConfig.body),
      });

      if (!response.ok) {
        throw new Error(`Refresh failed with status ${response.status}`);
      }

      const data = await response.json();

      // Map response fields using custom field names or defaults
      const accessTokenField = this.config.tokenFieldNames?.accessToken || 'accessToken';
      const refreshTokenField = this.config.tokenFieldNames?.refreshToken || 'refreshToken';

      return {
        accessToken: data[accessTokenField],
        refreshToken: data[refreshTokenField],
      };
    });

    if (this.config.autoRefresh) {
      this.tokenManager.setOnRefreshCallback(async () => {
        await this.refreshController.refresh();
      });
    }
  }

  private setupMultiTabSync(): void {
    if (!this.multiTabSync) return;

    this.multiTabSync.setOnTokenUpdate(async (tokens) => {
      await this.tokenManager.setTokens(tokens);
    });

    this.multiTabSync.setOnLogout(async () => {
      await this.handleLogout(false);
    });

    this.multiTabSync.setOnTokenBlacklisted(async () => {
      await this.handleLogout(false);
    });
  }

  async setTokens(tokens: TokenPair): Promise<void> {
    await this.tokenManager.setTokens(tokens);

    if (this.multiTabSync) {
      this.multiTabSync.broadcastTokenUpdate(tokens);
    }
  }

  getAccessToken(): string | null {
    return this.tokenManager.getAccessToken();
  }

  getRefreshToken(): string | null {
    return this.tokenManager.getRefreshToken();
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.tokenManager.isAccessTokenExpired();
  }

  async refreshTokens(): Promise<TokenPair> {
    return this.refreshController.refresh();
  }

  setupAxiosInterceptor(axios: AxiosInstance): void {
    if (this.axiosInterceptor) {
      this.axiosInterceptor.eject();
    }

    this.axiosInterceptor = new AxiosInterceptor(
      axios,
      this.tokenManager,
      this.refreshController,
      this.requestQueue,
      this.networkDetector,
      this.retryStrategy,
    );

    this.axiosInterceptor.setup();
  }

  ejectAxiosInterceptor(): void {
    if (this.axiosInterceptor) {
      this.axiosInterceptor.eject();
      this.axiosInterceptor = null;
    }
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    return this.fetchWrapper.fetch(url, options);
  }

  async logout(callServer = true): Promise<void> {
    await this.handleLogout(callServer);

    if (this.multiTabSync) {
      this.multiTabSync.broadcastLogout();
    }
  }

  private async handleLogout(callServer: boolean): Promise<void> {
    this.requestQueue.clear();

    if (callServer && this.config.endpoints.logout) {
      try {
        const headers: Record<string, string> = {
          ...this.config.headers,
        };

        const refreshToken = this.tokenManager.getRefreshToken();
        if (refreshToken) {
          await fetch(this.config.endpoints.logout, {
            method: 'POST',
            headers,
            body: JSON.stringify({ refreshToken }),
          });
        }
      } catch {
        // Ignore logout errors
      }
    }

    await this.tokenManager.clearTokens();
    this.eventEmitter.emitLogout();
  }

  updateConfig(config: Partial<AuxiosConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.events) {
      this.eventEmitter.updateCallbacks(config.events);
    }

    if (config.retry) {
      this.retryStrategy.updateConfig(config.retry);
    }
  }

  destroy(): void {
    this.tokenManager.destroy();
    this.networkDetector.destroy();
    this.multiTabSync?.destroy();
    this.ejectAxiosInterceptor();
    this.requestQueue.clear();
  }
}
