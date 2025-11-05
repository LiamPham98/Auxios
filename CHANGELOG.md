# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.6] - 2025-11-05

### 🛠️ Fixes
- **Fix SSR compatibility for storage adapters**: Fixed `localStorage is not defined` and `document is not defined` errors when using Auxios with Next.js SSR/SSG. All storage adapters now check for client-side environment before accessing browser APIs.

### 🔧 Technical Changes
- **LocalStorageAdapter**: Added `isClient` check before accessing `localStorage`
- **SessionStorageAdapter**: Added `isClient` check before accessing `sessionStorage`
- **CookieStorageAdapter**: Added `isClient` check before accessing `document.cookie`
- **Universal Storage**: All storage adapters now safely return `null` on server-side

### ✨ What This Fixes

**Before (SSR Error)**:
```javascript
// ❌ Error: localStorage is not defined
ReferenceError: localStorage is not defined
    at y.getAccessToken (/next/server/chunks/142.js:426:49541)
```

**After (SSR Safe)**:
```typescript
// ✅ Works on both client and server
import { Auxios, createStorage } from '@trungpham.liam/auxios/core';

// Option 1: Use memory storage for SSR
const auth = new Auxios({
  storage: 'memory', // No browser APIs
  multiTabSync: false, // Safe for SSR
});

// Option 2: Universal storage (auto-detects environment)
const storage = createStorage('localStorage'); // SSR-safe!
const auth = new Auxios({ storage });

// Option 3: Dynamic storage selection
const auth = new Auxios({
  storage: typeof window !== 'undefined' ? 'localStorage' : 'memory',
});
```

### 🎯 Next.js Integration
- **New Example**: `examples/nextjs-usage.ts` with complete SSR integration patterns
- **Documentation**: Added best practices for using Auxios with Next.js SSR/SSG

### 📦 Impact
- **Zero Breaking Changes**: All existing code continues to work
- **SSR Compatibility**: Now works seamlessly with Next.js, Remix, and other SSR frameworks
- **Bundle Size**: Minimal increase (+0.6 kB) for SSR compatibility checks

---

## [1.2.5] - 2025-11-05

### 🛠️ Fixes
- **Fix React useAuth hook authentication state management**: Fixed issue where `isAuthenticated` was incorrectly set to `false` for all auth errors. Now it only sets to `false` when `REFRESH_FAILED` occurs, preserving authentication state for other error types like `FORBIDDEN`.

### 🔧 Technical Changes
- **React Hook**: Updated `onAuthError` callback in `useAuth` to only clear authentication state on refresh failures
- **State Preservation**: `isAuthenticated` remains `true` for 403 Forbidden errors, allowing users to stay logged in while handling permission issues

### ✨ What This Fixes

**Before**:
```typescript
// ❌ Wrong: Any auth error logs out the user
const { isAuthenticated, error } = useAuth(auth);

// User gets 403 Forbidden error
await api.get('/admin/users'); // 403
console.log(isAuthenticated); // false - user incorrectly logged out
```

**After**:
```typescript
// ✅ Correct: Only refresh failures log out the user
const { isAuthenticated, isForbidden, error } = useAuth(auth);

// User gets 403 Forbidden error  
await api.get('/admin/users'); // 403
console.log(isAuthenticated); // true - user stays logged in
console.log(isForbidden); // true - proper error state
```

---

## [1.2.4] - 2025-11-05

### ✨ Features
- **Add `isForbidden` state to React `useAuth` hook**: React applications can now access the 403 Forbidden error state through the `isForbidden` boolean returned by `useAuth`. This allows UI components to distinguish between unauthorized (401) and forbidden (403) states.

### 🎯 Usage Example
```typescript
import { useAuth } from '@auxios/react';

function ProfilePage() {
  const { isAuthenticated, isForbidden, login } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }
  
  if (isForbidden) {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return <ProfileContent />;
}
```

### 🔧 Technical Changes
- **React Hook**: Added `isForbidden` state management with automatic reset on successful authentication and logout
- **State Synchronization**: `isForbidden` is set to `true` when 403 errors occur, `false` on login/logout success
- **Type Safety**: Exported `AuthErrorCode` from core types for proper error code checking

## [1.2.3] - 2025-11-03

