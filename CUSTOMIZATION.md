# Auxios Customization Guide

This guide explains how to customize Auxios to work with different backend APIs and storage requirements.

## Table of Contents
- [Quick Reference](#quick-reference)
- [Custom Storage Keys](#custom-storage-keys)
- [Custom Token Field Names](#custom-token-field-names)
- [Custom Expiry Fields](#custom-expiry-fields)
- [Custom Refresh Request](#custom-refresh-request)
- [Custom Refresh Function](#custom-refresh-function)
- [Real-World Examples](#real-world-examples)
- [Migration Guides](#migration-guides)

## Quick Reference

Common customization scenarios:

| Scenario | Config Option | Example |
|----------|---------------|---------|
| Multiple apps on same domain | `storageKeys` | `{ accessToken: 'myapp_token' }` |
| snake_case backend | `tokenFieldNames` | `{ accessToken: 'access_token' }` |
| API returns `expires_in` | `tokenFieldNames.expiresIn` | `{ expiresIn: 'expires_in' }` |
| Opaque tokens (non-JWT) | `tokenFieldNames.expiresIn` | Required for auto-refresh |
| OAuth2 standard format | `buildRefreshRequest` | `{ body: { grant_type: 'refresh_token' } }` |
| GraphQL backend | `refreshTokenFn` | Custom mutation function |
| Nested response structure | Auto-detected | Searches `data`, `result`, `payload` |
| Token in header instead of body | `buildRefreshRequest` | `{ headers: { 'X-Refresh-Token': token } }` |
| httpOnly cookies | `storage: 'cookie'` | Most secure option |

See detailed sections below for implementation examples.

## Custom Storage Keys

By default, Auxios stores tokens in storage with these keys:
- `auxios_access_token`
- `auxios_refresh_token`

You can customize these to avoid conflicts or match your naming convention:

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storageKeys: {
    accessToken: 'my_app_access_token',
    refreshToken: 'my_app_refresh_token',
  },
});
```

### Use Cases
- Multiple apps on the same domain
- Avoiding conflicts with existing localStorage keys
- Company naming conventions
- Debugging and development

## Custom Token Field Names

If your backend API returns tokens with different field names:

```typescript
// Backend returns: { access_token: "...", refresh_token: "..." }
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  },
});
```

### Supported Patterns
- snake_case: `access_token`, `refresh_token`
- camelCase: `accessToken`, `refreshToken` (default)
- Custom: `jwt`, `bearer`, `token`, etc.

## Custom Expiry Fields

If your API returns token expiry times as `expires_in` (in seconds) instead of encoding them in JWT, you can configure Auxios to use these fields:

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    expiresIn: 'expires_in',           // seconds until access token expires
    refreshExpiresIn: 'refresh_expires_in', // seconds until refresh token expires
  },
});
```

### Configuration Priority

Auxios uses this priority when calculating token expiry:

1. **`expiresIn` from API response** (highest priority) - If your API returns `expires_in`, Auxios will use it
2. **JWT decode** (fallback) - If no `expiresIn` is provided, Auxios will decode the JWT to get `exp` field
3. **Manual refresh only** - If neither is available, automatic refresh won't work (you'll need to manually call `refreshTokens()`)

### Example API Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "abc123xyz",
  "expires_in": 3600,           // 1 hour (in seconds)
  "refresh_expires_in": 2592000 // 30 days (in seconds)
}
```

### Custom Field Names

Your API might use different names:

```typescript
// Example: API uses 'ttl' and 'refresh_ttl'
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'jwt',
    refreshToken: 'refresh',
    expiresIn: 'ttl',
    refreshExpiresIn: 'refresh_ttl',
  },
});
```

### Nested Response Support

Auxios automatically searches for expiry fields in nested structures:

```typescript
// Works with nested responses
{
  "data": {
    "access_token": "...",
    "expires_in": 3600
  }
}

// Also works
{
  "result": {
    "tokens": {
      "access_token": "...",
      "expires_in": 3600
    }
  }
}
```

### Benefits of Using expiresIn

1. **No JWT dependency** - Works with opaque tokens (non-JWT)
2. **More accurate** - Server provides exact expiry time
3. **Flexible** - Server can dynamically adjust token lifetimes
4. **Better proactive refresh** - More precise scheduling based on server's expiry

### Use Cases

**When to use `expiresIn`:**
- API returns opaque tokens (not JWT)
- API uses dynamic token expiry times
- You want server-side control over token lifetimes
- Your tokens don't have `exp` field in JWT

**When JWT decode is sufficient:**
- API returns standard JWT with `exp` field
- Token expiry is encoded in the token itself
- You don't need server to control expiry dynamically

## Custom Refresh Request

Customize the request body, headers, and method when refreshing tokens:

### Basic Custom Body

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  buildRefreshRequest: (refreshToken) => ({
    body: {
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    },
  }),
});
```

