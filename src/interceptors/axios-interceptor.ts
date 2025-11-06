import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { EventEmitter } from '../core/event-emitter';
import type { RefreshController } from '../core/refresh-controller';
import type { RequestQueue } from '../core/request-queue';
import type { TokenManager } from '../core/token-manager';
import { AuthErrorCode } from '../core/types';
import type { NetworkDetector } from '../utils/network-detector';
import type { RetryStrategy } from '../utils/retry-strategy';

const SKIP_AUTH_HEADER = 'X-Skip-Auth';
const TOKEN_BLACKLIST_HEADER = 'X-Token-Blacklisted';

export class AxiosInterceptor {
  private axios: AxiosInstance;
  private tokenManager: TokenManager;
  private refreshController: RefreshController;
  private requestQueue: RequestQueue;
  private networkDetector: NetworkDetector;
  private retryStrategy: RetryStrategy;
  private eventEmitter: EventEmitter;
  private requestInterceptorId: number | null = null;
  private responseInterceptorId: number | null = null;
  private skipRetry: boolean;

  constructor(
    axios: AxiosInstance,
    tokenManager: TokenManager,
    refreshController: RefreshController,
    requestQueue: RequestQueue,
    networkDetector: NetworkDetector,
    retryStrategy: RetryStrategy,
    eventEmitter: EventEmitter,
    skipRetry?: boolean,
  ) {
    this.axios = axios;
    this.tokenManager = tokenManager;
    this.refreshController = refreshController;
    this.requestQueue = requestQueue;
    this.networkDetector = networkDetector;
    this.retryStrategy = retryStrategy;
    this.eventEmitter = eventEmitter;
    this.skipRetry = skipRetry || false;
  }

  setup(): void {
    this.requestInterceptorId = this.axios.interceptors.request.use(
      (config) => this.onRequest(config),
      (error) => Promise.reject(error),
    );

    this.responseInterceptorId = this.axios.interceptors.response.use(
      (response) => this.onResponse(response),
      (error) => this.onResponseError(error),
    );
  }

  private onRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if (config.headers[SKIP_AUTH_HEADER]) {
      delete config.headers[SKIP_AUTH_HEADER];
      return config;
    }

    const token = this.tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }

  private onResponse(response: AxiosResponse): AxiosResponse {
    if (response.headers[TOKEN_BLACKLIST_HEADER.toLowerCase()]) {
      throw {
        response,
        config: response.config,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Token blacklisted',
        code: AuthErrorCode.TOKEN_BLACKLISTED,
      };
    }

    return response;
  }

  private async onResponseError(error: unknown): Promise<unknown> {
    if (!this.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // Skip server error retry handling if this is already a retry attempt
    if (error.config?.headers?.['X-Retry-Attempt']) {
      return Promise.reject(error);
    }

    if (status === 401) {
      return this.handleAuthError(error);
    }

    if (status === 403) {
      return this.handleForbiddenError(error);
    }

    if (status && status >= 500) {
      return this.handleServerError(error);
    }

    if (!status && !this.networkDetector.isOnline()) {
      return this.handleNetworkError(error);
    }

    return Promise.reject(error);
  }

  private async handleAuthError(error: unknown): Promise<unknown> {
    if (!this.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const config = error.config;

    if (error.response?.headers[TOKEN_BLACKLIST_HEADER.toLowerCase()]) {
      const authError = Object.assign(new Error('Token has been blacklisted'), {
        code: AuthErrorCode.TOKEN_BLACKLISTED,
      });
      return Promise.reject(authError);
    }

    if (this.refreshController.isCurrentlyRefreshing()) {
      return this.requestQueue.enqueue(() => this.axios.request(config));
    }

    try {
      await this.refreshController.refresh();
      return this.axios.request(config);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }

  private handleForbiddenError(error: unknown): Promise<unknown> {
    if (!this.isAxiosError(error)) {
      return Promise.reject(error);
    }

    if (error.response?.headers[TOKEN_BLACKLIST_HEADER.toLowerCase()]) {
      const authError = Object.assign(new Error('Token has been blacklisted'), {
        code: AuthErrorCode.TOKEN_BLACKLISTED,
      });
      this.eventEmitter.emitAuthError(authError);
      return Promise.reject(authError);
    }

    const forbiddenError = Object.assign(new Error('Request forbidden'), {
      code: AuthErrorCode.FORBIDDEN,
      statusCode: error.response?.status,
      originalError: error,
    });

    this.eventEmitter.emitAuthError(forbiddenError);
    return Promise.reject(forbiddenError);
  }

  private async handleServerError(error: unknown): Promise<unknown> {
    if (!this.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    // Skip retry if configured globally
    if (this.skipRetry) {
      const serverError = Object.assign(
        new Error(`Server error: ${error.response?.status || 500}`),
        {
          code: AuthErrorCode.SERVER_ERROR,
          statusCode: error.response?.status,
          originalError: error,
        },
      );
      return Promise.reject(serverError);
    }

    const config = error.config;
    const maxAttempts = this.retryStrategy.getConfig().maxAttempts;

    try {
      return await this.retryStrategy.execute(
        async () => {
          // Create a new config with retry flag to prevent recursive retry
          const retryConfig = { ...config };
          retryConfig.headers = {
            ...retryConfig.headers,
            'X-Retry-Attempt': 'true',
          };

          // Direct axios request without going through response handling
          const response = await this.axios.request(retryConfig);

          // For retry attempts, handle server errors directly to avoid recursive retries
          if (response?.status >= 500) {
            throw {
              response,
              config: retryConfig,
              isAxiosError: true,
              toJSON: () => ({}),
              name: 'AxiosError',
              message: `Server error: ${response.status}`,
            };
          }

          return response;
        },
        (err, attempt) => {
          if (!this.isAxiosError(err)) {
            return false;
          }

          const status = err.response?.status;
          return status !== undefined && status >= 500 && attempt < maxAttempts;
        },
      );
    } catch (retryError) {
      return Promise.reject(retryError);
    }
  }

  private async handleNetworkError(error: unknown): Promise<unknown> {
    if (!this.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const config = error.config;
    const isOnline = await this.networkDetector.waitForOnline();

    if (!isOnline) {
      const networkError = Object.assign(new Error('Network offline'), {
        code: AuthErrorCode.NETWORK_ERROR,
        originalError: error,
      });
      return Promise.reject(networkError);
    }

    try {
      return await this.axios.request(config);
    } catch (retryError) {
      return Promise.reject(retryError);
    }
  }

  private isAxiosError(error: unknown): error is {
    response?: AxiosResponse;
    config?: AxiosRequestConfig;
    isAxiosError: boolean;
  } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      error.isAxiosError === true
    );
  }

  eject(): void {
    if (this.requestInterceptorId !== null) {
      this.axios.interceptors.request.eject(this.requestInterceptorId);
      this.requestInterceptorId = null;
    }

    if (this.responseInterceptorId !== null) {
      this.axios.interceptors.response.eject(this.responseInterceptorId);
      this.responseInterceptorId = null;
    }
  }
}
