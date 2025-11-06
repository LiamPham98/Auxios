import type { EventEmitter } from '../core/event-emitter';
import type { RefreshController } from '../core/refresh-controller';
import type { RequestQueue } from '../core/request-queue';
import type { TokenManager } from '../core/token-manager';
import { AuthErrorCode } from '../core/types';
import type { NetworkDetector } from '../utils/network-detector';
import type { RetryStrategy } from '../utils/retry-strategy';

const SKIP_AUTH_HEADER = 'X-Skip-Auth';
const TOKEN_BLACKLIST_HEADER = 'X-Token-Blacklisted';

export class FetchWrapper {
  private tokenManager: TokenManager;
  private refreshController: RefreshController;
  private requestQueue: RequestQueue;
  private networkDetector: NetworkDetector;
  private retryStrategy: RetryStrategy;
  private eventEmitter: EventEmitter;
  private skipRetry: boolean;

  constructor(
    tokenManager: TokenManager,
    refreshController: RefreshController,
    requestQueue: RequestQueue,
    networkDetector: NetworkDetector,
    retryStrategy: RetryStrategy,
    eventEmitter: EventEmitter,
    skipRetry?: boolean,
  ) {
    this.tokenManager = tokenManager;
    this.refreshController = refreshController;
    this.requestQueue = requestQueue;
    this.networkDetector = networkDetector;
    this.retryStrategy = retryStrategy;
    this.eventEmitter = eventEmitter;
    this.skipRetry = skipRetry || false;
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const requestOptions = this.prepareRequest(options);

    try {
      const response = await fetch(url, requestOptions);
      return await this.handleResponse(url, requestOptions, response);
    } catch (error) {
      return this.handleError(url, requestOptions, error);
    }
  }

  private prepareRequest(options: RequestInit): RequestInit {
    const headers = new Headers(options.headers);

    if (headers.has(SKIP_AUTH_HEADER)) {
      headers.delete(SKIP_AUTH_HEADER);
      return { ...options, headers };
    }

    const token = this.tokenManager.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return { ...options, headers };
  }

  private async handleResponse(
    url: string,
    options: RequestInit,
    response: Response,
  ): Promise<Response> {
    // Skip server error retry handling if this is already a retry attempt
    const headers = new Headers(options.headers);
    if (headers.has('X-Retry-Attempt') || headers.has('x-retry-attempt')) {
      return response;
    }

    if (response.headers.get(TOKEN_BLACKLIST_HEADER)) {
      const error = Object.assign(new Error('Token has been blacklisted'), {
        code: AuthErrorCode.TOKEN_BLACKLISTED,
      });
      throw error;
    }

    if (response.status === 401) {
      return this.handleAuthError(url, options, response);
    }

    if (response.status === 403) {
      const forbiddenError = Object.assign(new Error('Request forbidden'), {
        code: AuthErrorCode.FORBIDDEN,
        statusCode: response.status,
        originalError: response,
      });
      this.eventEmitter.emitAuthError(forbiddenError);
      throw forbiddenError;
    }

    if (response.status >= 500) {
      return this.handleServerError(url, options);
    }

    return response;
  }

  private async handleAuthError(
    url: string,
    options: RequestInit,
    response: Response,
  ): Promise<Response> {
    if (response.headers.get(TOKEN_BLACKLIST_HEADER)) {
      const error = Object.assign(new Error('Token has been blacklisted'), {
        code: AuthErrorCode.TOKEN_BLACKLISTED,
      });
      throw error;
    }

    if (this.refreshController.isCurrentlyRefreshing()) {
      return (await this.requestQueue.enqueue(() => this.fetch(url, options))) as Response;
    }

    await this.refreshController.refresh();
    return this.fetch(url, options);
  }

  private async handleServerError(url: string, options: RequestInit): Promise<Response> {
    // Skip retry if configured globally or via request header
    if (this.skipRetry) {
      const serverError = Object.assign(new Error(`Server error: 500`), {
        code: AuthErrorCode.SERVER_ERROR,
        statusCode: 500,
        originalError: new Response(null, { status: 500 }),
      });
      throw serverError;
    }

    const maxAttempts = this.retryStrategy.getConfig().maxAttempts;

    return await this.retryStrategy.execute(
      async () => {
        // Add a flag to prevent recursive retry during the actual fetch call
        const retryOptions = { ...options };

        // Convert headers to plain object, add the retry flag, then create Headers
        const existingHeaders: Record<string, string> = {};
        if (retryOptions.headers) {
          if (retryOptions.headers instanceof Headers) {
            retryOptions.headers.forEach((value, key) => {
              existingHeaders[key] = value;
            });
          } else if (typeof retryOptions.headers === 'object') {
            Object.assign(existingHeaders, retryOptions.headers);
          }
        }

        existingHeaders['X-Retry-Attempt'] = 'true';
        retryOptions.headers = new Headers(existingHeaders);

        // Direct fetch without going through our wrapper to avoid recursive retry logic
        const requestOptions = this.prepareRequest(retryOptions);
        const response = await fetch(url, requestOptions);

        // For retry attempts, we need to handle the response directly here
        // to avoid going through normal response handling which could cause recursive retries
        if (response.status >= 500) {
          throw response;
        }

        // For successful responses or non-server errors in retry, return directly
        return response;
      },
      (err, attempt) => {
        if (err instanceof Response) {
          return err.status >= 500 && attempt < maxAttempts;
        }
        return false;
      },
    );
  }

  private async handleError(url: string, options: RequestInit, error: unknown): Promise<Response> {
    if (!this.networkDetector.isOnline()) {
      const isOnline = await this.networkDetector.waitForOnline();

      if (!isOnline) {
        const networkError = Object.assign(new Error('Network offline'), {
          code: AuthErrorCode.NETWORK_ERROR,
          originalError: error,
        });
        throw networkError;
      }

      return this.fetch(url, options);
    }

    throw error;
  }
}
