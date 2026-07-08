import api from '@/lib/axios';
import type { ApiResponse, ListParams } from '@/types/api.types';
import type { Business, CreateBusinessDto, UpdateBusinessDto } from '@/types/platform.types';

export const businessService = {
  async listBusinesses(params?: ListParams) {
    const res = await api.get<ApiResponse<Business[]>>('/platform/businesses', { params });
    return res.data;
  },

  async getBusiness(uuid: string) {
    const res = await api.get<ApiResponse<Business>>(`/platform/businesses/${uuid}`);
    return res.data.data;
  },

  async createBusiness(dto: CreateBusinessDto) {
    const res = await api.post<ApiResponse<Business>>('/platform/businesses', dto);
    return res.data.data;
  },

  async updateBusiness(uuid: string, dto: UpdateBusinessDto) {
    const res = await api.put<ApiResponse<Business>>(`/platform/businesses/${uuid}`, dto);
    return res.data.data;
  },

  async deleteBusiness(uuid: string) {
    await api.delete(`/platform/businesses/${uuid}`);
  },

  async activateBusiness(uuid: string) {
    const res = await api.post<ApiResponse<Business>>(`/platform/businesses/${uuid}/activate`);
    return res.data.data;
  },

  async suspendBusiness(uuid: string) {
    const res = await api.post<ApiResponse<Business>>(`/platform/businesses/${uuid}/suspend`);
    return res.data.data;
  },

  async archiveBusiness(uuid: string) {
    const res = await api.post<ApiResponse<Business>>(`/platform/businesses/${uuid}/archive`);
    return res.data.data;
  },

  async restoreBusiness(uuid: string) {
    const res = await api.post<ApiResponse<Business>>(`/platform/businesses/${uuid}/restore`);
    return res.data.data;
  },

  async getBusinessHealth(uuid: string) {
    const res = await api.get<ApiResponse<Record<string, unknown>>>(`/platform/businesses/${uuid}/health`);
    return res.data.data;
  },

  async getBusinessSummary(uuid: string) {
    const res = await api.get<ApiResponse<Record<string, unknown>>>(`/platform/businesses/${uuid}/summary`);
    return res.data.data;
  },

  async updateSettings(uuid: string, settings: Record<string, unknown>) {
    const res = await api.put<ApiResponse<Business>>(`/platform/businesses/${uuid}/settings`, settings);
    return res.data.data;
  },

  async updateBranding(uuid: string, branding: Record<string, unknown>) {
    const res = await api.put<ApiResponse<Business>>(`/platform/businesses/${uuid}/branding`, branding);
    return res.data.data;
  },
};
