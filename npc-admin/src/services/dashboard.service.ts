import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { DashboardStats } from '@/types/system.types';

export const dashboardService = {
  async getDashboard() {
    const res = await api.get<ApiResponse<DashboardStats>>('/platform/dashboard');
    return res.data.data;
  },

  async getCapabilities() {
    const res = await api.get<ApiResponse<Record<string, unknown>>>('/platform/capabilities');
    return res.data.data;
  },
};
