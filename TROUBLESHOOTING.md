# Troubleshooting Guide

This guide helps you solve common issues when using Auxios.

## Table of Contents
- [Token Not Refreshing Automatically](#token-not-refreshing-automatically)
- [401 Errors Still Occurring](#401-errors-still-occurring)
- [Multi-Tab Sync Not Working](#multi-tab-sync-not-working)
- [expires_in Not Being Used](#expires_in-not-being-used)
- [Custom Field Names Not Working](#custom-field-names-not-working)
- [TypeScript Type Errors](#typescript-type-errors)
- [CORS Issues](#cors-issues)
- [Refresh Loop](#refresh-loop)

---

## Token Not Refreshing Automatically

### Symptoms
- Access token expires but no refresh happens
- Manual `refreshTokens()` works but automatic refresh doesn't

### Possible Causes & Solutions

#### 1. Auto Refresh is Disabled

**Check:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  autoRefresh: true, // ← Make sure this is true (default: true)
});
```

#### 2. JWT Token Has No `exp` Field

If your JWT doesn't contain an `exp` (expiry) field, Auxios can't schedule automatic refresh.

**Solution:** Use `expires_in` from your API response:
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    expiresIn: 'expires_in', // Tell Auxios to use this field
  },
});
```

Your API should return:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expires_in": 3600
}
```

#### 3. Token Already Expired

Proactive refresh only works if the token hasn't expired yet. By default, Auxios refreshes 5 minutes before expiry.

**Check token lifetime:**
```typescript
// Token expires in less than 5 minutes?
// Adjust the offset:
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenExpiry: {
    proactiveRefreshOffset: 60, // Refresh 1 min before expiry
  },
});
```

#### 4. Instance Was Destroyed

If you called `auth.destroy()`, automatic refresh stops.

**Solution:** Don't destroy the instance while using it.

---

## 401 Errors Still Occurring

### Symptoms
- Requests fail with 401 even after token refresh
- Refresh happens but subsequent requests still fail

### Possible Causes & Solutions

#### 1. Refresh Endpoint Returns Wrong Format

**Check your refresh response:**
```typescript
// ✅ Correct format (default)
{
  "accessToken": "new-token",
  "refreshToken": "new-refresh-token"
}

// ❌ Wrong format
{
  "access_token": "new-token",  // snake_case
  "refresh_token": "new-refresh-token"
}
```

**Solution:** Configure field names:
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  },
});
```

#### 2. Nested Response Structure

If your API returns nested tokens:
```json
{
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Good news:** Auxios automatically searches in `data`, `result`, `payload`, and `tokens` fields!

#### 3. Token Not Being Sent in Requests

**For Axios:**
```typescript
import axios from 'axios';

const api = axios.create({ baseURL: 'https://api.example.com' });

// ⚠️ Must setup interceptor!
auth.setupAxiosInterceptor(api);

// Now requests will include Authorization header
await api.get('/protected');
```

**For Fetch:**
```typescript
// ❌ Don't use native fetch
const response = await fetch('/api/user');

// ✅ Use auth.fetch
const response = await auth.fetch('/api/user');
```

#### 4. Server Doesn't Accept Token Format

Check if your server expects a specific format:

```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  headers: {
    // Some servers need "Bearer " prefix
    // Auxios adds this automatically, but you can customize:
  },
});
```

If you need custom header format, use Axios interceptor:
```typescript
api.interceptors.request.use((config) => {
  const token = auth.getAccessToken();
  if (token) {
    config.headers.Authorization = `CustomPrefix ${token}`;
  }
  return config;
});
```

---

## Multi-Tab Sync Not Working

### Symptoms
- Login in one tab doesn't update other tabs
- Logout in one tab doesn't affect other tabs

### Possible Causes & Solutions

#### 1. Multi-Tab Sync is Disabled

**Check:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  multiTabSync: true, // ← Make sure this is true (default: true)
});
```

#### 2. Using Memory Storage

Memory storage doesn't support multi-tab sync (data is not shared between tabs).

**Solution:** Use `localStorage` or `sessionStorage`:
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'localStorage', // ← Use this instead of 'memory'
});
```

#### 3. Browser Doesn't Support BroadcastChannel

**Check browser support:** https://caniuse.com/broadcastchannel

Auxios falls back to storage events for older browsers, but this requires same-origin.

#### 4. Different Origins (localhost vs 127.0.0.1)

BroadcastChannel and storage events only work on the **exact same origin**.

❌ Won't work:
- Tab 1: `http://localhost:3000`
- Tab 2: `http://127.0.0.1:3000`

✅ Will work:
- Tab 1: `http://localhost:3000`
- Tab 2: `http://localhost:3000`

---

## expires_in Not Being Used

### Symptoms
- You're providing `expires_in` but Auxios still decodes JWT
- Proactive refresh not working correctly with `expires_in`

### Possible Causes & Solutions

#### 1. Field Name Mismatch

**Check your API response:**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 3600  // ← camelCase
}
```

**Configure field name:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    expiresIn: 'expiresIn', // Match your API's field name
  },
});
```

#### 2. Field is Nested

```json
{
  "data": {
    "tokens": {
      "accessToken": "...",
      "expires_in": 3600  // ← nested
    }
  }
}
```

**Good news:** Auxios automatically searches nested structures!

#### 3. Value is a String, Not Number

