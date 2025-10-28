# Auxios

Production-ready TypeScript authentication library with automatic token refresh, multi-tab synchronization, and race condition prevention.

## Features

### Core Features
- ✅ **Token Management**: Store, retrieve, and clear tokens with support for localStorage, sessionStorage, memory, and httpOnly cookies
- ✅ **Auto Refresh**: Automatically refresh access token on 401/403, including retry of original request
- ✅ **Request Queue**: Queue all pending requests during token refresh
- ✅ **Race Condition Prevention**: Ensures only 1 refresh request executes when multiple 401s occur simultaneously
- ✅ **Multi-tab Synchronization**: Sync tokens across tabs using BroadcastChannel or storage events

### Security & Error Handling
- ✅ **Token Rotation**: Invalidate old refresh tokens after use
- ✅ **Error Differentiation**: Distinguish between 401/403 and 5xx errors
- ✅ **Network Detection**: Detect offline status and retry when online
- ✅ **Request Timeout**: Handle timeouts with exponential backoff
- ✅ **XSS/CSRF Protection**: Built-in security recommendations

### Configuration
- ✅ **Custom Endpoints**: Configure refresh and logout endpoints
- ✅ **Retry Logic**: Configurable max attempts, delay, and exponential backoff
- ✅ **Event Callbacks**: onTokenRefreshed, onTokenExpired, onAuthError, onLogout
- ✅ **JWT Decode**: Track expiry and enable proactive refresh

### Integration
- ✅ **Axios Interceptor**: Seamless Axios integration
- ✅ **Fetch Wrapper**: Native fetch API support
- ✅ **Framework Agnostic**: Works with any framework
- ✅ **React Hooks**: Example hooks for React applications

## Installation

```bash
pnpm install auxios axios
```

## Quick Start

### Basic Usage

```typescript
import { Auxios } from 'auxios';

const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  storage: 'localStorage',
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
  },
  tokenExpiry: {
    proactiveRefreshOffset: 300, // Refresh 5 min before expiry
  },
  multiTabSync: true,
  events: {
    onTokenRefreshed: (tokens) => console.log('Refreshed!'),
    onTokenExpired: () => window.location.href = '/login',
    onAuthError: (error) => console.error('Auth error:', error),
  },
});

// After login, set tokens
await auth.setTokens({
  accessToken: 'your-access-token',
  refreshToken: 'your-refresh-token',
});

// Check authentication
if (auth.isAuthenticated()) {
  console.log('User is authenticated');
}

// Logout
await auth.logout();
```

### Axios Integration

```typescript
import axios from 'axios';
import { Auxios } from 'auxios';

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
});

const api = axios.create({
  baseURL: 'https://api.example.com',
});

// Setup interceptor
auth.setupAxiosInterceptor(api);

// All requests now automatically:
// - Include Authorization header
// - Handle 401/403 with token refresh
// - Queue and retry requests during refresh
// - Handle network errors with retry logic

const response = await api.get('/user/profile');
```

### Fetch Integration

```typescript
import { Auxios } from 'auxios';

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
});

// Use auth.fetch instead of native fetch
const response = await auth.fetch('https://api.example.com/user', {
  method: 'GET',
});

const data = await response.json();
```

### React Integration

```typescript
import { useAuth, useTokenRefresh } from 'auxios';

function App() {
  const { isAuthenticated, login, logout, isRefreshing } = useAuth(auth);
  
  // Auto-refresh tokens every minute
  useTokenRefresh(auth, 60000);

  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={() => login(tokens)}>Login</button>
      )}
    </div>
  );
}
```

## Configuration

```typescript
interface AuxiosConfig {
  endpoints: {
    refresh: string;        // Required: Token refresh endpoint
    logout?: string;        // Optional: Logout endpoint
  };
  storage?: 'localStorage' | 'sessionStorage' | 'memory' | 'cookie';
  retry?: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    exponentialBackoff: boolean;
  };
  tokenExpiry?: {
    proactiveRefreshOffset: number;  // Seconds before expiry to refresh
  };
  events?: {
    onTokenRefreshed?: (tokens: TokenPair) => void;
    onTokenExpired?: () => void;
    onAuthError?: (error: AuthError) => void;
    onLogout?: () => void;
  };
  headers?: Record<string, string>;
  multiTabSync?: boolean;
  autoRefresh?: boolean;
  csrfToken?: string;
  
  // NEW: Customization options
  storageKeys?: {
    accessToken?: string;   // Custom localStorage key (default: 'auxios_access_token')
    refreshToken?: string;  // Custom localStorage key (default: 'auxios_refresh_token')
  };
  tokenFieldNames?: {
    accessToken?: string;   // Custom API field name (default: 'accessToken')
    refreshToken?: string;  // Custom API field name (default: 'refreshToken')
  };
  buildRefreshRequest?: (refreshToken: string) => {
    body?: any;            // Custom request body
    headers?: Record<string, string>;  // Custom headers
    method?: string;       // Custom HTTP method (default: 'POST')
  };
  refreshTokenFn?: (refreshToken: string) => Promise<{
    accessToken: string;
    refreshToken: string;
  }>;  // Completely custom refresh logic
}
```

