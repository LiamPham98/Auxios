# Auxios

Production-ready TypeScript authentication library with automatic token refresh, multi-tab synchronization, and race condition prevention.

[![npm version](https://img.shields.io/npm/v/@trungpham.liam/auxios.svg)](https://www.npmjs.com/package/@trungpham.liam/auxios)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## Overview

Auxios is a powerful authentication library that handles token management, automatic refresh, and synchronization across browser tabs. It works seamlessly with Axios, Fetch API, and any JavaScript framework.

**Perfect for:**
- 🚀 Modern web applications requiring JWT authentication
- 🔄 APIs with token refresh flows (OAuth2, custom auth)
- 📱 Multi-tab applications needing synchronized auth state
- ⚡ Projects requiring automatic token refresh without user interruption

---

## ✨ Key Features

### Core Features
- 🔐 **Automatic Token Refresh** - Refreshes access tokens on 401/403 responses
- 🔄 **Race Condition Prevention** - Ensures only one refresh request when multiple requests fail simultaneously
- 📡 **Multi-Tab Sync** - Synchronize auth state across browser tabs in real-time
- ⏰ **Proactive Refresh** - Automatically refresh tokens before they expire
- 📦 **Multiple Storage Options** - localStorage, sessionStorage, memory, or httpOnly cookies

### HTTP Integration
- 🔌 **Axios Interceptor** - Seamless integration with Axios
- 🌐 **Fetch Wrapper** - Native Fetch API support with middleware pattern
- 🎯 **Request Queue** - Queues and retries failed requests after token refresh
- 🔁 **Smart Retry Logic** - Exponential backoff with jitter for failed requests

### Security & Reliability
- 🛡️ **Token Rotation** - Support for rotating refresh tokens
- 🔒 **CSRF Protection** - Built-in CSRF token support
- 🌐 **Network Detection** - Handles offline/online status with automatic retry
- ⚠️ **Error Handling** - Comprehensive error types and callbacks
- 📊 **TypeScript Support** - Fully typed for better developer experience

### Customization
- ⚙️ **Flexible Configuration** - Works with any backend API format
- 🎨 **Custom Field Names** - Support for snake_case, camelCase, or custom naming
- ⏱️ **expires_in Support** - Use server-provided expiry times (opaque tokens friendly)
- 🔧 **Custom Refresh Logic** - Full control over token refresh flow
- 🎯 **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS

---

## 📦 Installation

### Using npm
```bash
npm install @trungpham.liam/auxios axios
```

### Using pnpm (recommended)
```bash
pnpm add @trungpham.liam/auxios axios
```

### Using yarn
```bash
yarn add @trungpham.liam/auxios axios
```

### Using bun
```bash
bun add @trungpham.liam/auxios axios
```

**Note:** `axios` is an optional peer dependency - only required if you plan to use the Axios interceptor feature.

---

## 🚀 Quick Start

### Minimal Setup (3 lines!)

```typescript
import { Auxios } from '@trungpham.liam/auxios';

// 1. Initialize
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' }
});

// 2. After login, store tokens
await auth.setTokens({ accessToken, refreshToken });

// 3. Use with Axios or Fetch
auth.setupAxiosInterceptor(axiosInstance);
// or
await auth.fetch('/api/user');
```

That's it! Auxios will now automatically:
- Refresh tokens on 401/403 responses
- Queue and retry failed requests
- Sync tokens across browser tabs
- Refresh proactively before expiry

### Full Example

```typescript
import { Auxios } from '@trungpham.liam/auxios';

const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  storage: 'localStorage', // 'sessionStorage', 'memory', or 'cookie'
  multiTabSync: true,
  autoRefresh: true,
  
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    exponentialBackoff: true,
  },
  
  tokenExpiry: {
    proactiveRefreshOffset: 300, // Refresh 5 min before expiry
  },
  
  events: {
    onTokenRefreshed: (tokens) => {
      console.log('✅ Token refreshed');
    },
    onTokenExpired: () => {
      window.location.href = '/login';
    },
    onAuthError: (error) => {
      console.error('Auth error:', error);
    },
  },
});

// After successful login
async function handleLogin(credentials) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  const data = await response.json();
  
  await auth.setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
}

// Check authentication
if (auth.isAuthenticated()) {
  console.log('User is logged in');
}

// Logout
await auth.logout();
```

---

## 📚 Common Use Cases

### 1. REST API with JWT Tokens

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
});

