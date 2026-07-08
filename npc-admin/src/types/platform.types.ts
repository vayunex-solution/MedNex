export type TenantStatus = 'active' | 'suspended' | 'archived' | 'inactive';
export type BusinessStatus = 'active' | 'inactive' | 'suspended' | 'archived';
export type BranchStatus = 'active' | 'inactive' | 'suspended' | 'archived';

export interface Tenant {
  uuid: string;
  name: string;
  slug: string;
  email: string | null;
  domain: string | null;
  subdomain: string | null;
  isActive: boolean;
  status: TenantStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantHealth {
  tenantUuid: string;
  businessCount: number;
  branchCount: number;
  userCount: number;
  activeUserCount: number;
  subscriptionStatus: string | null;
}

export interface CreateTenantDto {
  tenantName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
}

export interface UpdateTenantDto {
  name?: string;
  email?: string;
  domain?: string;
}

export interface Business {
  uuid: string;
  tenantId: number;
  name: string;
  legalName: string | null;
  displayName: string | null;
  businessCode: string | null;
  slug: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  businessType: string | null;
  currency: string;
  timezone: string;
  locale: string;
  language: string;
  website: string | null;
  taxNumber: string | null;
  registrationNumber: string | null;
  status: BusinessStatus;
  isActive: boolean;
  isDeleted: boolean;
  archivedAt: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  uuid: string;
  tenantId: number;
  businessId: number;
  name: string;
  branchCode: string | null;
  slug: string;
  email: string | null;
  phone: string | null;
  status: BranchStatus;
  isActive: boolean;
  isDeleted: boolean;
  archivedAt: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessDto {
  tenantUuid: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  businessType?: string;
  currency?: string;
  timezone?: string;
}

export interface UpdateBusinessDto {
  name?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export interface CreateBranchDto {
  businessUuid: string;
  name: string;
  branchCode?: string;
  email?: string;
  phone?: string;
}

export interface UpdateBranchDto {
  name?: string;
  email?: string;
  phone?: string;
}
