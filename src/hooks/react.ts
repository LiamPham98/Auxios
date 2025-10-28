import { useCallback, useEffect, useRef, useState } from 'react';
import type { Auxios } from '../auxios';
import type { AuthError, TokenPair } from '../core/types';

export function useAuth(auxios: Auxios) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => auxios.isAuthenticated());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(auxios.isAuthenticated());
    };

    auxios.updateConfig({
      events: {
        onTokenRefreshed: () => {
          setIsAuthenticated(true);
          setError(null);
        },
        onTokenExpired: () => {
          setIsAuthenticated(false);
        },
        onAuthError: (err) => {
          setError(err);
          setIsAuthenticated(false);
        },
        onLogout: () => {
          setIsAuthenticated(false);
          setError(null);
        },
        onRefreshStart: () => {
          setIsRefreshing(true);
        },
        onRefreshEnd: () => {
          setIsRefreshing(false);
        },
      },
    });

    checkAuth();
  }, [auxios]);

  const login = useCallback(
    async (tokens: TokenPair) => {
      await auxios.setTokens(tokens);
      setIsAuthenticated(true);
      setError(null);
    },
    [auxios],
  );

  const logout = useCallback(async () => {
    await auxios.logout();
    setIsAuthenticated(false);
    setError(null);
  }, [auxios]);

  const refreshTokens = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await auxios.refreshTokens();
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      setError(err as AuthError);
      setIsAuthenticated(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [auxios]);

  return {
    isAuthenticated,
    isRefreshing,
    error,
    login,
    logout,
    refreshTokens,
  };
}

export function useTokenRefresh(auxios: Auxios, intervalMs = 60000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkAndRefresh = async () => {
      if (auxios.isAuthenticated()) {
        try {
          await auxios.refreshTokens();
        } catch {
          // Error handled by event callbacks
        }
      }
    };

    intervalRef.current = setInterval(checkAndRefresh, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [auxios, intervalMs]);
}

export function useAuthFetch(auxios: Auxios) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authFetch = useCallback(
    async <T = unknown>(url: string, options?: RequestInit): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const response = await auxios.fetch(url, options);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as T;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [auxios],
  );

  return { authFetch, loading, error };
}
