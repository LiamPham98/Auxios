import type { DecodedToken } from '../core/types';

function decode(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = base64UrlDecode(payload);
    return JSON.parse(decoded) as DecodedToken;
  } catch {
    return null;
  }
}

function getExpiry(token: string): number | null {
  const decoded = decode(token);
  return decoded?.exp ?? null;
}

function isExpired(token: string, offsetSeconds = 0): boolean {
  const expiry = getExpiry(token);
  if (!expiry) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return now >= expiry - offsetSeconds;
}

function timeUntilExpiry(token: string): number {
  const expiry = getExpiry(token);
  if (!expiry) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, expiry - now);
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }

  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
  } catch {
    return atob(base64);
  }
}

export const JWTDecoder = {
  decode,
  getExpiry,
  isExpired,
  timeUntilExpiry,
};
