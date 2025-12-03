import type { EventEmitter } from './event-emitter';
import type { RequestQueue } from './request-queue';
import type { TokenManager } from './token-manager';
import type { AuthError, RefreshLimitsConfig, RefreshResponse, TokenPair } from './types';
import { AuthErrorCode } from './types';

export class RefreshController {
  private tokenManager: TokenManager;
  private eventEmitter: EventEmitter;
  private requestQueue: RequestQueue;
  private refreshPromise: Promise<TokenPair> | null = null;
  private refreshFn: (() => Promise<RefreshResponse>) | null = null;
  private isRefreshing = false;
  private refreshLimitsConfig: RefreshLimitsConfig;
  private refreshAttempts: number[] = []; // Timestamps of refresh attempts

  constructor(
    tokenManager: TokenManager,
    eventEmitter: EventEmitter,
    requestQueue: RequestQueue,
    refreshLimitsConfig: RefreshLimitsConfig,
  ) {
    this.tokenManager = tokenManager;
    this.eventEmitter = eventEmitter;
    this.requestQueue = requestQueue;
    this.refreshLimitsConfig = refreshLimitsConfig;
  }

  setRefreshFunction(refreshFn: () => Promise<RefreshResponse>): void {
    this.refreshFn = refreshFn;
  }

  async refresh(): Promise<TokenPair> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshFn) {
      throw this.createAuthError('Refresh function not configured', AuthErrorCode.REFRESH_FAILED);
    }

    this.refreshPromise = this.performRefresh();

    try {
      const tokens = await this.refreshPromise;
      return tokens;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<TokenPair> {
    console.log('[Auxios] 🔄 Starting token refresh...');

    // Check refresh limits before attempting refresh
    this.checkRefreshLimits();

    this.isRefreshing = true;
    this.eventEmitter.emitRefreshStart();

    try {
      if (!this.refreshFn) {
        throw this.createAuthError('Refresh function not configured', AuthErrorCode.REFRESH_FAILED);
      }

      const response = await this.refreshFn();
      console.log('[Auxios] ✅ Refresh API successful, response:', {
        hasAccessToken: !!response.accessToken,
        hasRefreshToken: !!response.refreshToken,
        hasExpiresIn: response.expiresIn !== undefined,
        expiresIn: response.expiresIn,
        hasRefreshExpiresIn: response.refreshExpiresIn !== undefined,
        refreshExpiresIn: response.refreshExpiresIn,
      });

      const tokens: TokenPair = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
        refreshExpiresIn: response.refreshExpiresIn,
      };

      await this.tokenManager.setTokens(tokens);
      this.eventEmitter.emitTokenRefreshed(tokens);

      await this.requestQueue.retryAll();

      console.log('[Auxios] ✅ Token refresh completed successfully');
      return tokens;
    } catch (error) {
      console.log('[Auxios] ❌ Token refresh failed:', error);
      const authError = this.normalizeError(error);
      this.eventEmitter.emitAuthError(authError);
      this.requestQueue.rejectAll(authError);
      throw authError;
    } finally {
      this.isRefreshing = false;
      this.eventEmitter.emitRefreshEnd();
    }
  }

  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }

  private normalizeError(error: unknown): AuthError {
    if (this.isAuthError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return this.createAuthError(error.message, AuthErrorCode.REFRESH_FAILED, error);
    }

    return this.createAuthError(
      'Unknown error during token refresh',
      AuthErrorCode.UNKNOWN_ERROR,
      error,
    );
  }

  private isAuthError(error: unknown): error is AuthError {
    return (
      error instanceof Error &&
      'code' in error &&
      Object.values(AuthErrorCode).includes((error as AuthError).code)
    );
  }

  private createAuthError(
    message: string,
    code: AuthErrorCode,
    originalError?: unknown,
  ): AuthError {
    const error = new Error(message) as AuthError;
    error.code = code;
    error.originalError = originalError;
    return error;
  }

  private checkRefreshLimits(): void {
    const now = Date.now();

    // Remove old attempts outside the time window
    this.refreshAttempts = this.refreshAttempts.filter(
      (timestamp) => now - timestamp < this.refreshLimitsConfig.refreshAttemptsWindow,
    );

    // Check if we exceeded the limit
    if (this.refreshAttempts.length >= this.refreshLimitsConfig.maxRefreshAttempts) {
      console.log('[Auxios] ❌ Max refresh attempts exceeded:', {
        attempts: this.refreshAttempts.length,
        limit: this.refreshLimitsConfig.maxRefreshAttempts,
        windowMs: this.refreshLimitsConfig.refreshAttemptsWindow,
        recentAttempts: this.refreshAttempts.map((t) => new Date(t).toISOString()),
      });

      throw this.createAuthError(
        `Maximum refresh attempts (${this.refreshLimitsConfig.maxRefreshAttempts}) exceeded within ${this.refreshLimitsConfig.refreshAttemptsWindow}ms. Possible infinite loop detected.`,
        AuthErrorCode.MAX_REFRESH_ATTEMPTS_EXCEEDED,
      );
    }

    // Record this attempt
    this.refreshAttempts.push(now);
    console.log('[Auxios] 📊 Refresh attempt tracked:', {
      currentAttempts: this.refreshAttempts.length,
      limit: this.refreshLimitsConfig.maxRefreshAttempts,
      windowMs: this.refreshLimitsConfig.refreshAttemptsWindow,
    });
  }
}
