import api from '@/lib/axios';
import type { ApiResponse, ListParams } from '@/types/api.types';
import type {
  PlatformUser,
  UserProfile,
  UserDevice,
  CreateUserDto,
  UpdateUserDto,
  BulkActionDto,
  BulkAssignRoleDto,
} from '@/types/auth.types';

export const userService = {
  async listUsers(params?: ListParams) {
    const res = await api.get<ApiResponse<PlatformUser[]>>('/platform/users', { params });
    return res.data;
  },

  async getUserByUuid(uuid: string) {
    const res = await api.get<ApiResponse<PlatformUser>>(`/platform/users/${uuid}`);
    return res.data.data;
  },

  async createUser(dto: CreateUserDto) {
    const res = await api.post<ApiResponse<PlatformUser>>('/platform/users', dto);
    return res.data.data;
  },

  async updateUser(uuid: string, dto: UpdateUserDto) {
    const res = await api.put<ApiResponse<PlatformUser>>(`/platform/users/${uuid}`, dto);
    return res.data.data;
  },

  async deleteUser(uuid: string) {
    const res = await api.delete<ApiResponse<{ status: string }>>(`/platform/users/${uuid}`);
    return res.data.data;
  },

  async activateUser(uuid: string) {
    const res = await api.post<ApiResponse<PlatformUser>>(`/platform/users/${uuid}/activate`);
    return res.data.data;
  },

  async suspendUser(uuid: string) {
    const res = await api.post<ApiResponse<PlatformUser>>(`/platform/users/${uuid}/suspend`);
    return res.data.data;
  },

  async updateProfile(uuid: string, dto: Partial<UserProfile>) {
    const res = await api.put<ApiResponse<UserProfile>>(`/platform/users/${uuid}/profile`, dto);
    return res.data.data;
  },

  async getUserDevices(uuid: string) {
    const res = await api.get<ApiResponse<UserDevice[]>>(`/platform/users/${uuid}/devices`);
    return res.data.data;
  },

  async deleteUserDevice(userUuid: string, deviceUuid: string) {
    await api.delete(`/platform/users/${userUuid}/devices/${deviceUuid}`);
  },

  async getUserAudits(uuid: string) {
    const res = await api.get<ApiResponse<unknown[]>>(`/platform/users/${uuid}/audits`);
    return res.data.data;
  },

  async getUserActivities(uuid: string) {
    const res = await api.get<ApiResponse<unknown[]>>(`/platform/users/${uuid}/activities`);
    return res.data.data;
  },

  async resetPassword(uuid: string, newPassword: string) {
    await api.post(`/platform/users/${uuid}/reset-password`, { password: newPassword });
  },

  async forcePasswordReset(uuid: string) {
    await api.post(`/platform/users/${uuid}/force-password-reset`);
  },

  async verifyEmail(uuid: string) {
    await api.post(`/platform/users/${uuid}/verify-email`);
  },

  async verifyPhone(uuid: string) {
    await api.post(`/platform/users/${uuid}/verify-phone`);
  },

  async uploadAvatar(uuid: string, file: File) {
    const form = new FormData();
    form.append('avatar', file);
    const res = await api.post<ApiResponse<{ avatarUrl: string }>>(
      `/platform/users/${uuid}/avatar`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },

  /* ── Bulk actions ───────────────────────────────────────────── */
  async bulkActivate(dto: BulkActionDto) {
    const res = await api.post<ApiResponse<{ processed: number }>>('/platform/users/bulk-activate', dto);
    return res.data.data;
  },

  async bulkSuspend(dto: BulkActionDto) {
    const res = await api.post<ApiResponse<{ processed: number }>>('/platform/users/bulk-suspend', dto);
    return res.data.data;
  },

  async bulkDelete(dto: BulkActionDto) {
    const res = await api.post<ApiResponse<{ processed: number }>>('/platform/users/bulk-delete', dto);
    return res.data.data;
  },

  async bulkAssignRole(dto: BulkAssignRoleDto) {
    const res = await api.post<ApiResponse<{ processed: number }>>('/platform/users/bulk-assign-role', dto);
    return res.data.data;
  },

  async bulkExport(dto: BulkActionDto) {
    const res = await api.post('/platform/users/bulk-export', dto, { responseType: 'blob' });
    return res.data as Blob;
  },
};