## Customization

Auxios is highly customizable to work with any backend API format.

### Custom Storage Keys

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storageKeys: {
    accessToken: 'my_app_access_token',
    refreshToken: 'my_app_refresh_token',
  },
});
```

### Backend with snake_case

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  },
});
// API returns: { "access_token": "...", "refresh_token": "..." }
```

### Custom Refresh Request

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  buildRefreshRequest: (refreshToken) => ({
    body: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'my-app',
    },
    headers: {
      'X-Device-Id': 'device-123',
    },
  }),
});
```

### Completely Custom Refresh Logic

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    const response = await myCustomAxios.post('/auth/refresh', {
      token: refreshToken,
    });
    
    return {
      accessToken: response.data.jwt,
      refreshToken: response.data.new_refresh,
    };
  },
});
```

For more customization examples, see [CUSTOMIZATION.md](./CUSTOMIZATION.md).

## Features in Detail

### Race Condition Prevention

When multiple requests fail with 401 simultaneously, Auxios ensures only one refresh request is made:

```typescript
// All these requests will share the same refresh promise
const [user, posts, stats] = await Promise.all([
  api.get('/user'),
  api.get('/posts'),
  api.get('/stats'),
]);
// Only 1 refresh request is made, all requests are queued and retried
```

### Multi-Tab Synchronization

Tokens are automatically synchronized across all browser tabs:

```typescript
// In Tab 1: User logs in
await auth.setTokens({ accessToken, refreshToken });

// In Tab 2: Tokens are automatically updated
// In Tab 3: Tokens are automatically updated

// In Tab 1: User logs out
await auth.logout();

// In Tab 2 & 3: Automatically logged out
```

### Proactive Token Refresh

Auxios automatically refreshes tokens before they expire:

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenExpiry: {
    proactiveRefreshOffset: 300, // Refresh 5 minutes before expiry
  },
  autoRefresh: true,
});

// Token will be refreshed automatically in the background
// 5 minutes before it expires
```

### Network Error Handling

```typescript
// Automatically detects network status
// Waits for connection to return
// Retries failed requests when online

const response = await auth.fetch('/api/data');
// If offline, waits up to 30s for connection
// Then retries the request automatically
```

### Error Types

```typescript
enum AuthErrorCode {
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
```

## Security Recommendations

### Use HttpOnly Cookies for Refresh Tokens

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'cookie', // Store tokens in HttpOnly cookies
});
```

### CSRF Protection

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  csrfToken: 'your-csrf-token',
  headers: {
    'X-CSRF-Token': 'your-csrf-token',
  },
});
```

### Token Rotation

Auxios supports token rotation where the refresh token changes after each refresh:

```typescript
// Server response from /api/auth/refresh
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token" // Old token is invalidated
}
```

## API Reference

### `Auxios`

#### `constructor(config: AuxiosConfig)`
Creates a new Auxios instance.

#### `setTokens(tokens: TokenPair): Promise<void>`
Store authentication tokens.

#### `getAccessToken(): string | null`
Retrieve current access token.

#### `getRefreshToken(): string | null`
Retrieve current refresh token.

#### `isAuthenticated(): boolean`
Check if user is authenticated.

#### `refreshTokens(): Promise<TokenPair>`
Manually refresh tokens.

#### `setupAxiosInterceptor(axios: AxiosInstance): void`
Setup Axios interceptor for automatic token management.

#### `fetch(url: string, options?: RequestInit): Promise<Response>`
Fetch wrapper with automatic token management.

#### `logout(callServer?: boolean): Promise<void>`
Logout user and clear tokens.

#### `destroy(): void`
Cleanup resources.

## Examples

See the `/examples` directory for complete examples:
- `basic-usage.ts` - Basic authentication setup
- `axios-integration.ts` - Axios interceptor usage
- `fetch-integration.ts` - Fetch API wrapper usage
- `react-example.tsx` - React hooks integration

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
