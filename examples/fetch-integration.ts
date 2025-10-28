import { Auxios } from '../src';

// Create Auxios instance
const auth = new Auxios({
  endpoints: {
    refresh: '/api/auth/refresh',
  },
  storage: 'sessionStorage',
  events: {
    onTokenExpired: () => {
      console.log('Session expired');
    },
  },
});

// Use Auxios fetch wrapper - it automatically handles:
// 1. Token injection
// 2. Token refresh on 401/403
// 3. Request queueing during refresh
// 4. Retry with new token
// 5. Network error handling

async function fetchUserData() {
  try {
    const response = await auth.fetch('https://api.example.com/user', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
}

async function createPost(title: string, content: string) {
  try {
    const response = await auth.fetch('https://api.example.com/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to create post:', error);
    throw error;
  }
}

// Skip authentication for public endpoints
async function fetchPublicPosts() {
  try {
    const response = await auth.fetch('https://api.example.com/posts/public', {
      method: 'GET',
      headers: {
        'X-Skip-Auth': 'true',
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch public posts:', error);
    throw error;
  }
}

// Upload file with authentication
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await auth.fetch('https://api.example.com/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw error;
  }
}

// Race condition example - Multiple concurrent requests
async function loadDashboardData() {
  const [user, posts, stats] = await Promise.all([
    auth.fetch('https://api.example.com/user'),
    auth.fetch('https://api.example.com/posts'),
    auth.fetch('https://api.example.com/stats'),
  ]);

  return {
    user: await user.json(),
    posts: await posts.json(),
    stats: await stats.json(),
  };
}

export { auth, fetchUserData, createPost, fetchPublicPosts, uploadFile, loadDashboardData };
