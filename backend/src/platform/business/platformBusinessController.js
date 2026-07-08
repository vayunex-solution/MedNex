'use strict';

const platformBusinessService = require('./platformBusiness.service');
const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');

const listBusinesses = asyncHandler(async (req, res) => {
  const result = await platformBusinessService.listBusinesses(req.query);
  return ApiResponse.paginated(
    res,
    result.rows,
    result.count,
    req.query.page || 1,
    req.query.limit || 10,
    'Businesses list retrieved successfully'
  );
});

const getBusiness = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.getBusinessByUuid(uuid);
  return ApiResponse.success(res, result, 'Business details retrieved successfully');
});

const createBusiness = asyncHandler(async (req, res) => {
  const result = await platformBusinessService.createBusiness(req.body);
  return ApiResponse.created(res, result, 'Business created successfully');
});

const updateBusiness = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.updateBusiness(uuid, req.body);
  return ApiResponse.success(res, result, 'Business updated successfully');
});

const deleteBusiness = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.deleteBusiness(uuid);
  return ApiResponse.success(res, result, 'Business soft deleted successfully');
});

const activateBusiness = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.activateBusiness(uuid);
  return ApiResponse.success(res, result, 'Business activated successfully');
});

const suspendBusiness = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.suspendBusiness(uuid);
  return ApiResponse.success(res, result, 'Business suspended successfully');
});

const archiveBusiness = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.archiveBusiness(uuid);
  return ApiResponse.success(res, result, 'Business archived successfully');
});

const restoreBusiness = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.restoreBusiness(uuid);
  return ApiResponse.success(res, result, 'Business restored successfully');
});

const getBusinessHealth = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.getBusinessHealth(uuid);
  return ApiResponse.success(res, result, 'Business health diagnostics retrieved successfully');
});

const getBusinessSummary = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.getBusinessSummary(uuid);
  return ApiResponse.success(res, result, 'Business summary analytics retrieved successfully');
});

const updateSettings = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.updateBusinessSettings(uuid, req.body);
  return ApiResponse.success(res, result, 'Business settings updated successfully');
});

const updateBranding = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBusinessService.updateBusinessBranding(uuid, req.body);
  return ApiResponse.success(res, result, 'Business branding configurations updated successfully');
});

module.exports = {
  listBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  activateBusiness,
  suspendBusiness,
  archiveBusiness,
  restoreBusiness,
  getBusinessHealth,
  getBusinessSummary,
  updateSettings,
  updateBranding,
};