auth.setupAxiosInterceptor(axios);
// That's it! All requests now auto-refresh on 401
```

### 2. snake_case Backend API

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  },
});
```

### 3. API Returns expires_in (Non-JWT/Opaque Tokens)

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    expiresIn: 'expires_in',           // NEW in v1.2.0
    refreshExpiresIn: 'refresh_expires_in',
  },
});

// API response:
// {
//   "access_token": "opaque-token-xyz",
//   "refresh_token": "refresh-xyz",
//   "expires_in": 3600
// }
```

**Benefits:**
- ✅ Works with opaque (non-JWT) tokens
- ✅ Server controls token lifetime dynamically
- ✅ More accurate proactive refresh
- ✅ Fallback to JWT decode if `expires_in` not provided

### 4. OAuth2 Standard Format

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/oauth/token' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  },
  buildRefreshRequest: (refreshToken) => ({
    body: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'your-client-id',
      client_secret: 'your-client-secret',
    },
  }),
});
```

### 5. Secure Setup with httpOnly Cookies

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'cookie', // Most secure - protected from XSS
  csrfToken: await getCsrfToken(),
});
```

### 6. GraphQL Backend

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/graphql' },
  refreshTokenFn: async (refreshToken) => {
    const query = `
      mutation RefreshToken($token: String!) {
        refreshToken(refreshToken: $token) {
          accessToken
          refreshToken
          expiresIn
        }
      }
    `;
    
    const response = await fetch('/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables: { token: refreshToken } }),
    });
    
    const result = await response.json();
    return result.data.refreshToken;
  },
});
```

---

## 🔌 Integration Examples

### Axios Integration

```typescript
import axios from 'axios';
import { Auxios } from '@trungpham.liam/auxios';

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
});

const api = axios.create({
  baseURL: 'https://api.example.com',
});

// Setup interceptor - one line!
auth.setupAxiosInterceptor(api);

// All requests now automatically:
// ✅ Include Authorization header
// ✅ Handle 401/403 with token refresh
// ✅ Queue and retry during refresh
// ✅ Handle network errors with retry

const response = await api.get('/user/profile');
```

### Fetch API Integration

```typescript
import { Auxios } from '@trungpham.liam/auxios';

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
import { useAuth, useTokenRefresh } from '@trungpham.liam/auxios';

function App() {
  const { isAuthenticated, login, logout, isRefreshing } = useAuth(auth);
  
  // Optional: Auto-refresh tokens every minute
  useTokenRefresh(auth, 60000);

  if (isRefreshing) {
    return <div>Refreshing...</div>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <>
          <h1>Welcome!</h1>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={() => login({ accessToken, refreshToken })}>
          Login
        </button>
      )}
    </div>
  );
}
```

### Vue Integration

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';
import { auth } from './auth';

const isAuthenticated = ref(false);

onMounted(async () => {
  isAuthenticated.value = auth.isAuthenticated();
});

auth.updateConfig({
  events: {
    onTokenRefreshed: () => {
      isAuthenticated.value = true;
    },
    onTokenExpired: () => {
      isAuthenticated.value = false;
    },
  },
});

const logout = async () => {
  await auth.logout();
  isAuthenticated.value = false;
};
</script>

<template>
  <div>
    <button v-if="!isAuthenticated" @click="login">Login</button>
    <button v-else @click="logout">Logout</button>
  </div>
</template>
```

---

## ⚙️ Configuration

### Complete Configuration Reference

```typescript
interface AuxiosConfig {
  // Required
  endpoints: {
    refresh: string;        // Token refresh endpoint
    logout?: string;        // Optional logout endpoint
  };
  
  // Storage
  storage?: 'localStorage' | 'sessionStorage' | 'memory' | 'cookie';
  storageKeys?: {
    accessToken?: string;   // Custom storage key (default: 'auxios_access_token')
    refreshToken?: string;  // Custom storage key (default: 'auxios_refresh_token')
  };
  
  // Token Field Names (for API responses)
  tokenFieldNames?: {
    accessToken?: string;        // Default: 'accessToken'
    refreshToken?: string;       // Default: 'refreshToken'
    expiresIn?: string;          // Default: 'expires_in' (NEW in v1.2.0)
    refreshExpiresIn?: string;   // Default: 'refresh_expires_in' (NEW in v1.2.0)
  };
  
