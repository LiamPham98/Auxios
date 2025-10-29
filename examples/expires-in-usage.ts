import { Auxios } from '../src';

/**
 * Example: Using expires_in from API Response
 * 
 * This example shows how to configure Auxios when your API returns
 * token expiry times as `expires_in` (seconds) instead of encoding
 * them in JWT tokens.
 * 
 * Use this when:
 * - Your API uses opaque tokens (non-JWT)
 * - Your API provides explicit expiry times
 * - You want server-side control over token lifetimes
 */

// Example API Response Format:
/*
{
  "access_token": "eyJhbGc...",
  "refresh_token": "abc123xyz",
  "expires_in": 3600,           // 1 hour (in seconds)
  "refresh_expires_in": 2592000 // 30 days (in seconds)
}
*/

const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  
  // Configure field names to match your API
  tokenFieldNames: {
    accessToken: 'access_token',        // API uses snake_case
    refreshToken: 'refresh_token',      // API uses snake_case
    expiresIn: 'expires_in',            // NEW: Tell Auxios about expires_in
    refreshExpiresIn: 'refresh_expires_in', // NEW: Refresh token expiry
  },
  
  // Auxios will prioritize expires_in over JWT decode
  // Priority: expires_in > JWT decode > manual refresh only
  
  tokenExpiry: {
    proactiveRefreshOffset: 300, // Refresh 5 minutes before expiry
  },
  
  autoRefresh: true,
  multiTabSync: true,
  
  events: {
    onTokenRefreshed: (tokens) => {
      console.log('✅ Token refreshed successfully');
      if (tokens.expiresIn) {
        console.log(`   New token expires in ${tokens.expiresIn}s`);
      }
    },
    onTokenExpired: () => {
      console.log('⚠️ Token expired, redirecting to login...');
      window.location.href = '/login';
    },
  },
});

// Example: Login function
async function login(email: string, password: string) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    // API returns:
    // {
    //   access_token: "...",
    //   refresh_token: "...",
    //   expires_in: 3600,
    //   refresh_expires_in: 2592000
    // }

    await auth.setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,             // Optional but recommended
      refreshExpiresIn: data.refresh_expires_in, // Optional
    });

    console.log('✅ Logged in successfully!');
    console.log(`   Access token expires in: ${data.expires_in}s`);
    console.log(`   Refresh token expires in: ${data.refresh_expires_in}s`);
  } catch (error) {
    console.error('❌ Login failed:', error);
  }
}

// Example: Using with Axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
});

// Setup Axios interceptor
auth.setupAxiosInterceptor(api);

async function getUserProfile() {
  try {
    const response = await api.get('/user/profile');
    console.log('User profile:', response.data);
  } catch (error) {
    console.error('Failed to get profile:', error);
  }
}

// Example: Using with Fetch
async function getUserPosts() {
  try {
    const response = await auth.fetch('https://api.example.com/user/posts');
    const posts = await response.json();
    console.log('User posts:', posts);
  } catch (error) {
    console.error('Failed to get posts:', error);
  }
}

// Example: Manual refresh with expires_in
async function manualRefresh() {
  try {
    const tokens = await auth.refreshTokens();
    
    console.log('✅ Manual refresh successful');
    console.log('   Access token:', tokens.accessToken);
    console.log('   Refresh token:', tokens.refreshToken);
    
    if (tokens.expiresIn) {
      console.log(`   Token valid for: ${tokens.expiresIn}s`);
      
      // Calculate exact expiry time
      const expiryTime = new Date(Date.now() + tokens.expiresIn * 1000);
      console.log(`   Token expires at: ${expiryTime.toLocaleString()}`);
    }
  } catch (error) {
    console.error('❌ Refresh failed:', error);
  }
}

// Example: Check expiry time
function checkTokenExpiry() {
  if (!auth.isAuthenticated()) {
    console.log('⚠️ Not authenticated');
    return;
  }

  // Note: This method uses the expires_in value if provided,
  // otherwise falls back to JWT decode
  const timeUntilExpiry = auth.getAccessToken(); // Returns seconds
  
  if (timeUntilExpiry) {
    console.log(`Token expires in: ${timeUntilExpiry}s`);
    
    const minutes = Math.floor(timeUntilExpiry / 60);
    console.log(`That's approximately ${minutes} minute(s)`);
  }
}

// Example: Advanced - Nested response structure
const authNested = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    // Auxios automatically searches nested structures:
    // - data.access_token
    // - result.access_token
    // - payload.access_token
    // - tokens.access_token
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    expiresIn: 'expires_in',
    refreshExpiresIn: 'refresh_expires_in',
  },
});

// This works with all these response formats:
/*
// Format 1: Flat
{
  "access_token": "...",
  "expires_in": 3600
}

// Format 2: Nested in "data"
{
  "data": {
    "access_token": "...",
    "expires_in": 3600
  }
}

// Format 3: Nested in "result"
{
  "result": {
    "tokens": {
      "access_token": "...",
      "expires_in": 3600
    }
  }
}
*/

// Example: OAuth2 standard format
const authOAuth2 = new Auxios({
  endpoints: { refresh: '/oauth/token' },
  
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    expiresIn: 'expires_in',
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

// OAuth2 response format:
/*
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "scope": "read write"
}
*/

// Example: Custom TTL field names
const authCustomTTL = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'jwt',
    refreshToken: 'refresh',
    expiresIn: 'ttl',              // API uses "ttl" instead
    refreshExpiresIn: 'refresh_ttl', // API uses "refresh_ttl"
  },
});

// API returns:
/*
{
  "jwt": "...",
  "refresh": "...",
  "ttl": 3600,
  "refresh_ttl": 2592000
}
*/

// Export for use in other files
export {
  auth,
  authNested,
  authOAuth2,
  authCustomTTL,
  login,
  getUserProfile,
  getUserPosts,
  manualRefresh,
  checkTokenExpiry,
};
