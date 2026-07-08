import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type {
  LoginCredentials,
  LoginResponse,
  ApiKey,
  Session,
} from '@/types/auth.types';

export const authService = {
  async login(credentials: LoginCredentials) {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return res.data.data;
  },

  async refresh(refreshToken: string) {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    return res.data.data;
  },

  async logout() {
    await api.post('/auth/logout');
  },

  async logoutAll() {
    await api.post('/auth/logout-all');
  },

  async getSessions() {
    const res = await api.get<ApiResponse<Session[]>>('/auth/sessions');
    return res.data.data;
  },

  async revokeSession(uuid: string) {
    await api.delete(`/auth/sessions/${uuid}`);
  },

  async createApiKey(name: string, expiresAt?: string) {
    const res = await api.post<ApiResponse<ApiKey & { key: string }>>('/auth/api-keys', {
      name,
      expiresAt,
    });
    return res.data.data;
  },

  async listApiKeys() {
    const res = await api.get<ApiResponse<ApiKey[]>>('/auth/api-keys');
    return res.data.data;
  },

  async revokeApiKey(uuid: string) {
    await api.delete(`/auth/api-keys/${uuid}`);
  },
};
