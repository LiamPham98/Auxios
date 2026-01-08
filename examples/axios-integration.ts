import axios from 'axios';
import { Auxios } from '../src';

// Create Auxios instance
const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  storage: 'localStorage',
  events: {
    onTokenExpired: () => {
      window.location.href = '/login';
    },
    onAuthError: (error) => {
      console.error('Auth error:', error);
    },
  },
  // Custom response interceptor example
  responseInterceptor: {
    // Transform successful responses
    onResponse: (response) => {
      console.log('Response received:', response.status, response.config?.url);
      // You can transform the response here
      // For example, extract nested data: return response.data?.result
      return response;
    },
    // Handle and transform errors
    onResponseError: (error) => {
      console.error('Response error:', error);
      // You can transform or log errors here
      // For example, add custom error tracking
      return error;
    },
  },
});

// Create axios instance
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

// Setup Auxios interceptor
auth.setupAxiosInterceptor(api);

// Now all API requests will automatically:
// 1. Include Authorization header with access token
// 2. Handle 401/403 by refreshing token
// 3. Queue requests during token refresh
// 4. Retry failed requests after successful refresh
// 5. Handle network errors with retry logic
// 6. Handle server errors (5xx) with exponential backoff

// Example: Make authenticated requests
async function getUserProfile() {
  try {
    const response = await api.get('/user/profile');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
}

async function updateUserSettings(settings: Record<string, unknown>) {
  try {
    const response = await api.put('/user/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw error;
  }
}

// Skip authentication for specific requests
async function getPublicData() {
  try {
    const response = await api.get('/public/data', {
      headers: {
        'X-Skip-Auth': 'true', // This header will skip token injection
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch public data:', error);
    throw error;
  }
}

// Handle race conditions - Multiple concurrent requests
async function loadDashboard() {
  // All these requests will be made with the same token
  // If token expires, all will be queued and retried after refresh
  const [profile, settings, stats] = await Promise.all([
    api.get('/user/profile'),
    api.get('/user/settings'),
    api.get('/user/stats'),
  ]);

  return {
    profile: profile.data,
    settings: settings.data,
    stats: stats.data,
  };
}

// Cleanup
function cleanup() {
  auth.ejectAxiosInterceptor();
  auth.destroy();
}

export { auth, api, getUserProfile, updateUserSettings, getPublicData, loadDashboard, cleanup };
