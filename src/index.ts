export { Auxios } from './auxios';

export type {
  AuxiosConfig,
  TokenPair,
  TokenStorage,
  StorageType,
  RetryConfig,
  TokenExpiryConfig,
  EndpointsConfig,
  EventCallbacks,
  AuthError,
  RefreshResponse,
  DecodedToken,
  QueuedRequest,
  MultiTabSyncMessage,
  NetworkStatus,
} from './core/types';

export { AuthErrorCode } from './core/types';

export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  CookieStorageAdapter,
  createStorage,
} from './core/token-storage';

export { JWTDecoder } from './utils/jwt-decoder';

export { useAuth, useTokenRefresh, useAuthFetch } from './hooks/react';
