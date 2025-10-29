import { JWTDecoder } from '../utils/jwt-decoder';
import type { EventEmitter } from './event-emitter';
import type { TokenExpiryConfig, TokenPair, TokenStorage } from './types';

export class TokenManager {
  private storage: TokenStorage;
  private eventEmitter: EventEmitter;
  private config: TokenExpiryConfig;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private onRefreshCallback: (() => Promise<void>) | null = null;
  private expiresAt: number | null = null;
  private refreshExpiresAt: number | null = null;

  constructor(storage: TokenStorage, eventEmitter: EventEmitter, config: TokenExpiryConfig) {
    this.storage = storage;
    this.eventEmitter = eventEmitter;
    this.config = config;
  }

  async setTokens(tokens: TokenPair): Promise<void> {
    await this.storage.setTokens(tokens.accessToken, tokens.refreshToken);

    // Calculate expiry time from expiresIn (priority) or JWT decode (fallback)
    this.expiresAt = this.calculateExpiryTime(tokens.expiresIn, tokens.accessToken);
    this.refreshExpiresAt = this.calculateExpiryTime(tokens.refreshExpiresIn, tokens.refreshToken);

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
    this.expiresAt = null;
    this.refreshExpiresAt = null;
    await this.storage.clearTokens();
  }

  isAccessTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return true;
    }

    // Priority: use expiresAt from config if available
    if (this.expiresAt !== null) {
      const now = Date.now() / 1000;
      return now >= this.expiresAt;
    }

    // Fallback: JWT decode
    return JWTDecoder.isExpired(token);
  }

  isAccessTokenExpiringSoon(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return true;
    }

    // Priority: use expiresAt from config if available
    if (this.expiresAt !== null) {
      const now = Date.now() / 1000;
      return now >= this.expiresAt - this.config.proactiveRefreshOffset;
    }

    // Fallback: JWT decode
    return JWTDecoder.isExpired(token, this.config.proactiveRefreshOffset);
  }

  getAccessTokenTimeUntilExpiry(): number {
    const token = this.getAccessToken();
    if (!token) {
      return 0;
    }

    // Priority: use expiresAt from config if available
    if (this.expiresAt !== null) {
      const now = Date.now() / 1000;
      return Math.max(0, this.expiresAt - now);
    }

    // Fallback: JWT decode
    return JWTDecoder.timeUntilExpiry(token);
  }

  isRefreshTokenExpired(): boolean {
    const token = this.getRefreshToken();
    if (!token) {
      return true;
    }

    // Priority: use refreshExpiresAt from config if available
    if (this.refreshExpiresAt !== null) {
      const now = Date.now() / 1000;
      return now >= this.refreshExpiresAt;
    }

    // Fallback: JWT decode
    return JWTDecoder.isExpired(token);
  }

  setOnRefreshCallback(callback: () => Promise<void>): void {
    this.onRefreshCallback = callback;
  }

  private scheduleProactiveRefresh(accessToken: string): void {
    this.clearRefreshTimer();

    let timeUntilExpiry: number;

    // Priority: use expiresAt from config if available
    if (this.expiresAt !== null) {
      const now = Date.now() / 1000;
      timeUntilExpiry = Math.max(0, this.expiresAt - now);
    } else {
      // Fallback: JWT decode
      timeUntilExpiry = JWTDecoder.timeUntilExpiry(accessToken);
    }

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

  private calculateExpiryTime(expiresIn?: number, token?: string): number | null {
    // Priority: use expiresIn from config
    if (expiresIn !== undefined && expiresIn > 0) {
      return Date.now() / 1000 + expiresIn;
    }

    // Fallback: decode JWT if no expiresIn provided
    if (token) {
      const decoded = JWTDecoder.decode(token);
      return decoded?.exp ?? null;
    }

    return null;
  }

  destroy(): void {
    this.clearRefreshTimer();
    this.expiresAt = null;
    this.refreshExpiresAt = null;
    this.onRefreshCallback = null;
  }
}
