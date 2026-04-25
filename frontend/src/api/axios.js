import axios from 'axios';

const API = axios.create({
  baseURL: 'http://grc.com:8000/api/',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT token ──────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('grc_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 by refreshing ──
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // If we get a 401 and haven't already retried, try to refresh
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('grc_refresh_token');

      if (refresh) {
        try {
          const res = await axios.post('http://grc.com:8000/api/auth/token/refresh/', {
            refresh,
          });
          const newAccess = res.data.access;
          localStorage.setItem('grc_access_token', newAccess);

          // If the server rotated the refresh token, store the new one
          if (res.data.refresh) {
            localStorage.setItem('grc_refresh_token', res.data.refresh);
          }

          original.headers.Authorization = `Bearer ${newAccess}`;
          return API(original);
        } catch {
          // Refresh failed — clear tokens and redirect to login
          localStorage.removeItem('grc_access_token');
          localStorage.removeItem('grc_refresh_token');
          localStorage.removeItem('grc_user');
          window.location.href = '/login';
        }
      } else {
        // No refresh token available — session invalid, force logout
        localStorage.removeItem('grc_access_token');
        localStorage.removeItem('grc_refresh_token');
        localStorage.removeItem('grc_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