  // Retry Configuration
  retry?: {
    maxAttempts?: number;         // Default: 3
    initialDelay?: number;        // Default: 1000ms
    maxDelay?: number;            // Default: 10000ms
    exponentialBackoff?: boolean; // Default: true
  };
  
  // Token Expiry
  tokenExpiry?: {
    proactiveRefreshOffset?: number;  // Default: 300s (5 minutes before expiry)
  };
  
  // Features
  multiTabSync?: boolean;  // Default: true
  autoRefresh?: boolean;   // Default: true
  
  // Security
  csrfToken?: string;
  headers?: Record<string, string>;
  
  // Custom Refresh Logic
  buildRefreshRequest?: (refreshToken: string) => {
    body?: any;
    headers?: Record<string, string>;
    method?: string;
  };
  
  refreshTokenFn?: (refreshToken: string) => Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
    refreshExpiresIn?: number;
  }>;
  
  // Event Callbacks
  events?: {
    onTokenRefreshed?: (tokens: TokenPair) => void;
    onTokenExpired?: () => void;
    onAuthError?: (error: AuthError) => void;
    onLogout?: () => void;
    onRefreshStart?: () => void;
    onRefreshEnd?: () => void;
  };
}
```

### Configuration Priority

For token expiry calculation:
1. **`expiresIn` from API response** (highest priority) ← NEW in v1.2.0
2. **JWT decode** (`exp` field in token)
3. **Manual refresh only** (no automatic refresh)

For response field names:
- Auxios automatically searches in: `data`, `result`, `payload`, `tokens`
- Nested structures are fully supported

---

## 🎯 Advanced Features

### Race Condition Prevention

When multiple requests fail simultaneously, Auxios ensures only ONE refresh request:

```typescript
// All these requests will share the same refresh promise
const [user, posts, stats] = await Promise.all([
  api.get('/user'),
  api.get('/posts'),
  api.get('/stats'),
]);
// ✅ Only 1 refresh request is made
// ✅ All requests are queued and retried after refresh
```

### Multi-Tab Synchronization

Tokens are automatically synchronized across all browser tabs:

```typescript
// Tab 1: User logs in
await auth.setTokens({ accessToken, refreshToken });

// Tab 2 & 3: Tokens automatically updated ✅

// Tab 1: User logs out
await auth.logout();

// Tab 2 & 3: Automatically logged out ✅
```

**How it works:**
- Uses `BroadcastChannel` API (modern browsers)
- Falls back to `storage` events (older browsers)
- Real-time synchronization with zero config

### Proactive Token Refresh

Auxios automatically refreshes tokens BEFORE they expire:

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenExpiry: {
    proactiveRefreshOffset: 300, // Refresh 5 minutes before expiry
  },
  autoRefresh: true,
});

// Token expires at 12:00:00
// Auxios will refresh at 11:55:00 automatically ✅
// User never experiences 401 errors!
```

### Network Error Handling

```typescript
// Auxios automatically:
// ✅ Detects offline status
// ✅ Waits for connection to return
// ✅ Retries failed requests when back online
// ✅ Uses exponential backoff for server errors

const response = await auth.fetch('/api/data');
// If offline, waits up to 30s for connection
// Then retries automatically
```

### Error Types

```typescript
import { AuthErrorCode } from '@trungpham.liam/auxios';

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

auth.updateConfig({
  events: {
    onAuthError: (error) => {
      switch (error.code) {
        case AuthErrorCode.TOKEN_EXPIRED:
          // Handle expired token
          break;
        case AuthErrorCode.REFRESH_FAILED:
          // Redirect to login
          window.location.href = '/login';
          break;
      }
    },
  },
});
```

---

## 🔒 Security Best Practices

### 1. Use httpOnly Cookies for Refresh Tokens

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'cookie', // ✅ Protected from XSS
});

// Backend must set httpOnly cookies:
// Set-Cookie: auxios_access_token=...; HttpOnly; Secure; SameSite=Strict
```

### 2. Enable CSRF Protection

```typescript
const csrfToken = await fetch('/api/csrf-token').then(r => r.json());

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  csrfToken: csrfToken.token,
  headers: {
    'X-CSRF-Token': csrfToken.token,
  },
});
```

### 3. Token Rotation

Auxios supports token rotation where refresh token changes after each use:

```typescript
// Server response:
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token" // ← Old token is invalidated
}

