'use strict';

const platformDashboardService = require('./platformDashboard.service');
const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const result = await platformDashboardService.getDashboardData();
  return ApiResponse.success(res, result, 'Platform dashboard statistics retrieved successfully');
});

module.exports = {
  getDashboard,
};
