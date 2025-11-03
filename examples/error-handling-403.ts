import axios from 'axios';
import { Auxios, AuthErrorCode, type AuthError } from '../src';

/**
 * Example: Handling 403 Forbidden Errors
 * 
 * This example demonstrates how Auxios handles 403 (Forbidden) errors differently from 401 (Unauthorized).
 * 
 * Key differences:
 * - 401 (Unauthorized): Token expired/invalid → Automatically refresh token → Retry request
 * - 403 (Forbidden): Permission denied → Throw error immediately → No retry or refresh
 */

// ============================================================================
// Setup Auxios with 403 Error Handling
// ============================================================================

const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  storage: 'localStorage',
  events: {
    onAuthError: (error) => {
      // Detect 403 Forbidden errors
      if (error.code === AuthErrorCode.FORBIDDEN) {
        console.error('Access denied:', error.message);
        handleForbiddenError(error);
      } 
      // Detect token blacklist (can be 403 or 401 with special header)
      else if (error.code === AuthErrorCode.TOKEN_BLACKLISTED) {
        console.error('Token has been blacklisted');
        handleTokenBlacklisted();
      }
      // Other auth errors (401, etc.)
      else {
        console.error('Authentication error:', error);
      }
    },
    onTokenExpired: () => {
      console.log('Token expired, redirecting to login...');
      window.location.href = '/login';
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

// ============================================================================
// Error Handling Functions
// ============================================================================

function handleForbiddenError(error: AuthError) {
  // Show user-friendly message
  alert('You do not have permission to access this resource.');
  
  // Log for debugging
  console.error('Forbidden error details:', {
    code: error.code,
    statusCode: error.statusCode,
    message: error.message,
  });
  
  // Optional: Redirect to access denied page
  // window.location.href = '/403';
}

function handleTokenBlacklisted() {
  // Force logout and clear all tokens
  auth.logout();
  
  // Show message to user
  alert('Your session has been terminated. Please login again.');
  
  // Redirect to login
  window.location.href = '/login';
}

// ============================================================================
// Scenario 1: User doesn't have permission to access a resource
// ============================================================================

async function accessAdminResource() {
  try {
    // Regular user trying to access admin-only endpoint
    const response = await api.get('/api/admin/users');
    console.log('Admin data:', response.data);
  } catch (error) {
    if (isAuthError(error) && error.code === AuthErrorCode.FORBIDDEN) {
      console.log('Expected: User does not have admin privileges');
      console.log('Error code:', error.code);
      console.log('Status code:', error.statusCode); // 403
      
      // Handle in UI
      showNotification('You need admin privileges to access this page', 'error');
    }
  }
}

// ============================================================================
// Scenario 2: Token has been blacklisted (403 with special header)
// ============================================================================

async function accessWithBlacklistedToken() {
  try {
    // Server returns 403 with X-Token-Blacklisted header
    // This happens when:
    // - User changed password
    // - Token was manually revoked by admin
    // - Security breach detected
    const response = await api.get('/api/profile');
    console.log('Profile:', response.data);
  } catch (error) {
    if (isAuthError(error) && error.code === AuthErrorCode.TOKEN_BLACKLISTED) {
      console.log('Token blacklisted - forcing logout');
      
      // Auxios automatically:
      // 1. Detects X-Token-Blacklisted header
      // 2. Throws TOKEN_BLACKLISTED error
      // 3. Triggers onAuthError callback
      // 4. No retry or refresh attempted
    }
  }
}

// ============================================================================
// Scenario 3: Rate limiting or IP banned (also returns 403)
// ============================================================================

async function handleRateLimiting() {
  try {
    // Too many requests from same IP
    const response = await api.post('/api/data/export');
    console.log('Export started:', response.data);
  } catch (error) {
    if (isAuthError(error) && error.code === AuthErrorCode.FORBIDDEN) {
      // Check if it's rate limiting
      const originalResponse = error.originalError as any;
      const rateLimitReset = originalResponse?.headers?.['x-ratelimit-reset'];
      
      if (rateLimitReset) {
        const resetTime = new Date(rateLimitReset * 1000);
        showNotification(
          `Rate limit exceeded. Please try again at ${resetTime.toLocaleTimeString()}`,
          'warning'
        );
      } else {
        showNotification('Access denied. Please contact support.', 'error');
      }
    }
  }
}

// ============================================================================
// Using Fetch API (same behavior)
// ============================================================================

async function fetchExample() {
  try {
    const response = await auth.fetch('/api/admin/settings');
    const data = await response.json();
    console.log('Settings:', data);
  } catch (error) {
    if (isAuthError(error) && error.code === AuthErrorCode.FORBIDDEN) {
      console.log('Fetch API: Access denied');
      // Same error handling as Axios
      showNotification('You do not have permission to access settings', 'error');
    }
  }
}

// ============================================================================
// Advanced: Differentiate between 401 and 403
// ============================================================================

async function demonstrateDifference() {
  console.log('=== Understanding 401 vs 403 ===\n');
  
  // 401 Unauthorized - Token expired or invalid
  try {
    // Simulate expired token
    console.log('1. Making request with expired token...');
    await api.get('/api/protected/data');
  } catch (error) {
    console.log('401 Behavior:');
    console.log('- Auxios automatically refreshes token');
    console.log('- Request is retried with new token');
    console.log('- User does not notice anything');
  }
  
  console.log('\n');
  
  // 403 Forbidden - User lacks permission
  try {
    console.log('2. Making request to forbidden resource...');
    await api.delete('/api/admin/users/123');
  } catch (error) {
    if (isAuthError(error) && error.code === AuthErrorCode.FORBIDDEN) {
      console.log('403 Behavior:');
      console.log('- Auxios throws error immediately');
      console.log('- NO token refresh attempted');
      console.log('- NO retry attempted');
      console.log('- Application must handle the error');
    }
  }
}

// ============================================================================
// Best Practices for 403 Handling
// ============================================================================

async function bestPractices() {
  try {
    await api.get('/api/sensitive/data');
  } catch (error) {
    if (isAuthError(error)) {
      switch (error.code) {
        case AuthErrorCode.FORBIDDEN:
          // DO: Show user-friendly message
          showNotification('Access denied', 'error');
          
          // DO: Log for debugging
          console.error('403 Error:', {
            endpoint: error.originalError,
            user: auth.getAccessToken(),
            timestamp: new Date().toISOString(),
          });
          
          // DO: Redirect if needed
          // window.location.href = '/dashboard';
          
          // DON'T: Try to refresh token
          // DON'T: Retry the request
          break;
          
        case AuthErrorCode.TOKEN_BLACKLISTED:
          // DO: Force logout immediately
          await auth.logout();
          window.location.href = '/login?reason=token_revoked';
          break;
          
        case AuthErrorCode.UNAUTHORIZED:
          // This is handled automatically by Auxios
          // Token will be refreshed and request retried
          break;
      }
    }
  }
}

// ============================================================================
// Mock Server Response Examples
// ============================================================================

/**
 * Server should return 403 in these cases:
 * 
 * 1. Permission denied (no special header):
 *    HTTP/1.1 403 Forbidden
 *    Content-Type: application/json
 *    { "error": "Insufficient permissions" }
 * 
 * 2. Token blacklisted (with special header):
 *    HTTP/1.1 403 Forbidden
 *    X-Token-Blacklisted: true
 *    Content-Type: application/json
 *    { "error": "Token has been revoked" }
 * 
 * 3. Rate limiting:
 *    HTTP/1.1 403 Forbidden
 *    X-RateLimit-Limit: 100
 *    X-RateLimit-Remaining: 0
 *    X-RateLimit-Reset: 1699999999
 *    { "error": "Rate limit exceeded" }
 */

// ============================================================================
// Utility Functions
// ============================================================================

function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

function showNotification(message: string, type: 'info' | 'warning' | 'error') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // In real app: Use toast library like react-toastify, sonner, etc.
}

// ============================================================================
// Export for usage
// ============================================================================

export {
  auth,
  api,
  accessAdminResource,
  accessWithBlacklistedToken,
  handleRateLimiting,
  fetchExample,
  demonstrateDifference,
  bestPractices,
};