### 🛠️ Fixes
- **Trigger `onAuthError` callback for 403 Forbidden errors**: Fixed issue where `onAuthError` callback was not being called when API returns 403 Forbidden. Now the callback is properly triggered with `AuthErrorCode.FORBIDDEN`, allowing applications to handle permission denied errors correctly.

### 🔧 Technical Changes
- **Axios Interceptor**: Inject `EventEmitter` and call `emitAuthError()` in `handleForbiddenError()` before rejecting the error
- **Fetch Wrapper**: Inject `EventEmitter` and call `emitAuthError()` when handling 403 responses
- **Core**: Pass `EventEmitter` instance to both interceptor constructors

### ✨ What This Fixes

**Before (1.2.2)**:
```typescript
// ❌ Wrong: onAuthError not called for 403
const auth = new Auxios({
  events: {
    onAuthError: (error) => {
      console.log('This never gets called for 403!'); 
    }
  }
});

await api.get('/admin/users'); // 403 Forbidden
// Error thrown but onAuthError callback not triggered
```

**After (1.2.3)**:
```typescript
// ✅ Correct: onAuthError called for 403
const auth = new Auxios({
  events: {
    onAuthError: (error) => {
      if (error.code === AuthErrorCode.FORBIDDEN) {
        console.log('Permission denied!'); // ✅ Now gets called
        showNotification('Access denied');
      }
    }
  }
});

await api.get('/admin/users'); // 403 Forbidden
// onAuthError callback properly triggered
```

### 📦 Impact
- Non-breaking change
- Consistent with existing documentation and examples
- Aligns behavior with user expectations

---

## [1.2.2] - 2025-11-03

### 🛠️ Fixes
- **Separate 403 Forbidden from 401 Unauthorized handling**: Fixed incorrect behavior where 403 errors triggered automatic token refresh. Now 403 errors are properly treated as permission denied and thrown immediately without refresh attempts, while 401 errors continue to trigger token refresh as expected.
  
### 🎯 Behavior Changes
- **401 (Unauthorized)**: Token expired/invalid → Automatic token refresh → Retry request
- **403 (Forbidden)**: Permission denied/insufficient privileges → Throw error immediately → No refresh or retry
- **403 with `X-Token-Blacklisted` header**: Token has been revoked → Clear tokens → Force logout

### 📚 Documentation
- **Added `examples/error-handling-403.ts`**: Comprehensive example demonstrating proper 403 error handling with:
  - Scenario 1: User lacking permissions to access resources
  - Scenario 2: Blacklisted token detection and handling
  - Scenario 3: Rate limiting and IP restrictions
  - Comparison between 401 vs 403 behaviors
  - Best practices for handling forbidden errors
  - Type-safe error handling patterns

### 🔧 Technical Changes

#### Axios Interceptor (`src/interceptors/axios-interceptor.ts`)
- Split `onResponseError` logic to handle 401 and 403 separately
- Added new `handleForbiddenError()` method for 403-specific handling
- 403 errors now return `AuthErrorCode.FORBIDDEN` without triggering refresh

#### Fetch Wrapper (`src/interceptors/fetch-wrapper.ts`)
- Updated `handleResponse()` to treat 403 independently from 401
- 403 errors throw immediately with proper error code
- Maintains consistency with Axios interceptor behavior

### ✨ What This Fixes

**Before (1.2.1)**:
```typescript
// ❌ Wrong: 403 triggered token refresh attempt
api.get('/admin/users') // 403 Forbidden
  → Tried to refresh token (unnecessary)
  → Retried request (still failed with 403)
  → Wasted API calls and user time
```

**After (1.2.2)**:
```typescript
// ✅ Correct: 403 throws error immediately
api.get('/admin/users') // 403 Forbidden
  → Throws AuthErrorCode.FORBIDDEN immediately
  → onAuthError callback triggered
  → Application handles permission denied properly
```

### 🎯 Use Cases

