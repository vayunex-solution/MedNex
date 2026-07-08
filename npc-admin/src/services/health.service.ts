import api from '@/lib/axios';
import type { HealthCheckResult } from '@/types/system.types';

export const healthService = {
  async getHealth() {
    const res = await api.get<HealthCheckResult>('/platform/health');
    return res.data;
  },
};
