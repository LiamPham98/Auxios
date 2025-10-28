# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