Now properly handles:
- ✅ Admin-only endpoints accessed by regular users
- ✅ Resource-level permissions (e.g., viewing others' private data)
- ✅ Rate limiting (too many requests)
- ✅ IP-based restrictions
- ✅ Token blacklist/revocation
- ✅ Account suspension or role changes

### ♻️ Backward Compatibility

**Potentially Breaking**: If your application relied on 403 triggering token refresh (incorrect behavior), you'll need to update error handling. However, this was a bug fix to align with HTTP standards and correct authentication practices.

**Migration**:
```typescript
// Add proper 403 error handling in your event callbacks
const auth = new Auxios({
  events: {
    onAuthError: (error) => {
      if (error.code === AuthErrorCode.FORBIDDEN) {
        // Handle permission denied
        showNotification('You do not have permission to access this resource');
        // Optionally redirect
        // router.push('/dashboard');
      }
    }
  }
});
```

### 📦 Bundle Size
No significant change in bundle size.

---

## [1.2.1] - 2025-10-30

### 🛠️ Fixes
- **Add pnpm-lock.yaml to version control for CI/CD**: Lockfile is required for GitHub Actions workflow to ensure consistent dependency versions across environments.

---

## [1.2.0] - 2025-10-29

### 🎉 New Features - expires_in Support & Enhanced Documentation

This release adds support for server-provided token expiry times (`expires_in`), making Auxios work seamlessly with opaque tokens and APIs that don't use JWT. It also includes a complete documentation overhaul with improved organization and comprehensive guides.

#### expires_in / refresh_expires_in Support

**The Problem:**
- Not all APIs use JWT tokens with `exp` field
- Some APIs use opaque tokens (non-JWT)
- Server-side dynamic token lifetimes weren't supported
- Proactive refresh relied entirely on JWT decode

**The Solution:**
Auxios now supports `expires_in` field from API responses with automatic priority handling:

**Priority Order:**
1. ✅ **`expires_in` from API response** (highest priority) - Use server-provided expiry time
2. ✅ **JWT decode** (fallback) - Extract `exp` field from token
3. ⚠️ **Manual refresh only** - No automatic refresh if neither available

**Configuration:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    expiresIn: 'expires_in',           // NEW: Token expiry in seconds
    refreshExpiresIn: 'refresh_expires_in', // NEW: Refresh token expiry
  },
});
```

**API Response Format:**
```json
{
  "access_token": "opaque-token-xyz",
  "refresh_token": "refresh-xyz",
  "expires_in": 3600,           // 1 hour
  "refresh_expires_in": 2592000 // 30 days
}
```

**Features:**
- ✅ Works with both JWT and opaque tokens
- ✅ Server controls token lifetime dynamically
- ✅ More accurate proactive refresh scheduling
- ✅ Backward compatible (JWT decode still works)
- ✅ Automatic nested structure search
- ✅ Custom field names support (`ttl`, `expiresIn`, etc.)

**New Types:**
```typescript
interface TokenFieldNamesConfig {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;          // NEW
  refreshExpiresIn?: string;   // NEW
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;          // NEW
  refreshExpiresIn?: number;   // NEW
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;          // NEW
  refreshExpiresIn?: number;   // NEW
}
```

**Use Cases:**
- ✅ Opaque tokens (non-JWT)
- ✅ API uses dynamic token expiry
- ✅ OAuth2 standard format
- ✅ Server-side control over token lifetimes
- ✅ Tokens without `exp` field

### 📚 Documentation Overhaul

#### Complete README.md Rewrite
- **New Structure**: Better organized with clear sections
- **Installation**: Added all package managers (npm, pnpm, yarn, bun)
- **Quick Start**: Minimal setup (3 lines) + full example
- **Common Use Cases**: 6 real-world scenarios
  - REST API with JWT
  - snake_case backend
  - API with expires_in
  - OAuth2 format
  - httpOnly cookies
  - GraphQL backend
- **Integration Examples**: Axios, Fetch, React, Vue
- **Complete API Reference**: All methods documented
- **Security Best Practices**: httpOnly cookies, CSRF, token rotation
- **Better Organization**: Easier navigation and discovery

#### CUSTOMIZATION.md Enhancements
- **Quick Reference Table**: Common scenarios at a glance
- **Enhanced expires_in Documentation**: Complete guide with examples
- **Migration Guides**: 
  - JWT-only → expires_in
  - localStorage → httpOnly cookies
  - Adding CSRF protection
  - Custom refresh logic
  - Converting from axios-auth-refresh
- **Comparison Tables**: JWT decode vs expires_in

#### New TROUBLESHOOTING.md
Complete troubleshooting guide with solutions for:
- ✅ Token not refreshing automatically
- ✅ 401 errors still occurring
- ✅ Multi-tab sync not working
- ✅ expires_in not being used
- ✅ Custom field names not working
- ✅ TypeScript type errors
- ✅ CORS issues
- ✅ Refresh loops

Each issue includes:
- Symptoms
- Possible causes
- Step-by-step solutions
- Code examples

#### New Example: expires-in-usage.ts
Complete example demonstrating:
- Basic expires_in setup
- OAuth2 format
- Custom TTL field names
- Nested response structures
- Integration with Axios/Fetch
- Real-world usage patterns

### 🚀 CI/CD Automation

#### GitHub Actions Workflow
- **Auto-publish to npm** on tag push
- **Automated pipeline**: typecheck → lint → build → publish
- **Documentation**: 
  - `.github/workflows/publish.yml` - Workflow definition
  - `.github/PUBLISHING.md` - Complete publishing guide
  - `.github/README.md` - Workflows overview

**Usage:**
```bash
# Bump version
npm version minor  # 1.1.1 -> 1.2.0

