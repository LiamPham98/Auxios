import type { TokenStorage } from './types';

const ACCESS_TOKEN_KEY = 'auxios_access_token';
const REFRESH_TOKEN_KEY = 'auxios_refresh_token';

export class LocalStorageAdapter implements TokenStorage {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens(): Promise<void> {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export class SessionStorageAdapter implements TokenStorage {
  getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens(): Promise<void> {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
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

  constructor(
    options: {
      domain?: string;
      path?: string;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
    } = {},
  ) {
    const { domain, path = '/', secure = true, sameSite = 'strict' } = options;
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
    return this.getCookie(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.getCookie(REFRESH_TOKEN_KEY);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.setCookie(ACCESS_TOKEN_KEY, accessToken);
    this.setCookie(REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens(): Promise<void> {
    this.deleteCookie(ACCESS_TOKEN_KEY);
    this.deleteCookie(REFRESH_TOKEN_KEY);
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
): TokenStorage {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter();
    case 'sessionStorage':
      return new SessionStorageAdapter();
    case 'memory':
      return new MemoryStorageAdapter();
    case 'cookie':
      return new CookieStorageAdapter();
    default:
      return new MemoryStorageAdapter();
  }
}
