'use strict';

const identityService = require('./identity.service');
const userSessionRepository = require('./userSession.repository');
const apiKeyRepository = require('./apiKey.repository');
const ApiKeyScope = require('./apiKeyScope.model');
const Permission = require('../rbac/permission.model');
const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { BadRequestError, UnauthorizedError, ForbiddenError } = require('../../shared/errors/AppError');

// Login controller
const login = asyncHandler(async (req, res) => {
  const { email, password, deviceFingerprint } = req.body;
  if (!email || !password) {
    throw new BadRequestError('Email and password are required');
  }

  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'] || '';

  const result = await identityService.login(email, password, ipAddress, userAgent, deviceFingerprint);
  return ApiResponse.success(res, result, 'Authentication response resolved');
});

// Select Workspace controller
const selectWorkspace = asyncHandler(async (req, res) => {
  const { selectionToken, branchUuid, deviceFingerprint } = req.body;
  if (!selectionToken || !branchUuid) {
    throw new BadRequestError('selectionToken and branchUuid are required');
  }

  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'] || '';

  const result = await identityService.selectWorkspace(selectionToken, branchUuid, ipAddress, userAgent, deviceFingerprint);
  return ApiResponse.success(res, result, 'Workspace session established');
});

// Refresh Token rotation controller
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new BadRequestError('RefreshToken is required');
  }

  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'] || '';

  const result = await identityService.rotateToken(refreshToken, ipAddress, userAgent);
  return ApiResponse.success(res, result, 'Access token refreshed successfully');
});

// Logout controller
const logout = asyncHandler(async (req, res) => {
  const sessionId = req.user.sessionId; // Session UUID from JWT
  if (!sessionId) {
    throw new UnauthorizedError('Active session not found');
  }

  await identityService.logout(sessionId);
  return ApiResponse.success(res, null, 'Logged out successfully');
});

// Logout all controller
const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await identityService.logoutAll(userId);
  return ApiResponse.success(res, null, 'All sessions terminated successfully');
});

// List User Sessions controller (exposing only UUIDs)
const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const sessions = await userSessionRepository.findAll({ userId, isActive: true });
  
  const publicSessions = sessions.map(s => ({
    uuid: s.uuid,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    deviceFingerprint: s.deviceFingerprint,
    lastActiveAt: s.lastActiveAt || s.createdAt,
    status: s.status,
  }));

  return ApiResponse.success(res, publicSessions, 'Active sessions retrieved');
});

// Terminate Session controller
const terminateSession = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  if (!uuid) {
    throw new BadRequestError('Session UUID is required');
  }

  // Ensure user owns this session
  const session = await userSessionRepository.findOne({ uuid });
  if (!session || session.userId !== req.user.id) {
    throw new ForbiddenError('Unauthorized to terminate this session');
  }

  await identityService.logout(uuid);
  return ApiResponse.success(res, null, 'Session terminated');
});

// Password recovery controllers
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new BadRequestError('Email is required');
  }

  // Generates dummy link in tests/sandbox
  const token = crypto.randomUUID ? crypto.randomUUID() : 'reset_' + Date.now();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { User: UserModel } = require('../../models');
  const user = await UserModel.findOne({ where: { email, isDeleted: false } });
  if (user) {
    const passwordResetRepository = require('./passwordReset.repository');
    await passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
    });
  }

  // Respond success regardless of existence to prevent enumeration attacks
  return ApiResponse.success(res, { token }, 'Password reset link sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    throw new BadRequestError('Token and newPassword are required');
  }

  await identityService.resetPassword(token, newPassword);
  return ApiResponse.success(res, null, 'Password reset successful. All active sessions invalidated.');
});

// API Keys controllers
const createApiKey = asyncHandler(async (req, res) => {
  const { label, scopes = [] } = req.body; // scopes are permission names
  if (!label) {
    throw new BadRequestError('Label is required');
  }

  const tenantId = req.user.tenantId; // Derived from context/JWT
  const rawKey = 'nex_' + crypto.randomUUID().replace(/-/g, '');
  const prefix = rawKey.substring(0, 10);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await apiKeyRepository.create({
    tenantId,
    prefix,
    keyHash,
    label,
  });

  // Normalize scopes inside database relation table
  for (const s of scopes) {
    const perm = await Permission.findOne({ where: { name: s } });
    if (perm) {
      await ApiKeyScope.create({
        apiKeyId: apiKey.id,
        permissionId: perm.id,
      });
    }
  }

  return ApiResponse.success(res, {
    uuid: apiKey.uuid,
    apiKey: rawKey,
    label: apiKey.label,
  }, 'API Key generated successfully');
});

const listApiKeys = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const keys = await apiKeyRepository.findAll({ tenantId, isActive: true });
  
  const publicKeys = keys.map(k => ({
    uuid: k.uuid,
    prefix: k.prefix,
    label: k.label,
    lastUsedAt: k.lastUsedAt,
    expiresAt: k.expiresAt,
  }));

  return ApiResponse.success(res, publicKeys, 'API Keys retrieved');
});

const revokeApiKey = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  if (!uuid) {
    throw new BadRequestError('API key UUID is required');
  }

  const key = await apiKeyRepository.findOne({ uuid });
  if (!key || key.tenantId !== req.user.tenantId) {
    throw new ForbiddenError('Unauthorized to revoke this API key');
  }

  await apiKeyRepository.update(key.id, {
    isActive: false,
    revokedAt: new Date(),
    revokedReason: 'Revoked by user request',
  });

  return ApiResponse.success(res, null, 'API Key revoked');
});

module.exports = {
  login,
  selectWorkspace,
  refresh,
  logout,
  logoutAll,
  getSessions,
  terminateSession,
  requestPasswordReset,
  resetPassword,
  createApiKey,
  listApiKeys,
  revokeApiKey,
};
