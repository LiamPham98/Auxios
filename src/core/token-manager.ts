import { JWTDecoder } from '../utils/jwt-decoder';
import type { EventEmitter } from './event-emitter';
import type { TokenExpiryConfig, TokenPair, TokenStorage } from './types';

export class TokenManager {
  private storage: TokenStorage;
  private eventEmitter: EventEmitter;
  private config: TokenExpiryConfig;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private onRefreshCallback: (() => Promise<void>) | null = null;

  constructor(storage: TokenStorage, eventEmitter: EventEmitter, config: TokenExpiryConfig) {
    this.storage = storage;
    this.eventEmitter = eventEmitter;
    this.config = config;
  }

  async setTokens(tokens: TokenPair): Promise<void> {
    await this.storage.setTokens(tokens.accessToken, tokens.refreshToken);
    this.scheduleProactiveRefresh(tokens.accessToken);
  }

  getAccessToken(): string | null {
    return this.storage.getAccessToken();
  }

  getRefreshToken(): string | null {
    return this.storage.getRefreshToken();
  }

  async clearTokens(): Promise<void> {
    this.clearRefreshTimer();
    await this.storage.clearTokens();
  }

  isAccessTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return true;
    }
    return JWTDecoder.isExpired(token);
  }

  isAccessTokenExpiringSoon(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return true;
    }
    return JWTDecoder.isExpired(token, this.config.proactiveRefreshOffset);
  }

  getAccessTokenTimeUntilExpiry(): number {
    const token = this.getAccessToken();
    if (!token) {
      return 0;
    }
    return JWTDecoder.timeUntilExpiry(token);
  }

  setOnRefreshCallback(callback: () => Promise<void>): void {
    this.onRefreshCallback = callback;
  }

  private scheduleProactiveRefresh(accessToken: string): void {
    this.clearRefreshTimer();

    const timeUntilExpiry = JWTDecoder.timeUntilExpiry(accessToken);
    if (timeUntilExpiry <= 0) {
      return;
    }

    const refreshDelay = Math.max(0, (timeUntilExpiry - this.config.proactiveRefreshOffset) * 1000);

    this.refreshTimer = setTimeout(() => {
      this.handleProactiveRefresh();
    }, refreshDelay);
  }

  private async handleProactiveRefresh(): Promise<void> {
    if (!this.onRefreshCallback) {
      return;
    }

    try {
      await this.onRefreshCallback();
    } catch {
      this.eventEmitter.emitTokenExpired();
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  destroy(): void {
    this.clearRefreshTimer();
    this.onRefreshCallback = null;
  }
}
