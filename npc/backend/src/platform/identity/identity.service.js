'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../../models');

const tenantRepository = require('../tenant/tenant.repository');
const businessRepository = require('../business/business.repository');
const branchRepository = require('../branch/branch.repository');
const roleRepository = require('../rbac/role.repository');
const permissionRepository = require('../rbac/permission.repository');

const userMembershipRepository = require('./userMembership.repository');
const userSessionRepository = require('./userSession.repository');
const refreshTokenRepository = require('./refreshToken.repository');
const loginRateLimitRepository = require('./loginRateLimit.repository');
const apiKeyRepository = require('./apiKey.repository');
const apiKeyScopeRepository = require('./apiKeyScope.repository');
const passwordResetRepository = require('./passwordReset.repository');

const BaseService = require('../../shared/core/base.service');
const { UnauthorizedError, ForbiddenError, BadRequestError } = require('../../shared/errors/AppError');
const auditService = require('../audit/audit.service');

const JWT_SECRET = process.env.JWT_SECRET || 'nex_jwt_secret_default_key_9988';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const IDLE_TIMEOUT_MINUTES = 30;

class IdentityService extends BaseService {
  constructor() {
    super(userSessionRepository);
  }

  /**
   * Cryptographically hash string using SHA-256
   */
  _sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Check and enforce MySQL rate limiting for authentication attempts
   */
  async _checkRateLimit(ipAddress, email) {
    const attemptKey = this._sha256(`${ipAddress}:${email}`);
    const record = await loginRateLimitRepository.findOne({ attemptKey });
    
    if (record && record.lockExpiry && record.lockExpiry > new Date()) {
      const remainingMs = record.lockExpiry.getTime() - Date.now();
      const mins = Math.ceil(remainingMs / 1000 / 60);
      throw new ForbiddenError(`Too many failed login attempts. Please try again after ${mins} minutes.`);
    }
    return record;
  }

  /**
   * Record a failed login attempt for rate limiting
   */
  async _recordFailedAttempt(ipAddress, email) {
    const attemptKey = this._sha256(`${ipAddress}:${email}`);
    const record = await loginRateLimitRepository.findOne({ attemptKey });

    if (!record) {
      await loginRateLimitRepository.create({
        attemptKey,
        attemptsCount: 1,
      });
    } else {
      const newAttempts = record.attemptsCount + 1;
      const updates = { attemptsCount: newAttempts };
      
      if (newAttempts >= 5) {
        updates.lockExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      }
      await loginRateLimitRepository.update(record.id, updates);
    }
  }

  /**
   * Reset rate limit attempts count on successful login
   */
  async _resetRateLimit(ipAddress, email) {
    const attemptKey = this._sha256(`${ipAddress}:${email}`);
    await loginRateLimitRepository.bulkDelete({ attemptKey });
  }

  /**
   * Verify session timeouts (Idle & Absolute)
   */
  async verifySessionActive(session) {
    if (!session || !session.isActive || session.status !== 'active') {
      return false;
    }

    const now = new Date();
    
    // Absolute expiration check
    if (session.expiresAt && session.expiresAt < now) {
      await userSessionRepository.update(session.id, { isActive: false, status: 'expired' });
      return false;
    }

    // Idle expiration check
    const lastActive = session.lastActiveAt || session.createdAt;
    const idleThreshold = lastActive.getTime() + IDLE_TIMEOUT_MINUTES * 60 * 1000;
    if (now.getTime() > idleThreshold) {
      await userSessionRepository.update(session.id, { isActive: false, status: 'expired' });
      return false;
    }

    // Update lastActiveAt to prevent idle timeout
    await userSessionRepository.update(session.id, { lastActiveAt: now });
    return true;
  }

