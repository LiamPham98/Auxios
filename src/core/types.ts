export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface DecodedToken {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export type StorageType = 'localStorage' | 'sessionStorage' | 'memory' | 'cookie';

export interface TokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

export interface TokenExpiryConfig {
  proactiveRefreshOffset: number;
}

export interface EndpointsConfig {
  refresh: string;
  logout?: string;
}

export interface EventCallbacks {
  onTokenRefreshed?: (tokens: TokenPair) => void;
  onTokenExpired?: () => void;
  onAuthError?: (error: AuthError) => void;
  onLogout?: () => void;
  onRefreshStart?: () => void;
  onRefreshEnd?: () => void;
}

export interface AuxiosConfig {
  endpoints: EndpointsConfig;
  storage?: StorageType;
  retry?: Partial<RetryConfig>;
  tokenExpiry?: Partial<TokenExpiryConfig>;
  events?: EventCallbacks;
  headers?: Record<string, string>;
  multiTabSync?: boolean;
  autoRefresh?: boolean;
  csrfToken?: string;
}

export interface AuthError extends Error {
  code: AuthErrorCode;
  statusCode?: number;
  originalError?: unknown;
}

export enum AuthErrorCode {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_FAILED = 'REFRESH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SERVER_ERROR = 'SERVER_ERROR',
  TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface QueuedRequest {
  id: string;
  retry: () => Promise<unknown>;
  reject: (error: Error) => void;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MultiTabSyncMessage {
  type: 'TOKEN_UPDATED' | 'LOGOUT' | 'REFRESH_STARTED' | 'TOKEN_BLACKLISTED';
  payload?: TokenPair | null;
  timestamp: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  lastChecked: number;
}
