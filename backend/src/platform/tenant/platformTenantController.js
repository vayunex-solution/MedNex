'use strict';

const platformTenantService = require('./platformTenant.service');
const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');

const listTenants = asyncHandler(async (req, res) => {
  const result = await platformTenantService.listTenants(req.query);
  return ApiResponse.paginated(
    res, 
    result.rows, 
    result.count, 
    req.query.page || 1, 
    req.query.limit || 10, 
    'Tenants list retrieved successfully'
  );
});

const getTenant = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformTenantService.getTenant(uuid);
  return ApiResponse.success(res, result, 'Tenant details retrieved successfully');
});

const createTenant = asyncHandler(async (req, res) => {
  const adminUserId = req.user.id;
  const result = await platformTenantService.createTenant(req.body, adminUserId);
  return ApiResponse.created(res, result, 'Tenant provisioned and created successfully');
});

const updateTenant = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const adminUserId = req.user.id;
  const result = await platformTenantService.updateTenant(uuid, req.body, adminUserId);
  return ApiResponse.success(res, result, 'Tenant updated successfully');
});

const activateTenant = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const adminUserId = req.user.id;
  const result = await platformTenantService.transitionStatus(uuid, 'active', adminUserId);
  return ApiResponse.success(res, result, 'Tenant activated successfully');
});

const suspendTenant = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const adminUserId = req.user.id;
  const result = await platformTenantService.transitionStatus(uuid, 'suspended', adminUserId);
  return ApiResponse.success(res, result, 'Tenant suspended successfully');
});

const archiveTenant = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const adminUserId = req.user.id;
  const result = await platformTenantService.transitionStatus(uuid, 'archived', adminUserId);
  return ApiResponse.success(res, result, 'Tenant archived successfully');
});

const getTenantHealth = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformTenantService.getTenantHealth(uuid);
  return ApiResponse.success(res, result, 'Tenant health diagnostics retrieved successfully');
});

const getTenantSummary = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformTenantService.getTenantSummary(uuid);
  return ApiResponse.success(res, result, 'Tenant business summary retrieved successfully');
});

module.exports = {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  activateTenant,
  suspendTenant,
  archiveTenant,
  getTenantHealth,
  getTenantSummary,
};