  /**
   * Generate access and refresh tokens for verified session
   */
  async _issueTokens(user, session, membership, branch, business, tenant) {
    // Resolve role name
    const roleRecord = membership ? await roleRepository.findOne({ id: membership.roleId }) : null;
    const roleName = user.role === 'super_admin' ? 'super_admin' : (roleRecord ? roleRecord.name : 'guest');

    // Access token stores ONLY identity metadata (UUIDs and IDs)
    const payload = {
      id: user.id,
      email: user.email,
      role: roleName,
      tenantUuid: tenant ? tenant.uuid : '',
      businessUuid: business ? business.uuid : '',
      branchUuid: branch ? branch.uuid : '',
      tenantId: tenant ? tenant.id : null,
      businessId: business ? business.id : null,
      branchId: branch ? branch.id : null,
      sessionId: session.uuid,
      deviceId: session.deviceFingerprint,
      tokenVersion: 1,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    
    // Generate refresh token and save hash
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this._sha256(rawRefreshToken);
    
    await refreshTokenRepository.create({
      userId: user.id,
      sessionId: session.id,
      token: tokenHash,
      familyRootHash: tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  /**
   * Complete Login flow
   */
  async login(email, password, ipAddress, userAgent, deviceFingerprint) {
    await this._checkRateLimit(ipAddress, email);

    // Fetch user from DB
    const user = await User.findOne({ where: { email, isDeleted: false } });
    
    const telemetryCollector = require('../../shared/telemetry');

    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const mins = Math.ceil(remainingMs / 1000 / 60);
      throw new ForbiddenError(`User account is locked due to multiple failed login attempts. Please try again after ${mins} minutes.`);
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await this._recordFailedAttempt(ipAddress, email);
      
      telemetryCollector.increment('failedLogins');

      if (user) {
        const failedAttempts = (user.failedAttempts || 0) + 1;
        const updates = { failedAttempts };
        
        if (failedAttempts >= 15) {
          updates.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours lockout
          telemetryCollector.increment('accountLockouts');
        } else if (failedAttempts >= 10) {
          updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lockout
          telemetryCollector.increment('accountLockouts');
        } else if (failedAttempts >= 5) {
          updates.lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes lockout
          telemetryCollector.increment('accountLockouts');
        }
        
        await user.update(updates);
      }
      
      // Log to LoginHistory
      const LoginHistory = require('./loginHistory.model');
      await LoginHistory.create({
        userId: user ? user.id : null,
        emailUsed: email,
        ipAddress,
        userAgent,
        status: 'failed',
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenError('User account is suspended');
    }

    // Reset rate limiter
    await this._resetRateLimit(ipAddress, email);

    // Fetch User Memberships
    const memberships = await userMembershipRepository.findMany({ userId: user.id, status: 'active' });
    
    if (memberships.length === 0 && user.role !== 'super_admin') {
      throw new ForbiddenError('User has no active organization memberships');
    }

    // If multiple memberships exist, trigger Workspace Selection flow
    if (memberships.length > 1) {
      const workspaceList = [];
      for (const m of memberships) {
        const tenant = await tenantRepository.findOne({ id: m.tenantId });
        if (tenant && (tenant.status !== 'active' || !tenant.isActive)) {
          continue; // Skip suspended/inactive tenants
        }
        const business = await businessRepository.findOne({ id: m.businessId });
        const branch = await branchRepository.findOne({ id: m.branchId });
        const role = await roleRepository.findOne({ id: m.roleId });
        if (tenant && branch) {
          workspaceList.push({
            tenantName: tenant.name,
            tenantUuid: tenant.uuid,
            businessName: business ? business.name : '',
            businessUuid: business ? business.uuid : '',
            branchName: branch.name,
            branchUuid: branch.uuid,
            role: role ? role.name : '',
          });
        }
      }

      if (workspaceList.length === 0 && user.role !== 'super_admin') {
        throw new ForbiddenError('Tenant account is suspended or inactive');
      }

      // Generate a temporary Workspace Selection Token (valid for 5 mins)
      const workspaceSelectionToken = jwt.sign({
        userId: user.id,
        selectionMode: true,
      }, JWT_SECRET, { expiresIn: '5m' });

      return {
        requiresSelection: true,
        workspaceSelectionToken,
        workspaces: workspaceList,
      };
    }

    // Single Membership or Super Admin: Complete login directly
    const membership = memberships[0];
    const tenant = membership ? await tenantRepository.findOne({ id: membership.tenantId }) : null;
    if (tenant && (tenant.status !== 'active' || !tenant.isActive) && user.role !== 'super_admin') {
      throw new ForbiddenError('Tenant account is suspended or inactive');
    }
    const business = membership ? await businessRepository.findOne({ id: membership.businessId }) : null;
    const branch = membership ? await branchRepository.findOne({ id: membership.branchId }) : null;

    // Create session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours absolute duration
    const session = await userSessionRepository.create({
      userId: user.id,
      deviceFingerprint,
      ipAddress,
      userAgent,
      lastActiveAt: new Date(),
      expiresAt,
    });

    // Update user login statistics
    await user.update({
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
      failedAttempts: 0,
      lockedUntil: null
    });

    telemetryCollector.increment('successfulLogins');

    const tokens = await this._issueTokens(user, session, membership, branch, business, tenant);

    // Record LoginHistory
    const LoginHistory = require('./loginHistory.model');
    await LoginHistory.create({
      userId: user.id,
      emailUsed: email,
      ipAddress,
      userAgent,
      status: 'success',
    });

    // Log Platform/Tenant audit trail
    if (tenant && branch) {
      auditService.logTenantAction(tenant.id, user.id, 'auth:login', 'auth', `User logged in successfully to branch ${branch.name}`);
    } else {
      auditService.logPlatformAction(user.id, 'auth:login', 'auth', `Super admin logged in successfully`);
    }

    return {
      requiresSelection: false,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        uuid: user.id, // Legacy compatibility
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Complete Workspace/Branch Selection
   */
  async selectWorkspace(selectionToken, branchUuid, ipAddress, userAgent, deviceFingerprint) {
    let decoded = null;
    try {
      decoded = jwt.verify(selectionToken, JWT_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired workspace selection token');
    }

    if (!decoded.userId || !decoded.selectionMode) {
      throw new BadRequestError('Invalid selection token payload');
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      throw new ForbiddenError('User not found or suspended');
    }

    // Resolve target branch by UUID
    const branch = await branchRepository.findOne({ uuid: branchUuid, isDeleted: false, isActive: true });
    if (!branch) {
      throw new BadRequestError('Selected branch does not exist');
    }

    // Verify membership exists
    const membership = await userMembershipRepository.findOne({
      userId: user.id,
      branchId: branch.id,
      status: 'active',
    });

    if (!membership) {
      throw new ForbiddenError('You do not have permission to access this branch');
    }

    const tenant = await tenantRepository.findOne({ id: branch.tenantId });
    const business = await businessRepository.findOne({ id: branch.businessId });

    // Create active session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await userSessionRepository.create({
      userId: user.id,
      deviceFingerprint,
      ipAddress,
      userAgent,
      lastActiveAt: new Date(),
      expiresAt,
    });

    // Update user login statistics
    await user.update({
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
      failedAttempts: 0,
    });

    const tokens = await this._issueTokens(user, session, membership, branch, business, tenant);

    // Record LoginHistory
    const LoginHistory = require('./loginHistory.model');
    await LoginHistory.create({
      userId: user.id,
      emailUsed: user.email,
      ipAddress,
      userAgent,
      status: 'success',
    });

    auditService.logTenantAction(tenant.id, user.id, 'auth:login', 'auth', `Workspace branch selected: ${branch.name}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        uuid: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Refresh Token Rotation with replay hijack protection
   */
  async rotateToken(rawRefreshToken, ipAddress, userAgent) {
    const incomingHash = this._sha256(rawRefreshToken);
    
    // Find refresh token
    const tokenRecord = await refreshTokenRepository.findOne({ token: incomingHash });
    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check for replay attack: is the token already revoked?
    if (tokenRecord.isRevoked) {
      // Replay Hijack Triggered! Invalidate the entire family tree
      await refreshTokenRepository.bulkUpdate(
        { familyRootHash: tokenRecord.familyRootHash },
        { isRevoked: true }
      );

      // Kill the session
      if (tokenRecord.sessionId) {
        await userSessionRepository.update(tokenRecord.sessionId, { isActive: false, status: 'terminated' });
      }

      auditService.logPlatformAction(tokenRecord.userId, 'security:token_replay_detected', 'auth', `Token reuse warning: Session revoked for user ${tokenRecord.userId}`);
      throw new ForbiddenError('Security Alert: Refresh token reuse detected. All active sessions revoked.');
    }

    // Check expiry
    if (tokenRecord.expiresAt < new Date()) {
      await refreshTokenRepository.update(tokenRecord.id, { isRevoked: true });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Validate User & Session
    const user = await User.findByPk(tokenRecord.userId);
    const session = await userSessionRepository.findOne({ id: tokenRecord.sessionId });
    
    if (!user || !user.isActive || !session || !session.isActive) {
      throw new UnauthorizedError('Session is no longer valid');
    }

    // Resolve active membership mapping
    const membership = await userMembershipRepository.findOne({
      userId: user.id,
      branchId: session.branchId || 1, // Fallback if session branch not tagged
      status: 'active',
    });

    const tenant = await tenantRepository.findOne({ id: session.tenantId || 1 });
    const business = await businessRepository.findOne({ id: session.businessId || 1 });
    const branch = await branchRepository.findOne({ id: session.branchId || 1 });

    // Rotate: Revoke parent token
    await refreshTokenRepository.update(tokenRecord.id, { isRevoked: true });

    // Issue child token in family tree
    const newRawToken = crypto.randomBytes(40).toString('hex');
    const childHash = this._sha256(newRawToken);

    await refreshTokenRepository.create({
      userId: user.id,
      sessionId: session.id,
      token: childHash,
      parentHash: incomingHash,
      familyRootHash: tokenRecord.familyRootHash,
      expiresAt: tokenRecord.expiresAt, // Keeps same absolute expiry boundary
    });

    // Resolve Role Name
    const roleRecord = membership ? await roleRepository.findOne({ id: membership.roleId }) : null;
    const roleName = user.role === 'super_admin' ? 'super_admin' : (roleRecord ? roleRecord.name : 'guest');

    // Sign new Access Token
    const payload = {
      id: user.id,
      email: user.email,
      role: roleName,
      tenantUuid: tenant ? tenant.uuid : '',
      businessUuid: business ? business.uuid : '',
      branchUuid: branch ? branch.uuid : '',
      tenantId: tenant ? tenant.id : null,
      businessId: business ? business.id : null,
      branchId: branch ? branch.id : null,
      sessionId: session.uuid,
      deviceId: session.deviceFingerprint,
      tokenVersion: 1,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    return { accessToken, refreshToken: newRawToken };
  }

  /**
   * Invalidate specific active session
   */
  async logout(sessionUuid) {
    const session = await userSessionRepository.findOne({ uuid: sessionUuid });
    if (session) {
      await userSessionRepository.update(session.id, { isActive: false, status: 'terminated' });
      await refreshTokenRepository.bulkUpdate({ sessionId: session.id }, { isRevoked: true });
      
      const telemetryCollector = require('../../shared/telemetry');
      telemetryCollector.increment('sessionRevocations');

      return true;
    }
    return false;
  }

  /**
   * Invalidate all sessions of user (forced logout)
   */
  async logoutAll(userId) {
    const sessions = await userSessionRepository.findMany({ userId, isActive: true });
    const ids = sessions.map(s => s.id);
    
    if (ids.length > 0) {
      await userSessionRepository.bulkUpdate({ id: ids }, { isActive: false, status: 'terminated' });
      await refreshTokenRepository.bulkUpdate({ sessionId: ids }, { isRevoked: true });
      
      const telemetryCollector = require('../../shared/telemetry');
      for (let i = 0; i < ids.length; i++) {
        telemetryCollector.increment('sessionRevocations');
      }
    }
    return true;
  }

  /**
   * Reset Password with sessions invalidation
   */
  async resetPassword(token, newPassword) {
    const reset = await passwordResetRepository.findOne({ tokenHash: this._sha256(token), isUsed: false });
    if (!reset || reset.expiresAt < new Date()) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const user = await User.findByPk(reset.userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashedPassword });

    // Mark reset token used
    await passwordResetRepository.update(reset.id, { isUsed: true });

    // Security check: Force close all active sessions
    await this.logoutAll(user.id);

    const telemetryCollector = require('../../shared/telemetry');
    telemetryCollector.increment('passwordResets');

    auditService.logPlatformAction(user.id, 'auth:password_reset_success', 'auth', `Password reset successful. Terminated active user sessions.`);
    return true;
  }

  /**
   * API Key authentication
   */
  async verifyApiKey(rawKey) {
    if (!rawKey || rawKey.length < 10) {
      return null;
    }

    const prefix = rawKey.substring(0, 10);
    const keyHash = this._sha256(rawKey);

    const apiKeyRecord = await apiKeyRepository.findOne({ prefix, keyHash, isActive: true });
    if (!apiKeyRecord || (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date())) {
      return null;
    }

    // Update lastUsedAt
    await apiKeyRepository.update(apiKeyRecord.id, { lastUsedAt: new Date() });

    // Fetch relational scopes
    const scopes = await apiKeyScopeRepository.findMany({ apiKeyId: apiKeyRecord.id });
    const scopePermissionIds = scopes.map(s => s.permissionId);

    if (scopePermissionIds.length === 0) {
      return {
        tenantId: apiKeyRecord.tenantId,
        scopes: [],
      };
    }

    const records = await permissionRepository.findMany({ id: scopePermissionIds });
    const scopesNames = records.map(r => r.name);

    return {
      tenantId: apiKeyRecord.tenantId,
      scopes: scopesNames,
    };
  }
}

const identityService = new IdentityService();
module.exports = identityService;