```json
{
  "accessToken": "...",
  "expires_in": "3600"  // ← String instead of number
}
```

**Problem:** Auxios expects a number.

**Solution:** Fix on backend, or use custom `refreshTokenFn`:
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    
    const data = await response.json();
    
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: parseInt(data.expires_in, 10), // Convert to number
    };
  },
});
```

---

## Custom Field Names Not Working

### Symptoms
- Configured `tokenFieldNames` but still getting errors
- "Refresh response is missing expected token fields" error

### Possible Causes & Solutions

#### 1. Typo in Field Name

**Check your config carefully:**
```typescript
// ❌ Wrong
tokenFieldNames: {
  accessToken: 'accesToken', // Typo!
}

// ✅ Correct
tokenFieldNames: {
  accessToken: 'access_token',
}
```

#### 2. API Response Structure Changed

**Debug by logging the response:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken) => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    
    const data = await response.json();
    console.log('Refresh response:', data); // ← Debug here
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  },
});
```

#### 3. Response is Not JSON

If your API returns HTML or plain text instead of JSON:

**Check response:**
```typescript
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  body: JSON.stringify({ refreshToken }),
});

console.log('Content-Type:', response.headers.get('content-type'));
const text = await response.text();
console.log('Response body:', text);
```

**Common cause:** Server returns 404/500 HTML error page instead of JSON.

---

## TypeScript Type Errors

### Symptoms
- TypeScript errors when using Auxios
- Type mismatches with `TokenPair`, `RefreshResponse`, etc.

### Solutions

#### 1. Missing Type Imports

```typescript
// ✅ Import types explicitly
import { Auxios, type TokenPair, type AuxiosConfig } from '@trungpham.liam/auxios';

const config: AuxiosConfig = {
  endpoints: { refresh: '/api/auth/refresh' },
};

const auth = new Auxios(config);
```

#### 2. Custom Refresh Function Types

```typescript
import { Auxios, type RefreshResponse } from '@trungpham.liam/auxios';

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  refreshTokenFn: async (refreshToken: string): Promise<RefreshResponse> => {
    // Your custom logic
    return {
      accessToken: '...',
      refreshToken: '...',
      expiresIn: 3600, // Optional
    };
  },
});
```

#### 3. Event Callback Types

```typescript
import { Auxios, type TokenPair, type AuthError } from '@trungpham.liam/auxios';

const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  events: {
    onTokenRefreshed: (tokens: TokenPair) => {
      console.log(tokens);
    },
    onAuthError: (error: AuthError) => {
      console.error(error);
    },
  },
});
```

---

## CORS Issues

### Symptoms
- "Access to fetch blocked by CORS policy"
- "No 'Access-Control-Allow-Origin' header"

### Solutions

#### 1. Configure Backend CORS

This is a **backend issue**, not an Auxios issue.

**Express.js example:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, // Important for cookies
}));
```

#### 2. Credentials Mode

If using cookies:
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  storage: 'cookie',
});

// For custom fetch calls:
await fetch('/api/auth/refresh', {
  credentials: 'include', // ← Important!
});
```

#### 3. Preflight Requests

CORS preflight (OPTIONS) requests can fail if not configured.

**Backend must handle OPTIONS:**
```javascript
app.options('/api/auth/refresh', cors());
```

---

## Refresh Loop

### Symptoms
- Infinite refresh calls
- Network tab shows repeated refresh requests
- "Too many refresh attempts" errors

### Possible Causes & Solutions

#### 1. Refresh Endpoint Returns 401

If your `/api/auth/refresh` endpoint returns 401, Auxios will try to refresh again, causing a loop.

**Solution:** Make sure refresh endpoint:
- Doesn't require access token
- Only validates refresh token
- Returns proper error for invalid refresh token (don't return 401)

```typescript
// Backend should return 403 for invalid refresh token, not 401
if (!isValidRefreshToken(token)) {
  return res.status(403).json({ error: 'Invalid refresh token' });
}
```

#### 2. Server Clock Skew

If server and client clocks are out of sync, `exp` time in JWT may be incorrect.

**Solution:** Use `expires_in` from server instead:
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  tokenFieldNames: {
    expiresIn: 'expires_in', // Server provides expiry time
  },
});
```

#### 3. Retry Configuration Too Aggressive

**Adjust retry settings:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  retry: {
    maxAttempts: 2, // ← Reduce this
    initialDelay: 2000,
  },
});
```

---

## Still Having Issues?

1. **Enable debug logging:**
```typescript
const auth = new Auxios({
  endpoints: { refresh: '/api/auth/refresh' },
  events: {
    onRefreshStart: () => console.log('[Auxios] Refresh started'),
    onRefreshEnd: () => console.log('[Auxios] Refresh ended'),
    onTokenRefreshed: (tokens) => console.log('[Auxios] Tokens:', tokens),
    onAuthError: (error) => console.error('[Auxios] Error:', error),
  },
});
```

2. **Check browser console** for error messages

3. **Check network tab** to see actual requests/responses

4. **Test refresh endpoint manually:**
```bash
curl -X POST https://api.example.com/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-token-here"}'
```

5. **Open an issue:** https://github.com/trungpham-liam/auxios/issues

Provide:
- Auxios version
- Code snippet (remove sensitive data)
- Error messages
- API response format (sample)
