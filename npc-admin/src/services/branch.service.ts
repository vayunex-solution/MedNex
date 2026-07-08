import api from '@/lib/axios';
import type { ApiResponse, ListParams } from '@/types/api.types';
import type { Branch, CreateBranchDto, UpdateBranchDto } from '@/types/platform.types';

export const branchService = {
  async listBranches(params?: ListParams) {
    const res = await api.get<ApiResponse<Branch[]>>('/platform/branches', { params });
    return res.data;
  },

  async getBranch(uuid: string) {
    const res = await api.get<ApiResponse<Branch>>(`/platform/branches/${uuid}`);
    return res.data.data;
  },

  async createBranch(dto: CreateBranchDto) {
    const res = await api.post<ApiResponse<Branch>>('/platform/branches', dto);
    return res.data.data;
  },

  async updateBranch(uuid: string, dto: UpdateBranchDto) {
    const res = await api.put<ApiResponse<Branch>>(`/platform/branches/${uuid}`, dto);
    return res.data.data;
  },

  async deleteBranch(uuid: string) {
    await api.delete(`/platform/branches/${uuid}`);
  },

  async activateBranch(uuid: string) {
    const res = await api.post<ApiResponse<Branch>>(`/platform/branches/${uuid}/activate`);
    return res.data.data;
  },

  async suspendBranch(uuid: string) {
    const res = await api.post<ApiResponse<Branch>>(`/platform/branches/${uuid}/suspend`);
    return res.data.data;
  },

  async archiveBranch(uuid: string) {
    const res = await api.post<ApiResponse<Branch>>(`/platform/branches/${uuid}/archive`);
    return res.data.data;
  },

  async restoreBranch(uuid: string) {
    const res = await api.post<ApiResponse<Branch>>(`/platform/branches/${uuid}/restore`);
    return res.data.data;
  },

  async getBranchHealth(uuid: string) {
    const res = await api.get<ApiResponse<Record<string, unknown>>>(`/platform/branches/${uuid}/health`);
    return res.data.data;
  },

  async getBranchSummary(uuid: string) {
    const res = await api.get<ApiResponse<Record<string, unknown>>>(`/platform/branches/${uuid}/summary`);
    return res.data.data;
  },

  async updateSettings(uuid: string, settings: Record<string, unknown>) {
    const res = await api.put<ApiResponse<Branch>>(`/platform/branches/${uuid}/settings`, settings);
    return res.data.data;
  },

  async updateBranding(uuid: string, branding: Record<string, unknown>) {
    const res = await api.put<ApiResponse<Branch>>(`/platform/branches/${uuid}/branding`, branding);
    return res.data.data;
  },
};
