/**
 * Next.js Integration Example with Auxios
 * 
 * This example demonstrates how to properly use Auxios with Next.js SSR/SSG
 * to avoid localStorage/sessionStorage undefined errors on the server side.
 */

import { Auxios } from '@trungpham.liam/auxios/core';
import { createStorage } from '@trungpham.liam/auxios/storage';

// Create Auxios instance with memory storage for SSR compatibility
const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    revoke: '/api/auth/revoke',
  },
  storage: 'memory', // Use memory storage for SSR
  multiTabSync: false, // Disable for SSR
  events: {
    onTokenRefreshed: () => {
      console.log('Token refreshed');
    },
    onAuthError: (error) => {
      console.error('Auth error:', error);
    },
  },
});

// OR create a custom storage that works in both client and server
const universalStorage = createStorage('localStorage'); // Now SSR-safe!

const authWithUniversalStorage = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    revoke: '/api/auth/revoke',
  },
  // Pass the storage adapter directly
  storage: universalStorage,
  multiTabSync: true, // Safe to enable with universal storage
});

// For client-side only components
export const useClientAuth = () => {
  const [auxios] = useState(() => {
    if (typeof window !== 'undefined') {
      // Only use localStorage on client side
      return new Auxios({
        endpoints: { refresh: '/api/auth/refresh' },
        storage: 'localStorage',
        multiTabSync: true,
      });
    }
    return auth; // Fallback to SSR instance
  });
  
  return auxios;
};

// Example API service that works with SSR
export const apiClient = {
  async get(url: string) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${await auth.getAccessToken()}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  async post(url: string, data: any) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.getAccessToken()}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
};

// For Next.js API routes
export default function handler(req, res) {
  // Server-side usage - no localStorage issues
  auth.setTokens(req.body.accessToken, req.body.refreshToken);
  
  // Your API logic here
  res.status(200).json({ message: 'Success' });
}

// Next.js app directory app/api/auth/route.js
export async function POST(request) {
  const { accessToken, refreshToken } = await request.json();
  
  // Works on server side - no localStorage issues
  await auth.setTokens(accessToken, refreshToken);
  
  return Response.json({ message: 'Tokens set successfully' });
}
