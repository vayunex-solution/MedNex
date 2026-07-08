export type UserType =
  | 'super_admin'
  | 'developer'
  | 'tenant_owner'
  | 'business_owner'
  | 'branch_manager'
  | 'employee'
  | 'service_account'
  | 'system'
  | 'bot'
  | 'customer';

export type UserStatus =
  | 'pending'
  | 'email_pending'
  | 'phone_pending'
  | 'mfa_pending'
  | 'active'
  | 'locked'
  | 'suspended'
  | 'archived'
  | 'deleted';

export interface PlatformUser {
  uuid: string;
  name: string;
  email: string;
  role: string;
  userType: UserType;
  status: UserStatus;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  isMfaEnabled: boolean;
  failedAttempts: number;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  passwordChangedAt: string | null;
  version: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uuid: string;
  userId: number;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  bio: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  country: string | null;
  language: string;
  timezone: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDevice {
  uuid: string;
  userId: number;
  deviceName: string;
  deviceType: string;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActiveAt: string | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: string;
  userType?: UserType;
  tenantUuid: string;
  businessUuid: string;
  branchUuid: string;
}

export interface UpdateUserDto {
  name?: string;
  role?: string;
  userType?: UserType;
}

export interface BulkActionDto {
  uuids: string[];
}

export interface BulkAssignRoleDto extends BulkActionDto {
  role: string;
}

export interface AuthUser {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: string;
  userType: UserType;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiKey {
  uuid: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface Session {
  uuid: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}
