import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// -------------------------------------------------------------------
// Token refresh mutex — prevents parallel 401s from each firing a
// separate refresh request (which would invalidate the others when
// the backend uses refresh-token rotation).
// -------------------------------------------------------------------
let refreshPromise: Promise<string> | null = null;

function clearSession(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  refreshPromise = null;
  // Use history.replaceState so React Router keeps control; avoid
  // redirect loops by only navigating when not already on login page.
  if (!window.location.pathname.startsWith('/auth/login')) {
    window.location.replace('/auth/login');
  }
}

async function refreshAccessToken(): Promise<string> {
  // Re-use an in-flight refresh rather than starting a new one.
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token');
    const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
    localStorage.setItem('access_token', data.access);
    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
    return data.access as string;
  })().finally(() => {
    // Always clear the mutex so the next failure can try again.
    refreshPromise = null;
  });

  return refreshPromise;
}

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Only attempt refresh once per request and only for 401 responses.
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearSession();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
