import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

let refreshPromise: Promise<string> | null = null;

const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const api: AxiosInstance = axios.create({
  baseURL: isProd ? 'https://api.sdk.vayunexsolution.com/api/v1' : '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ── Request interceptor — attach auth token + correlation ID ── */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('npc_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response interceptor — silent 401 refresh ────────────────── */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl: string = originalRequest?.url ?? '';

    // Don't attempt token refresh for auth endpoints — just reject so the
    // calling component (LoginPage, etc.) can handle the error itself.
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = localStorage.getItem('npc_refresh_token');
            if (!refreshToken) throw new Error('No refresh token');

            const response = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
              (isProd ? 'https://api.sdk.vayunexsolution.com' : '') + '/api/v1/auth/refresh',
              { refreshToken }
            );

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            localStorage.setItem('npc_access_token', accessToken);
            localStorage.setItem('npc_refresh_token', newRefreshToken);
            return accessToken;
          })();
        }

        const newAccessToken = await refreshPromise;
        refreshPromise = null;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        refreshPromise = null;
        localStorage.removeItem('npc_access_token');
        localStorage.removeItem('npc_refresh_token');
        // Only hard-redirect if we are NOT already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
