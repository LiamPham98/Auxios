import type { AuthError, EventCallbacks, TokenPair } from './types';

export class EventEmitter {
  private callbacks: EventCallbacks;

  constructor(callbacks: EventCallbacks = {}) {
    this.callbacks = callbacks;
  }

  emitTokenRefreshed(tokens: TokenPair): void {
    this.callbacks.onTokenRefreshed?.(tokens);
  }

  emitTokenExpired(): void {
    this.callbacks.onTokenExpired?.();
  }

  emitAuthError(error: AuthError): void {
    this.callbacks.onAuthError?.(error);
  }

  emitLogout(): void {
    this.callbacks.onLogout?.();
  }

  emitRefreshStart(): void {
    this.callbacks.onRefreshStart?.();
  }

  emitRefreshEnd(): void {
    this.callbacks.onRefreshEnd?.();
  }

  updateCallbacks(callbacks: EventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}
