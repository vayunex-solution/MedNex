'use strict';

const platformUserService = require('./platformUser.service');
const platformUserProfileService = require('./platformUserProfile.service');
const platformUserPreferenceService = require('./platformUserPreference.service');
const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');

// Multer or file payload helper for avatar uploads
const uploadAvatar = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No avatar image file uploaded.' });
  }

  const result = await platformUserProfileService.uploadAvatar(uuid, req.file);
  return ApiResponse.success(res, result, 'Avatar uploaded successfully.');
});

const listUsers = asyncHandler(async (req, res) => {
  const query = req.query;
  const result = await platformUserService.listUsers(query);
  return ApiResponse.paginated(
    res,
    result.rows,
    result.count,
    query.page || 1,
    query.limit || 20,
    'Users fetched successfully.'
  );
});

const getUserByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.getUserByUuid(uuid);
  return ApiResponse.success(res, result, 'User detail fetched successfully.');
});

const createUser = asyncHandler(async (req, res) => {
  const result = await platformUserService.createUser(req.body);
  return ApiResponse.success(res, result, 'User provisioned successfully.', 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.updateUser(uuid, req.body);
  return ApiResponse.success(res, result, 'User details updated successfully.');
});

const deleteUser = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.deleteUser(uuid);
  return ApiResponse.success(res, result, 'User soft deleted successfully.');
});

const activateUser = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.activateUser(uuid);
  return ApiResponse.success(res, result, 'User activated successfully.');
});

const suspendUser = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.suspendUser(uuid);
  return ApiResponse.success(res, result, 'User suspended successfully.');
});

const updateProfile = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserProfileService.updateProfile(uuid, req.body);
  return ApiResponse.success(res, result, 'User profile updated successfully.');
});

const updatePreferences = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserPreferenceService.updatePreferences(uuid, req.body.preferences || []);
  return ApiResponse.success(res, result, 'User preferences updated successfully.');
});

const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserPreferenceService.updateNotificationPreferences(uuid, req.body.preferences || []);
  return ApiResponse.success(res, result, 'User notification preferences updated successfully.');
});

const getUserDevices = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.getUserDevices(uuid);
  return ApiResponse.success(res, result, 'User devices list fetched successfully.');
});

const deleteUserDevice = asyncHandler(async (req, res) => {
  const { uuid, deviceUuid } = req.params;
  const result = await platformUserService.deleteUserDevice(uuid, deviceUuid);
  return ApiResponse.success(res, result, 'User device fingerprint revoked successfully.');
});

const getUserAudits = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.getUserAudits(uuid);
  return ApiResponse.success(res, result, 'User audits trail fetched successfully.');
});

const getUserActivities = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.getUserActivities(uuid);
  return ApiResponse.success(res, result, 'User login activities fetched successfully.');
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { token } = req.body;
  const result = await platformUserService.verifyEmail(uuid, token);
  return ApiResponse.success(res, result, 'User email verified successfully.');
});

const verifyPhone = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { token } = req.body;
  const result = await platformUserService.verifyPhone(uuid, token);
  return ApiResponse.success(res, result, 'User phone verified successfully.');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { password } = req.body;
  const result = await platformUserService.resetPassword(uuid, password);
  return ApiResponse.success(res, result, 'User password reset successfully.');
});

const forcePasswordReset = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const result = await platformUserService.forcePasswordReset(uuid);
  return ApiResponse.success(res, result, 'Forced password reset requested.');
});

const bulkActivate = asyncHandler(async (req, res) => {
  const result = await platformUserService.bulkActivate(req.body.uuids || []);
  return ApiResponse.success(res, result, 'Bulk activation process completed.');
});

const bulkSuspend = asyncHandler(async (req, res) => {
  const result = await platformUserService.bulkSuspend(req.body.uuids || []);
  return ApiResponse.success(res, result, 'Bulk suspension process completed.');
});

const bulkDelete = asyncHandler(async (req, res) => {
  const result = await platformUserService.bulkDelete(req.body.uuids || []);
  return ApiResponse.success(res, result, 'Bulk delete process completed.');
});

const bulkAssignRole = asyncHandler(async (req, res) => {
  const result = await platformUserService.bulkAssignRole(req.body.uuids || [], req.body.role);
  return ApiResponse.success(res, result, 'Bulk role assignment process completed.');
});

const bulkExport = asyncHandler(async (req, res) => {
  const result = await platformUserService.bulkExport(req.body.uuids || []);
  return ApiResponse.success(res, result, 'Bulk export process completed.');
});

module.exports = {
  listUsers,
  getUserByUuid,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  suspendUser,
  updateProfile,
  updatePreferences,
  updateNotificationPreferences,
  uploadAvatar,
  getUserDevices,
  deleteUserDevice,
  getUserAudits,
  getUserActivities,
  verifyEmail,
  verifyPhone,
  resetPassword,
  forcePasswordReset,
  bulkActivate,
  bulkSuspend,
  bulkDelete,
  bulkAssignRole,
  bulkExport,
};
