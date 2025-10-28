import type { EventEmitter } from './event-emitter';
import type { RequestQueue } from './request-queue';
import type { TokenManager } from './token-manager';
import type { AuthError, RefreshResponse, TokenPair } from './types';
import { AuthErrorCode } from './types';

export class RefreshController {
  private tokenManager: TokenManager;
  private eventEmitter: EventEmitter;
  private requestQueue: RequestQueue;
  private refreshPromise: Promise<TokenPair> | null = null;
  private refreshFn: (() => Promise<RefreshResponse>) | null = null;
  private isRefreshing = false;

  constructor(tokenManager: TokenManager, eventEmitter: EventEmitter, requestQueue: RequestQueue) {
    this.tokenManager = tokenManager;
    this.eventEmitter = eventEmitter;
    this.requestQueue = requestQueue;
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
    this.isRefreshing = true;
    this.eventEmitter.emitRefreshStart();

    try {
      if (!this.refreshFn) {
        throw this.createAuthError('Refresh function not configured', AuthErrorCode.REFRESH_FAILED);
      }

      const response = await this.refreshFn();
      const tokens: TokenPair = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      };

      await this.tokenManager.setTokens(tokens);
      this.eventEmitter.emitTokenRefreshed(tokens);

      await this.requestQueue.retryAll();

      return tokens;
    } catch (error) {
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
}
