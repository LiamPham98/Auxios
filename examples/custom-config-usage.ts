import axios from 'axios';
import { Auxios } from '../src';

// ============================================
// Example 1: Custom Storage Keys
// ============================================
// Use case: Avoid conflicts with other libraries or custom naming convention

const auth1 = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'localStorage',
  storageKeys: {
    accessToken: 'my_app_access_token', // Instead of 'auxios_access_token'
    refreshToken: 'my_app_refresh_token', // Instead of 'auxios_refresh_token'
  },
});

// Now tokens are stored with custom keys in localStorage:
// localStorage.getItem('my_app_access_token')
// localStorage.getItem('my_app_refresh_token')

// ============================================
// Example 2: Backend Using snake_case
// ============================================
// Use case: Backend API returns access_token and refresh_token instead of accessToken/refreshToken

const auth2 = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  },
});

// API Response:
// {
//   "access_token": "eyJhbGc...",
//   "refresh_token": "refresh..."
// }
// Auxios will correctly map these fields

// ============================================
// Example 3: Custom Refresh Request Body
// ============================================
// Use case: OAuth2 standard format or custom backend requirements

const auth3 = new Auxios({
  endpoints: { refresh: '/api/oauth/token' },
  buildRefreshRequest: (refreshToken) => ({
    body: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'my-app-id',
      client_secret: 'my-secret',
    },
    headers: {
      'X-Client-Version': '1.0.0',
      'X-Device-Id': 'device-123',
    },
    method: 'POST',
  }),
});

// ============================================
// Example 4: Custom Refresh Token in Header
// ============================================
// Use case: Backend expects refresh token in header instead of body

const auth4 = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  buildRefreshRequest: (refreshToken) => ({
    body: {}, // Empty body
    headers: {
      'X-Refresh-Token': refreshToken, // Token in header
    },
  }),
});

// ============================================
// Example 5: Completely Custom Refresh Logic
// ============================================
// Use case: Complex refresh logic, custom axios instance, or non-standard flow

const customAxios = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

const auth5 = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' }, // Still required but not used
  refreshTokenFn: async (refreshToken) => {
    // Your completely custom logic
    const response = await customAxios.post('/auth/refresh', {
      token: refreshToken,
      device_id: getDeviceId(),
      app_version: '1.0.0',
    });

    // Must return in this format
    return {
      accessToken: response.data.jwt_token,
      refreshToken: response.data.new_refresh_token,
    };
  },
});

// ============================================
// Example 6: Combined Configuration
// ============================================
// Use case: Backend with custom everything

const auth6 = new Auxios({
  endpoints: { refresh: '/api/v1/auth/token/refresh' },
  storage: 'localStorage',

  // Custom storage keys
  storageKeys: {
    accessToken: 'myapp_jwt',
    refreshToken: 'myapp_refresh',
  },

  // Custom API field names
  tokenFieldNames: {
    accessToken: 'jwt_token',
    refreshToken: 'new_refresh_token',
  },

  // Custom request format
  buildRefreshRequest: (refreshToken) => ({
    body: {
      refresh_token: refreshToken,
      client_id: process.env.CLIENT_ID,
    },
    headers: {
      'X-API-Key': process.env.API_KEY || '',
    },
  }),

  // Other configs
  events: {
    onTokenRefreshed: (tokens) => {
      console.log('New tokens received');
    },
  },
});

// ============================================
// Example 7: GraphQL Backend
// ============================================
// Use case: Backend uses GraphQL for token refresh

const auth7 = new Auxios({
  endpoints: { refresh: '/graphql' },
  refreshTokenFn: async (refreshToken) => {
    const query = `
      mutation RefreshToken($refreshToken: String!) {
        refreshToken(refreshToken: $refreshToken) {
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
        variables: { refreshToken },
      }),
    });

    const result = await response.json();

    return {
      accessToken: result.data.refreshToken.accessToken,
      refreshToken: result.data.refreshToken.refreshToken,
    };
  },
});

// ============================================
// Example 8: Multiple Apps on Same Domain
// ============================================
// Use case: Multiple apps need different token storage to avoid conflicts

const appAAuth = new Auxios({
  endpoints: { refresh: '/api/app-a/auth/refresh' },
  storageKeys: {
    accessToken: 'app_a_access',
    refreshToken: 'app_a_refresh',
  },
});

const appBAuth = new Auxios({
  endpoints: { refresh: '/api/app-b/auth/refresh' },
  storageKeys: {
    accessToken: 'app_b_access',
    refreshToken: 'app_b_refresh',
  },
});

// ============================================
// Helper Functions for Examples
// ============================================

function getDeviceId(): string {
  return localStorage.getItem('device_id') || 'unknown';
}

// ============================================
// Usage Examples
// ============================================

async function demonstrateCustomConfig() {
  const api = axios.create({ baseURL: 'https://api.example.com' });

  // Setup with custom config
  auth6.setupAxiosInterceptor(api);

  // Login and set tokens
  const loginResponse = await api.post('/auth/login', {
    email: 'user@example.com',
    password: 'password',
  });

  // Set tokens (uses custom storage keys)
  await auth6.setTokens({
    accessToken: loginResponse.data.jwt_token,
    refreshToken: loginResponse.data.new_refresh_token,
  });

  // Make requests - automatic token refresh with custom config
  const userResponse = await api.get('/user/profile');
  console.log('User data:', userResponse.data);
}

export {
  auth1,
  auth2,
  auth3,
  auth4,
  auth5,
  auth6,
  auth7,
  appAAuth,
  appBAuth,
  demonstrateCustomConfig,
};
