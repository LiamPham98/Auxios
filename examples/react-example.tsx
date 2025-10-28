import React, { useEffect } from 'react';
import axios from 'axios';
import { Auxios, useAuth, useTokenRefresh, useAuthFetch } from '../src';

// Create Auxios instance (typically in a separate file)
const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  storage: 'localStorage',
  multiTabSync: true,
  events: {
    onTokenExpired: () => {
      console.log('Token expired');
    },
    onAuthError: (error) => {
      console.error('Auth error:', error);
    },
  },
});

// Setup axios interceptor
const api = axios.create({
  baseURL: 'https://api.example.com',
});
auth.setupAxiosInterceptor(api);

// Login Component
function LoginForm() {
  const { login, isAuthenticated, error } = useAuth(auth);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      await login({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  if (isAuthenticated) {
    return <div>Already logged in!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
      {error && <div>Error: {error.message}</div>}
    </form>
  );
}

// Dashboard Component with Auto-Refresh
function Dashboard() {
  const { isAuthenticated, isRefreshing, logout } = useAuth(auth);
  const { authFetch, loading, error } = useAuthFetch(auth);
  const [userData, setUserData] = React.useState<any>(null);

  // Auto-refresh tokens every minute
  useTokenRefresh(auth, 60000);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    try {
      const data = await authFetch('/user/profile');
      setUserData(data);
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  if (loading || isRefreshing) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {userData && (
        <div>
          <p>Welcome, {userData.name}</p>
          <p>Email: {userData.email}</p>
        </div>
      )}
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isRefreshing } = useAuth(auth);

  if (isRefreshing) {
    return <div>Refreshing session...</div>;
  }

  if (!isAuthenticated) {
    return <div>Redirecting to login...</div>;
  }

  return <>{children}</>;
}

// App Component
function App() {
  return (
    <div>
      <h1>Auxios React Example</h1>
      <LoginForm />
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    </div>
  );
}

export default App;