# Push commit and tag
git push origin main
git push origin v1.2.0

# GitHub Actions automatically publishes to npm ✅
```

### 🔧 Improvements

#### Package.json
- **Version**: Bumped to 1.2.0
- **Keywords**: Added for better npm discoverability
  - `expires-in`
  - `token-refresh`
  - `multi-tab-sync`
  - `race-condition`
  - `oauth2`
  - `token-management`
  - `auto-refresh`

#### Token Manager
- **Priority Logic**: expires_in > JWT decode > manual
- **New Method**: `isRefreshTokenExpired()` - Check refresh token expiry
- **Smart Calculation**: `calculateExpiryTime()` with fallback logic
- **Improved Scheduling**: Uses expires_in for proactive refresh

#### Core Types
- **Extended Interfaces**: Added expires_in fields to all relevant types
- **Type Safety**: Full TypeScript support for new features
- **Backward Compatible**: All existing code continues to work

### 📦 Examples

#### Updated
- `examples/basic-usage.ts` - Added expires_in comments

#### New
- `examples/expires-in-usage.ts` - Complete expires_in guide

### 🎯 Benefits

#### For Developers
- ✅ Works with more backend APIs (JWT + opaque tokens)
- ✅ Better documentation for faster onboarding
- ✅ Self-service troubleshooting
- ✅ More real-world examples
- ✅ Easier customization

#### For Projects
- ✅ Support for dynamic token lifetimes
- ✅ More accurate token refresh
- ✅ Better npm discoverability
- ✅ Automated publishing workflow
- ✅ Professional documentation

### 📊 Statistics

- **Documentation**: 3 major files updated, 2 new guides added
- **Code Quality**: All tests passing (typecheck ✅, lint ✅, build ✅)
- **Bundle Size**: 30.72 kB (gzipped: 7.20 kB) - No increase
- **Backward Compatible**: 100% - No breaking changes
- **Examples**: 5 complete examples with real-world scenarios

### 🔗 Links

- **NPM**: https://www.npmjs.com/package/@trungpham.liam/auxios
- **GitHub**: https://github.com/trungpham-liam/auxios
- **Documentation**: [README.md](./README.md), [CUSTOMIZATION.md](./CUSTOMIZATION.md), [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## [1.1.1] - 2025-10-29

### 🛠️ Fixes
- Ensure automatic refresh handles nested response wrappers and dot-notation token field names, preventing empty access token responses from compliant APIs.

## [1.1.0] - 2025-10-28

### 🎉 New Features - Comprehensive Customization Support

This release adds powerful customization options to support virtually any backend API format and authentication flow.

#### Custom Storage Keys
- **Feature**: Configure custom localStorage/sessionStorage key names
- **Config**: `storageKeys.accessToken` and `storageKeys.refreshToken`
- **Use Case**: Avoid conflicts when multiple apps share the same domain, or follow company naming conventions
- **Example**:
  ```typescript
  storageKeys: {
    accessToken: 'my_app_access_token',
    refreshToken: 'my_app_refresh_token',
  }
  ```

#### Custom Token Field Names
- **Feature**: Support backends that return tokens with different field names
- **Config**: `tokenFieldNames.accessToken` and `tokenFieldNames.refreshToken`
- **Use Case**: Backend uses snake_case (`access_token`, `refresh_token`) instead of camelCase
- **Supports**: Any field naming convention (snake_case, camelCase, kebab-case, custom)
- **Example**:
  ```typescript
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  }
  // API returns: { "access_token": "...", "refresh_token": "..." }
  ```

#### Custom Refresh Request
- **Feature**: Fully customize the token refresh request
- **Config**: `buildRefreshRequest(refreshToken) => { body, headers, method }`
- **Customizable**:
  - Request body format (OAuth2, custom formats)
  - Additional headers (device ID, client version, etc.)
  - HTTP method (POST, PUT, PATCH)
- **Use Cases**:
  - OAuth2 standard format
  - Token in header instead of body
  - Additional authentication parameters
  - Custom client credentials
- **Example**:
  ```typescript
  buildRefreshRequest: (refreshToken) => ({
    body: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'my-app',
    },
    headers: {
      'X-Device-Id': 'device-123',
    },
  })
  ```

#### Custom Refresh Function
- **Feature**: Complete control over token refresh logic
- **Config**: `refreshTokenFn(refreshToken) => Promise<{ accessToken, refreshToken }>`
- **Use Cases**:
  - Custom axios instances with specific configuration
  - GraphQL backends
  - Token encryption/decryption
  - Complex multi-step authentication
  - Non-standard authentication flows
- **Example**:
  ```typescript
  refreshTokenFn: async (refreshToken) => {
    const response = await myCustomAxios.post('/auth/refresh', {
      token: refreshToken,
    });
    return {
      accessToken: response.data.jwt,
      refreshToken: response.data.new_refresh,
    };
  }
  ```

### 📚 Documentation

#### New Files
- **CUSTOMIZATION.md**: Comprehensive 400+ line guide covering:
  - Detailed explanation of all customization options
  - 8+ real-world usage examples
  - Integration guides for Laravel, AWS Cognito, Firebase, GraphQL
  - Best practices and tips
  - Migration guide
  - Debugging strategies

- **examples/custom-config-usage.ts**: 8 complete examples:
  - Custom storage keys
  - Backend with snake_case
  - OAuth2 standard format
  - Token in header
  - Completely custom refresh logic
  - GraphQL backend
  - Multiple apps on same domain
  - Combined configuration

#### Updated Files
- **README.md**: 
  - Added "Customization" section with quick examples
  - Updated configuration interface documentation
  - Links to CUSTOMIZATION.md for detailed guides

### 🔧 Technical Changes

#### Core Updates
- **src/core/types.ts**: 
  - Added `StorageKeysConfig` interface
  - Added `TokenFieldNamesConfig` interface
  - Added `RefreshRequestConfig` interface
  - Updated `AuxiosConfig` with 4 new optional fields
  
- **src/core/token-storage.ts**:
  - Updated all storage adapters to accept custom keys
  - `LocalStorageAdapter`, `SessionStorageAdapter` now accept `StorageKeysConfig`
  - `CookieStorageAdapter` accepts keys in options
  - Updated `createStorage()` function signature
  - Default keys remain unchanged for backward compatibility

- **src/auxios.ts**:
  - Implemented custom refresh logic with priority system:
    1. `refreshTokenFn` (highest priority - complete override)
    2. `buildRefreshRequest` + `tokenFieldNames` (custom request + field mapping)
    3. Default behavior (standard format)
  - Pass custom storage keys to storage adapters
  - Enhanced error message for missing refresh token

### 🎯 Real-World Backend Support

Now officially supports:
- ✅ Laravel (snake_case responses)
- ✅ Ruby on Rails (snake_case conventions)
- ✅ Django (Python conventions)
- ✅ AWS Cognito (custom auth flow)
- ✅ Firebase Authentication (custom token format)
- ✅ Auth0 (OAuth2 standard)
- ✅ GraphQL APIs
- ✅ Custom authentication systems
- ✅ Any backend API format

### 📊 Bundle Size

- **ESM**: 28.20 kB (6.66 kB gzipped) - minimal increase
- **CJS**: 21.71 kB (5.91 kB gzipped) - minimal increase
- **Impact**: <0.3 kB increase for comprehensive customization

### ♻️ Backward Compatibility

- **100% backward compatible**: All existing code continues to work without changes
- All new configuration options are optional
- Default values match v1.0.0 behavior
- No breaking changes

### 🔄 Migration from 1.0.0

No migration needed! Simply update the package:
```bash
pnpm update @trungpham.liam/auxios
```

Existing code works as-is. Adopt new features when needed:
```typescript
// Before (v1.0.0) - still works in v1.1.0
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
});