### OAuth2 Standard Format

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/oauth/token' },
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

### Custom Headers

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  buildRefreshRequest: (refreshToken) => ({
    body: { refreshToken },
    headers: {
      'X-Client-Version': '1.0.0',
      'X-Device-Id': getDeviceId(),
      'X-Platform': 'web',
    },
  }),
});
```

### Token in Header (Instead of Body)

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  buildRefreshRequest: (refreshToken) => ({
    body: {},
    headers: {
      'X-Refresh-Token': refreshToken,
    },
  }),
});
```

### Custom HTTP Method

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  buildRefreshRequest: (refreshToken) => ({
    body: { refreshToken },
    method: 'PUT', // or 'PATCH', etc.
  }),
});
```

## Custom Refresh Function

For complete control over the refresh logic:

### Custom Axios Instance

```typescript
import axios from 'axios';

const customAxios = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    const response = await customAxios.post('/auth/refresh', {
      token: refreshToken,
      device_id: getDeviceId(),
    });

    return {
      accessToken: response.data.jwt,
      refreshToken: response.data.refresh,
    };
  },
});
```

### GraphQL Backend

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/graphql' },
  refreshTokenFn: async (refreshToken) => {
    const query = `
      mutation RefreshToken($token: String!) {
        refreshToken(refreshToken: $token) {
          accessToken
          refreshToken
        }
      }
    `;

    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { token: refreshToken },
      }),
    });

    const result = await response.json();
    return result.data.refreshToken;
  },
});
```

### With Encryption/Decryption

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    // Decrypt stored token
    const decryptedToken = decrypt(refreshToken);

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: decryptedToken }),
    });

    const data = await response.json();

    return {
      accessToken: data.accessToken,
      refreshToken: encrypt(data.refreshToken), // Encrypt before storing
    };
  },
});
```

## Real-World Examples

### Example 1: Laravel Sanctum

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'token',
    refreshToken: 'refresh_token',
  },
  buildRefreshRequest: (refreshToken) => ({
    body: {
      refresh_token: refreshToken,
    },
    headers: {
      'Accept': 'application/json',
    },
  }),
});
```

### Example 2: AWS Cognito

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/token' },
  refreshTokenFn: async (refreshToken) => {
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-amzn-json-1.1' },
      body: JSON.stringify({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      }),
    });

    const data = await response.json();

    return {
      accessToken: data.AuthenticationResult.IdToken,
      refreshToken: data.AuthenticationResult.RefreshToken,
    };
  },
});
```

### Example 3: Firebase

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
      }
    );

    const data = await response.json();

    return {
      accessToken: data.id_token,
      refreshToken: data.refresh_token,
    };
  },
});
```

### Example 4: Custom Backend with Multiple Tokens

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY || '',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        scope: ['read', 'write'],
        tenant_id: getTenantId(),
      }),
    });

    const data = await response.json();

    // Store additional tokens in custom storage
    localStorage.setItem('api_token', data.api_token);

    return {
      accessToken: data.jwt_token,
      refreshToken: data.new_refresh_token,
    };
  },
});
```

## Configuration Priority

When multiple configurations are provided, Auxios uses this priority:

1. **`refreshTokenFn`** (highest priority) - Completely overrides refresh logic
2. **`buildRefreshRequest`** - Customizes request but uses default fetch
3. **`tokenFieldNames`** - Only customizes response parsing
4. **Default behavior** - Uses standard format

## Tips and Best Practices

### 1. Environment Variables

```typescript
const auth = new Auxios({
  endpoints: {
    refresh: process.env.REACT_APP_REFRESH_ENDPOINT || '/api/auth/refresh',
  },
  buildRefreshRequest: (refreshToken) => ({
    body: {
      refreshToken,
      client_id: process.env.REACT_APP_CLIENT_ID,
    },
  }),
});
```

### 2. Error Handling

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    try {
      const response = await customRefreshLogic(refreshToken);
      return response;
    } catch (error) {
      // Log error
      console.error('Refresh failed:', error);
      
      // Rethrow to trigger logout
      throw error;
    }
  },
  events: {
    onAuthError: (error) => {
      // Handle auth errors
      if (error.code === 'REFRESH_FAILED') {
        // Redirect to login
        window.location.href = '/login';
      }
    },
  },
});
```

### 3. Type Safety

```typescript
import type { RefreshResponse } from 'auxios';

interface MyCustomResponse {
  jwt_token: string;
  new_refresh_token: string;
  expires_in: number;
}

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken): Promise<RefreshResponse> => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data: MyCustomResponse = await response.json();

    // Map to RefreshResponse
    return {
      accessToken: data.jwt_token,
      refreshToken: data.new_refresh_token,
    };
  },
});
```

