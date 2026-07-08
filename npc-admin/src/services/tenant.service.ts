import api from '@/lib/axios';
import type { ApiResponse, ListParams } from '@/types/api.types';
import type { Tenant, CreateTenantDto, UpdateTenantDto, TenantHealth } from '@/types/platform.types';

export const tenantService = {
  async listTenants(params?: ListParams) {
    const res = await api.get<ApiResponse<Tenant[]>>('/platform/tenants', { params });
    return res.data;
  },

  async getTenant(uuid: string) {
    const res = await api.get<ApiResponse<Tenant>>(`/platform/tenants/${uuid}`);
    return res.data.data;
  },

  async createTenant(dto: CreateTenantDto) {
    const res = await api.post<ApiResponse<Tenant>>('/platform/tenants', dto);
    return res.data.data;
  },

  async updateTenant(uuid: string, dto: UpdateTenantDto) {
    const res = await api.put<ApiResponse<Tenant>>(`/platform/tenants/${uuid}`, dto);
    return res.data.data;
  },

  async activateTenant(uuid: string) {
    const res = await api.post<ApiResponse<Tenant>>(`/platform/tenants/${uuid}/activate`);
    return res.data.data;
  },

  async suspendTenant(uuid: string) {
    const res = await api.post<ApiResponse<Tenant>>(`/platform/tenants/${uuid}/suspend`);
    return res.data.data;
  },

  async archiveTenant(uuid: string) {
    const res = await api.post<ApiResponse<Tenant>>(`/platform/tenants/${uuid}/archive`);
    return res.data.data;
  },

  async getTenantHealth(uuid: string) {
    const res = await api.get<ApiResponse<TenantHealth>>(`/platform/tenants/${uuid}/health`);
    return res.data.data;
  },

  async getTenantSummary(uuid: string) {
    const res = await api.get<ApiResponse<Record<string, unknown>>>(`/platform/tenants/${uuid}/summary`);
    return res.data.data;
  },
};