// After (v1.1.0) - opt-in to new features
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: { 
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  },
});
```

### 📝 Examples Added

8 comprehensive examples covering:
1. Custom storage keys for conflict avoidance
2. Backend using snake_case
3. OAuth2 standard format
4. Custom refresh request with headers
5. Token in header instead of body
6. Completely custom refresh logic
7. GraphQL backend integration
8. Multiple apps on same domain

---

## [1.0.0] - 2025-10-28

### 🎉 Initial Release

Production-ready TypeScript authentication library with automatic token refresh, multi-tab synchronization, and comprehensive error handling.

### ✨ Features

#### Core Token Management
- **Multiple Storage Backends**: Support for localStorage, sessionStorage, memory, and httpOnly cookies
- **JWT Token Lifecycle**: Automatic JWT decode, expiry tracking, and validation
- **Proactive Token Refresh**: Background timer refreshes tokens 5 minutes before expiry
- **Token Rotation**: Support for invalidating old refresh tokens after rotation
- **Graceful Logout**: Clear tokens, cancel pending requests, and call server revocation endpoint

#### Race Condition Prevention
- **Single Refresh Promise**: Shared promise ensures only one refresh request at a time
- **Request Queue**: Automatically queue all pending requests during token refresh
- **Automatic Retry**: Retry all queued requests with new token after successful refresh
- **Concurrent Request Handling**: Perfect handling of multiple simultaneous 401 responses

#### Multi-Tab Synchronization
- **BroadcastChannel API**: Instant cross-tab communication for modern browsers
- **Storage Events Fallback**: Automatic fallback for older browsers
- **Synchronized Events**: Token updates, logout, and token blacklist across all tabs
- **Real-time Updates**: All tabs stay in sync automatically

#### HTTP Client Integration

##### Axios Interceptor
- Auto-inject access token in Authorization header
- Detect and handle 401/403 with automatic token refresh
- Queue requests during token refresh
- Retry failed requests after successful refresh
- Differentiate between auth errors (401/403) and server errors (5xx)
- Network offline detection and automatic retry when online
- Exponential backoff for server errors with jitter
- Token blacklist detection via custom headers

##### Fetch API Wrapper
- Same capabilities as Axios interceptor
- Native fetch wrapper with middleware pattern
- Framework-agnostic design
- Full TypeScript support

#### Error Handling & Resilience
- **Network Detection**: Monitor online/offline status with automatic reconnection
- **Retry Strategy**: Configurable exponential backoff with max attempts
- **Error Classification**: Distinguish between AUTH, NETWORK, TIMEOUT, and SERVER errors
- **Timeout Handling**: Request timeout with configurable retry logic
- **Graceful Degradation**: Handle edge cases without breaking application flow

#### Security Features
- **Token Rotation**: Invalidate old refresh tokens after use
- **CSRF Protection**: Support for CSRF token headers
- **XSS Protection**: Secure storage recommendations (httpOnly cookies)
- **Token Blacklist**: Server-side token invalidation support
- **Secure Defaults**: HttpOnly cookies option for refresh tokens

#### Configuration & Events
- **Flexible Configuration**: Custom endpoints, headers, retry logic, storage type
- **Event Callbacks**: 
  - `onTokenRefreshed` - Called after successful token refresh
  - `onTokenExpired` - Called when token expires
  - `onAuthError` - Called on authentication errors
  - `onLogout` - Called after logout
  - `onRefreshStart/End` - Called during refresh lifecycle
- **Runtime Updates**: Update configuration at runtime
- **Custom Headers**: Add custom headers to all requests

#### React Integration
- **useAuth Hook**: Authentication state management with login/logout
- **useTokenRefresh Hook**: Periodic background token refresh
- **useAuthFetch Hook**: Fetch wrapper with loading and error states
- **TypeScript Support**: Full type definitions for all hooks

### 📦 Package

#### Build Output
- **ESM Module**: `dist/auxios.js` (26.46 kB, gzipped: 6.34 kB)
- **CommonJS Module**: `dist/auxios.cjs` (20.28 kB, gzipped: 5.62 kB)
- **TypeScript Declarations**: `dist/index.d.ts`
- **Source Maps**: Included for debugging

#### Dependencies
- **Zero Runtime Dependencies**: Lightweight and efficient
- **Peer Dependencies**: 
  - `axios@^1.0.0` (optional)
  - `react@^18.0.0` (optional, for hooks only)

### 🛠️ Developer Experience

#### TypeScript
- Full TypeScript support with strict mode
- Comprehensive type definitions
- IntelliSense support in all modern editors
- Zero `any` types (except where unavoidable)

#### Code Quality
- **Oxlint**: Fast linting with zero errors
- **Biome**: Formatting and additional linting rules
- **ESM & CJS**: Dual build for maximum compatibility
- **Tree-shakeable**: Only import what you use

#### Documentation
- Comprehensive README with examples
- API reference documentation
- Security best practices guide
- Integration examples for:
  - Basic usage
  - Axios integration
  - Fetch API integration
  - React hooks usage

### 📚 Examples

Four complete working examples included:
1. **basic-usage.ts** - Basic setup and configuration
2. **axios-integration.ts** - Axios interceptor with race condition handling
3. **fetch-integration.ts** - Native Fetch API wrapper
4. **react-example.tsx** - React hooks with authentication flow

### 🎯 Use Cases

Perfect for:
- Single Page Applications (SPAs)
- Progressive Web Apps (PWAs)
- Mobile web applications
- Desktop applications using Electron
- Any JavaScript/TypeScript project requiring authentication

### 🌐 Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for BroadcastChannel and fetch)
- Node.js environments (for SSR)

### 📄 License

MIT License - See LICENSE file for details

### 🙏 Acknowledgments

Built with:
- Vite for blazing fast builds
- TypeScript for type safety
- Biome & Oxlint for code quality
- PNPM for efficient package management

---

## Architecture Highlights

### Race Condition Prevention
```
Multiple 401 Responses → Single Refresh Promise → Queue All Requests → Retry After Success
```

### Multi-Tab Sync Flow
```
Tab 1: Token Update → BroadcastChannel → Tab 2/3: Auto Update Tokens
Tab 1: Logout → BroadcastChannel → Tab 2/3: Auto Logout
```

### Proactive Refresh
```
JWT Expiry Extraction → Schedule Refresh (Expiry - 5min) → Background Refresh → No 401 Errors
```

### Network Resilience
```
Request Fails → Detect Offline → Wait for Online → Auto Retry → Success
Server Error → Exponential Backoff → Max Attempts → Fail or Success
```

---

## Migration Guide

This is the initial release, no migration needed.

### Quick Start

```bash
pnpm install auxios axios
```

```typescript
import { Auxios } from 'auxios';
import axios from 'axios';

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'localStorage',
  multiTabSync: true,
});

const api = axios.create();
auth.setupAxiosInterceptor(api);

// Done! All requests now have automatic token refresh
```

---

## Performance Metrics

- **Bundle Size**: 6.34 KB gzipped (ESM)
- **Zero Runtime Dependencies**: No bloat
- **Tree-shakeable**: Import only what you need
- **Lazy Evaluation**: Minimal overhead when idle

---

## Security Considerations

✅ **Implemented**:
- Token rotation support
- HttpOnly cookie storage option
- CSRF token support
- Token blacklist detection
- Secure by default configuration

⚠️ **Recommendations**:
- Use HttpOnly cookies for refresh tokens
- Implement CSRF protection on your backend
- Use HTTPS in production
- Set appropriate token expiry times
- Implement token rotation on your backend

---

## Roadmap

Future considerations (not in v1.0.0):
- [ ] Token encryption for memory storage
- [ ] Biometric authentication support
- [ ] OAuth2/OIDC provider integration
- [ ] Advanced analytics and monitoring
- [ ] Refresh token fingerprinting

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Full Changelog**: Initial Release