## Debugging

Enable logging to debug custom configurations:

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  buildRefreshRequest: (refreshToken) => {
    const config = {
      body: { refreshToken },
      headers: { 'X-Debug': 'true' },
    };
    
    console.log('[Auxios] Refresh request config:', config);
    return config;
  },
  events: {
    onTokenRefreshed: (tokens) => {
      console.log('[Auxios] Tokens refreshed successfully');
    },
    onAuthError: (error) => {
      console.error('[Auxios] Auth error:', error);
    },
  },
});
```

## Migration Guide

### From Default to Custom Config

**Before:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
});
```

**After:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  },
  buildRefreshRequest: (refreshToken) => ({
    body: { refresh_token: refreshToken },
  }),
});
```

All existing functionality continues to work - customization is fully backward compatible!

## Migration Guides

### Migrating from JWT-only to expires_in

If you're adding `expires_in` support to your API:

**Before (JWT only):**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  // Auxios decodes JWT to get expiry
});

// API returns:
{
  "accessToken": "eyJ...", // JWT with exp field
  "refreshToken": "abc123"
}
```

**After (with expires_in):**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    expiresIn: 'expires_in',
    refreshExpiresIn: 'refresh_expires_in',
  },
  // Auxios will prioritize expires_in over JWT decode
});

// API now returns:
{
  "accessToken": "eyJ...", // Can still be JWT
  "refreshToken": "abc123",
  "expires_in": 3600,
  "refresh_expires_in": 2592000
}
```

**Benefits:**
- ✅ Works with both JWT and opaque tokens
- ✅ Server controls expiry time dynamically
- ✅ More accurate refresh scheduling
- ✅ Backward compatible (JWT decode still works as fallback)

### Migrating from localStorage to httpOnly Cookies

For better XSS protection:

**Before:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'localStorage', // ⚠️ Vulnerable to XSS
});
```

**After:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'cookie', // ✅ More secure
});

// Backend must set httpOnly cookies:
// Set-Cookie: auxios_access_token=...; HttpOnly; Secure; SameSite=Strict
// Set-Cookie: auxios_refresh_token=...; HttpOnly; Secure; SameSite=Strict
```

**Required backend changes:**
```javascript
// Express.js example
app.post('/auth/login', (req, res) => {
  const { accessToken, refreshToken } = generateTokens(user);
  
  res.cookie('auxios_access_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  });
  
  res.cookie('auxios_refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 2592000000, // 30 days
  });
  
  res.json({ success: true });
});
```

### Adding CSRF Protection

**Step 1: Generate CSRF token on backend**
```javascript
// Express.js with csurf
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Step 2: Configure Auxios with CSRF token**
```typescript
// Get CSRF token
const csrfResponse = await fetch('/api/csrf-token');
const { csrfToken } = await csrfResponse.json();

// Configure Auxios
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  csrfToken,
  headers: {
    'X-CSRF-Token': csrfToken,
  },
});
```

### Migrating to Custom Refresh Logic

If you need more control:

**Before (default):**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
});
```

**After (custom logic):**
```typescript
import axios from 'axios';

const customApi = axios.create({
  baseURL: 'https://api.example.com',
});

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    // Custom refresh logic
    const response = await customApi.post('/auth/refresh', {
      token: refreshToken,
      device_id: getDeviceId(),
      app_version: '1.0.0',
    });
    
    // Custom response parsing
    return {
      accessToken: response.data.jwt,
      refreshToken: response.data.new_refresh,
      expiresIn: response.data.ttl,
    };
  },
});
```

### Converting from Another Auth Library

#### From `axios-auth-refresh`:

**Before:**
```typescript
import axios from 'axios';
import createAuthRefreshInterceptor from 'axios-auth-refresh';

const refreshAuthLogic = async (failedRequest) => {
  const response = await axios.post('/auth/refresh');
  localStorage.setItem('token', response.data.token);
  failedRequest.response.config.headers['Authorization'] = 'Bearer ' + response.data.token;
};

createAuthRefreshInterceptor(axios, refreshAuthLogic);
```

**After (Auxios):**
```typescript
import axios from 'axios';
import { Auxios } from '@trungpham.liam/auxios';

const auth = new Auxios({
  endpoints: { refresh: '/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'token',
  },
});

auth.setupAxiosInterceptor(axios);
```

**Benefits:**
- ✅ Automatic multi-tab sync
- ✅ Race condition prevention
- ✅ Better error handling
- ✅ Proactive token refresh
- ✅ TypeScript support

## Troubleshooting

For common issues and solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
