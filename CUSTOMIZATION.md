# Auxios Customization Guide

This guide explains how to customize Auxios to work with different backend APIs and storage requirements.

## Table of Contents
- [Custom Storage Keys](#custom-storage-keys)
- [Custom Token Field Names](#custom-token-field-names)
- [Custom Refresh Request](#custom-refresh-request)
- [Custom Refresh Function](#custom-refresh-function)
- [Real-World Examples](#real-world-examples)

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
