'use strict';

const platformBranchService = require('./platformBranch.service');
const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');

const listBranches = asyncHandler(async (req, res) => {
  const result = await platformBranchService.listBranches(req.query);
  return ApiResponse.paginated(
    res,
    result.rows,
    result.count,
    req.query.page || 1,
    req.query.limit || 10,
    'Branches list retrieved successfully'
  );
});

const getBranch = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.getBranchByUuid(uuid);
  return ApiResponse.success(res, result, 'Branch details retrieved successfully');
});

const createBranch = asyncHandler(async (req, res) => {
  const result = await platformBranchService.createBranch(req.body);
  return ApiResponse.created(res, result, 'Branch created successfully');
});

const updateBranch = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.updateBranch(uuid, req.body);
  return ApiResponse.success(res, result, 'Branch updated successfully');
});

const deleteBranch = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.deleteBranch(uuid);
  return ApiResponse.success(res, result, 'Branch soft deleted successfully');
});

const activateBranch = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.activateBranch(uuid);
  return ApiResponse.success(res, result, 'Branch activated successfully');
});

const suspendBranch = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.suspendBranch(uuid);
  return ApiResponse.success(res, result, 'Branch suspended successfully');
});

const archiveBranch = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.archiveBranch(uuid);
  return ApiResponse.success(res, result, 'Branch archived successfully');
});

const restoreBranch = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.restoreBranch(uuid);
  return ApiResponse.success(res, result, 'Branch restored successfully');
});

const getBranchHealth = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.getBranchHealth(uuid);
  return ApiResponse.success(res, result, 'Branch health diagnostics retrieved successfully');
});

const getBranchSummary = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.getBranchSummary(uuid);
  return ApiResponse.success(res, result, 'Branch summary analytics retrieved successfully');
});

const updateSettings = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.updateBranchSettings(uuid, req.body);
  return ApiResponse.success(res, result, 'Branch settings updated successfully');
});

const updateBranding = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformBranchService.updateBranchBranding(uuid, req.body);
  return ApiResponse.success(res, result, 'Branch branding configurations updated successfully');
});

module.exports = {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  activateBranch,
  suspendBranch,
  archiveBranch,
  restoreBranch,
  getBranchHealth,
  getBranchSummary,
  updateSettings,
  updateBranding,
};