// Auxios automatically stores new tokens ✅
```

### 4. Secure Storage

```typescript
// ❌ Not recommended for sensitive apps
storage: 'localStorage'

// ✅ Better (sessionStorage cleared on tab close)
storage: 'sessionStorage'

// ✅ Best (httpOnly cookies protected from XSS)
storage: 'cookie'
```

---

## 📖 API Reference

### `Auxios` Class

#### Constructor
```typescript
new Auxios(config: AuxiosConfig)
```

#### Methods

##### `setTokens(tokens: TokenPair): Promise<void>`
Store authentication tokens.

```typescript
await auth.setTokens({
  accessToken: 'your-access-token',
  refreshToken: 'your-refresh-token',
  expiresIn: 3600, // Optional
  refreshExpiresIn: 2592000, // Optional
});
```

##### `getAccessToken(): string | null`
Retrieve current access token.

##### `getRefreshToken(): string | null`
Retrieve current refresh token.

##### `isAuthenticated(): boolean`
Check if user is authenticated (has valid non-expired token).

##### `refreshTokens(): Promise<TokenPair>`
Manually trigger token refresh.

```typescript
const newTokens = await auth.refreshTokens();
```

##### `setupAxiosInterceptor(axios: AxiosInstance): void`
Setup Axios interceptor for automatic token management.

```typescript
import axios from 'axios';

const api = axios.create({ baseURL: 'https://api.example.com' });
auth.setupAxiosInterceptor(api);
```

##### `ejectAxiosInterceptor(): void`
Remove Axios interceptor.

##### `fetch(url: string, options?: RequestInit): Promise<Response>`
Fetch wrapper with automatic token management.

```typescript
const response = await auth.fetch('/api/user');
const data = await response.json();
```

##### `logout(callServer?: boolean): Promise<void>`
Logout user and clear tokens.

```typescript
await auth.logout(); // Calls server logout endpoint
await auth.logout(false); // Skip server call
```

##### `updateConfig(config: Partial<AuxiosConfig>): void`
Update configuration at runtime.

```typescript
auth.updateConfig({
  events: {
    onTokenExpired: () => {
      router.push('/login');
    },
  },
});
```

##### `destroy(): void`
Cleanup resources (removes event listeners, timers, etc.).

```typescript
auth.destroy();
```

---

## 🎨 Customization

Auxios is highly customizable to work with any backend API. See [CUSTOMIZATION.md](./CUSTOMIZATION.md) for detailed examples:

- Custom storage keys
- Custom token field names (snake_case, camelCase, etc.)
- Custom expiry fields (`expires_in`, `ttl`, etc.)
- Custom refresh request body/headers
- Custom refresh logic (GraphQL, OAuth2, etc.)
- Real-world examples (Laravel, AWS Cognito, Firebase, etc.)
- Migration guides

**Quick examples:**

```typescript
// Laravel Sanctum
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'token',
    refreshToken: 'refresh_token',
  },
});

// AWS Cognito
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/token' },
  refreshTokenFn: async (refreshToken) => {
    // Custom Cognito logic
  },
});
```

---

## 🐛 Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions to common issues:

- Token not refreshing automatically
- 401 errors still occurring
- Multi-tab sync not working
- `expires_in` not being used
- Custom field names not working
- TypeScript type errors
- CORS issues
- Refresh loops

---

## 📝 Examples

Check the [`/examples`](./examples) directory for complete working examples:

- **`basic-usage.ts`** - Basic setup and usage
- **`axios-integration.ts`** - Axios interceptor examples
- **`fetch-integration.ts`** - Fetch API examples
- **`react-example.tsx`** - React hooks integration
- **`expires-in-usage.ts`** - Using `expires_in` from API (NEW in v1.2.0)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development

```bash
# Install dependencies
pnpm install

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Build
pnpm build
```

---

## 📄 License

MIT © [trungpham-liam](https://github.com/trungpham-liam)

---

## 🔗 Links

- **NPM Package:** https://www.npmjs.com/package/@trungpham.liam/auxios
- **GitHub Repository:** https://github.com/trungpham-liam/auxios
- **Issues:** https://github.com/trungpham-liam/auxios/issues
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

---

## ⭐ Star History

If you find Auxios useful, please consider giving it a star on GitHub!

---

**Made with ❤️ by [trungpham-liam](https://github.com/trungpham-liam)**
