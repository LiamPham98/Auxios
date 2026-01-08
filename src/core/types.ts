export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
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

export interface RefreshLimitsConfig {
  maxRefreshAttempts: number; // Maximum refresh calls within time window
  refreshAttemptsWindow: number; // Time window in milliseconds
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

export interface StorageKeysConfig {
  accessToken?: string;
  refreshToken?: string;
}

export interface TokenFieldNamesConfig {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  refreshExpiresIn?: string;
}

export interface RefreshRequestConfig {
  body?: any;
  headers?: Record<string, string>;
  method?: string;
}

/**
 * Custom response interceptor configuration.
 * Allows transforming responses and errors before they're returned/rejected.
 */
export interface ResponseInterceptorConfig<T = any> {
  /**
   * Called when a successful response is received.
   * Can transform the response before it's returned to the caller.
   * @param response - The response object (AxiosResponse for axios, Response for fetch)
   * @returns The transformed response or a promise that resolves to it
   */
  onResponse?: (response: T) => T | Promise<T>;

  /**
   * Called when an error response is received.
   * Can transform the error before it's rejected.
   * @param error - The error object
   * @returns The transformed error or a promise that resolves to it
   */
  onResponseError?: (error: unknown) => unknown | Promise<unknown>;
}

export interface AuxiosConfig {
  endpoints: EndpointsConfig;
  storage?: StorageType;
  retry?: Partial<RetryConfig>;
  tokenExpiry?: Partial<TokenExpiryConfig>;
  refreshLimits?: Partial<RefreshLimitsConfig>;
  events?: EventCallbacks;
  headers?: Record<string, string>;
  multiTabSync?: boolean;
  autoRefresh?: boolean;
  skipRetry?: boolean;
  csrfToken?: string;
  storageKeys?: StorageKeysConfig;
  tokenFieldNames?: TokenFieldNamesConfig;
  buildRefreshRequest?: (refreshToken: string) => RefreshRequestConfig;
  refreshTokenFn?: (refreshToken: string) => Promise<RefreshResponse>;
  /**
   * Custom response interceptor configuration.
   * Allows transforming responses and errors before they're returned/rejected.
   */
  responseInterceptor?: ResponseInterceptorConfig;
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
  MAX_REFRESH_ATTEMPTS_EXCEEDED = 'MAX_REFRESH_ATTEMPTS_EXCEEDED',
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
  expiresIn?: number;
  refreshExpiresIn?: number;
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
