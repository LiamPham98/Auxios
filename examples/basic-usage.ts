import { Auxios } from '../src';

// Basic setup with default configuration
const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  storage: 'localStorage', // or 'sessionStorage', 'memory', 'cookie'
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
  },
  tokenExpiry: {
    proactiveRefreshOffset: 300, // Refresh 5 minutes before expiry
  },
  multiTabSync: true, // Enable cross-tab synchronization
  autoRefresh: true, // Auto refresh when token expires
  events: {
    onTokenRefreshed: (tokens) => {
      console.log('Token refreshed successfully', tokens);
    },
    onTokenExpired: () => {
      console.log('Token expired, redirecting to login...');
      window.location.href = '/login';
    },
    onAuthError: (error) => {
      console.error('Authentication error:', error);
    },
    onLogout: () => {
      console.log('User logged out');
      window.location.href = '/login';
    },
  },
  headers: {
    'X-Custom-Header': 'value',
  },
});

// After successful login, set tokens
async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  // Store tokens
  await auth.setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  console.log('Logged in successfully!');
}

// Check authentication status
function checkAuth() {
  if (auth.isAuthenticated()) {
    console.log('User is authenticated');
    console.log('Access token:', auth.getAccessToken());
  } else {
    console.log('User is not authenticated');
  }
}

// Manual token refresh
async function manualRefresh() {
  try {
    const tokens = await auth.refreshTokens();
    console.log('Tokens refreshed:', tokens);
  } catch (error) {
    console.error('Failed to refresh tokens:', error);
  }
}

// Logout
async function logout() {
  // This will:
  // 1. Clear all tokens from storage
  // 2. Cancel pending requests
  // 3. Call server logout endpoint (if configured)
  // 4. Broadcast logout to other tabs
  await auth.logout();
  console.log('Logged out successfully');
}

// Cleanup when done
function cleanup() {
  auth.destroy();
}

// Export for use in other files
export { auth, login, checkAuth, manualRefresh, logout, cleanup };
