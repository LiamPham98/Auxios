import type { StorageKeysConfig, TokenStorage } from './types';

const DEFAULT_ACCESS_TOKEN_KEY = 'auxios_access_token';
const DEFAULT_REFRESH_TOKEN_KEY = 'auxios_refresh_token';

export class LocalStorageAdapter implements TokenStorage {
  private accessTokenKey: string;
  private refreshTokenKey: string;

  constructor(keys?: StorageKeysConfig) {
    this.accessTokenKey = keys?.accessToken || DEFAULT_ACCESS_TOKEN_KEY;
    this.refreshTokenKey = keys?.refreshToken || DEFAULT_REFRESH_TOKEN_KEY;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  async clearTokens(): Promise<void> {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}

export class SessionStorageAdapter implements TokenStorage {
  private accessTokenKey: string;
  private refreshTokenKey: string;

  constructor(keys?: StorageKeysConfig) {
    this.accessTokenKey = keys?.accessToken || DEFAULT_ACCESS_TOKEN_KEY;
    this.refreshTokenKey = keys?.refreshToken || DEFAULT_REFRESH_TOKEN_KEY;
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(this.refreshTokenKey);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    sessionStorage.setItem(this.accessTokenKey, accessToken);
    sessionStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  async clearTokens(): Promise<void> {
    sessionStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.refreshTokenKey);
  }
}

export class MemoryStorageAdapter implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

export class CookieStorageAdapter implements TokenStorage {
  private cookieOptions: string;
  private accessTokenKey: string;
  private refreshTokenKey: string;

  constructor(
    options: {
      domain?: string;
      path?: string;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      keys?: StorageKeysConfig;
    } = {},
  ) {
    const { domain, path = '/', secure = true, sameSite = 'strict', keys } = options;
    this.accessTokenKey = keys?.accessToken || DEFAULT_ACCESS_TOKEN_KEY;
    this.refreshTokenKey = keys?.refreshToken || DEFAULT_REFRESH_TOKEN_KEY;
    this.cookieOptions = [
      path ? `path=${path}` : '',
      domain ? `domain=${domain}` : '',
      secure ? 'secure' : '',
      `SameSite=${sameSite}`,
      'HttpOnly',
    ]
      .filter(Boolean)
      .join('; ');
  }

  getAccessToken(): string | null {
    return this.getCookie(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return this.getCookie(this.refreshTokenKey);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.setCookie(this.accessTokenKey, accessToken);
    this.setCookie(this.refreshTokenKey, refreshToken);
  }

  async clearTokens(): Promise<void> {
    this.deleteCookie(this.accessTokenKey);
    this.deleteCookie(this.refreshTokenKey);
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() ?? null;
    }
    return null;
  }

  private setCookie(name: string, value: string): void {
    document.cookie = `${name}=${value}; ${this.cookieOptions}`;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=; ${this.cookieOptions}; max-age=0`;
  }
}

export function createStorage(
  type: 'localStorage' | 'sessionStorage' | 'memory' | 'cookie',
  keys?: StorageKeysConfig,
): TokenStorage {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter(keys);
    case 'sessionStorage':
      return new SessionStorageAdapter(keys);
    case 'memory':
      return new MemoryStorageAdapter();
    case 'cookie':
      return new CookieStorageAdapter({ keys });
    default:
      return new MemoryStorageAdapter();
  }
}
