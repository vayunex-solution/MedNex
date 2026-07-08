'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

const userRepository = require('./user.repository');
const userProfileRepository = require('./userProfile.repository');
const userPreferenceRepository = require('./userPreference.repository');
const userNotificationPreferenceRepository = require('./userNotificationPreference.repository');
const userMetadataRepository = require('./userMetadata.repository');
const userDeviceRepository = require('./userDevice.repository');
const userMembershipRepository = require('./userMembership.repository');

const tenantRepository = require('../tenant/tenant.repository');
const businessRepository = require('../business/business.repository');
const branchRepository = require('../branch/branch.repository');
const roleRepository = require('../rbac/role.repository');
const subscriptionRepository = require('../subscription/subscription.repository');
const licenseRepository = require('../license/license.repository');

const Outbox = require('../../shared/events/outbox.model');
const {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserActivatedEvent,
  UserSuspendedEvent,
  PasswordChangedEvent,
  EmailVerifiedEvent,
  PhoneVerifiedEvent,
  MFAEnabledEvent,
  MFADisabledEvent,
} = require('../../shared/events/domainEvents');

const BaseService = require('../../shared/core/base.service');
const RequestContext = require('../../shared/core/context');
const { NotFoundError, BadRequestError, ConflictError, ForbiddenError } = require('../../shared/errors/AppError');
const auditService = require('../audit/audit.service');
const LifecycleManager = require('../../shared/core/LifecycleManager');
const FeaturePolicyEngine = require('../../shared/core/FeaturePolicyEngine');
const logger = require('../../config/logger');

class PlatformUserService extends BaseService {
  constructor() {
    super(userRepository);
  }

  _triggerEventDispatch() {
    const OutboxDispatcher = require('../../shared/events/OutboxDispatcher');
    OutboxDispatcher.dispatch().catch(err => {
      logger.error(`[OutboxDispatcher] Failed to dispatch pending events: ${err.message}`);
    });
  }

  async listUsers(query = {}) {
    const { limit = 20, offset = 0, cursor, search, tenantUuid, businessUuid, branchUuid } = query;
    const where = { isDeleted: false };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Resolve UUIDs to BigInt IDs for memberships filtering
    let filterUserIds = null;
    if (tenantUuid || businessUuid || branchUuid) {
      const membershipWhere = {};
      if (tenantUuid) {
        const tenant = await tenantRepository.findOne({ uuid: tenantUuid });
        if (tenant) membershipWhere.tenantId = tenant.id;
      }
      if (businessUuid) {
        const business = await businessRepository.findOne({ uuid: businessUuid });
        if (business) membershipWhere.businessId = business.id;
      }
      if (branchUuid) {
        const branch = await branchRepository.findOne({ uuid: branchUuid });
        if (branch) membershipWhere.branchId = branch.id;
      }

      const memberships = await userMembershipRepository.findMany(membershipWhere);
      filterUserIds = memberships.map(m => m.userId);
      
      // If we filtered but found no memberships, force empty list response
      if (filterUserIds.length === 0) {
        return { count: 0, rows: [] };
      }
      where.id = { [Op.in]: filterUserIds };
    }

    if (cursor) {
      const { rows, nextCursor } = await userRepository.cursorPaginate(where, cursor, limit, {
        order: [['id', 'DESC']],
        include: [{ association: 'profile' }]
      });
      return {
        rows: rows.map(r => this._serializeUser(r)),
        nextCursor
      };
    }

    const { count, rows } = await userRepository.model.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['id', 'DESC']],
      include: [
        { association: 'profile' }
      ]
    });

    return {
      count,
      rows: rows.map(r => this._serializeUser(r))
    };
  }

  /**
   * Fetch User by UUID
   */
  async getUserByUuid(uuid) {
    const user = await userRepository.findOne({ uuid, isDeleted: false }, {
      include: [
        { association: 'profile' },
        { association: 'preferences' },
        { association: 'notificationPreferences' },
        { association: 'metadata' },
        { association: 'devices' },
      ]
    });

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    // Fetch memberships manually to resolve names
    const memberships = await userMembershipRepository.findMany({ userId: user.id });
    const resolvedMemberships = [];
    for (const m of memberships) {
      const tenant = await tenantRepository.findOne({ id: m.tenantId });
      const business = await businessRepository.findOne({ id: m.businessId });
      const branch = await branchRepository.findOne({ id: m.branchId });
      const role = await roleRepository.findOne({ id: m.roleId });
      resolvedMemberships.push({
        uuid: m.uuid,
        status: m.status,
        role: role ? role.name : 'guest',
        tenant: tenant ? { uuid: tenant.uuid, name: tenant.name } : null,
        business: business ? { uuid: business.uuid, name: business.name } : null,
        branch: branch ? { uuid: branch.uuid, name: branch.name } : null,
      });
    }

    const serialized = this._serializeUser(user);
    serialized.preferences = user.preferences || [];
    serialized.notificationPreferences = user.notificationPreferences || [];
    serialized.metadata = user.metadata || [];
    serialized.devices = user.devices || [];
    serialized.memberships = resolvedMemberships;

    return serialized;
  }

  /**
   * Provision a new User
   */
  async createUser(payload) {
    // Check duplicate email
    const existing = await userRepository.findOne({ email: payload.email, isDeleted: false });
    if (existing) {
      throw new ConflictError('Email already registered', 'EMAIL_ALREADY_REGISTERED');
    }

    // Resolve tenant, business, and branch
    const tenant = await tenantRepository.findOne({ uuid: payload.tenantUuid });
    if (!tenant) throw new NotFoundError('Tenant not found', 'TENANT_NOT_FOUND');

    const business = await businessRepository.findOne({ uuid: payload.businessUuid });
    if (!business) throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');

    const branch = await branchRepository.findOne({ uuid: payload.branchUuid });
    if (!branch) throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');

    // Enforce subscription limit policy check via FeaturePolicyEngine
    const currentUsersCount = await userMembershipRepository.count({ tenantId: tenant.id });
    const subscription = await subscriptionRepository.findOne({ tenantId: tenant.id });
    const license = await licenseRepository.findOne({ tenantId: tenant.id });

    await FeaturePolicyEngine.evaluate(tenant.id, null, 'max-users', currentUsersCount);

    // Resolve Role ID
    const roleRecord = await roleRepository.findOne({ name: payload.role || 'employee' });
    const roleId = roleRecord ? roleRecord.id : 4; // Fallback to cashier/employee (ID 4) if not found

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.password, salt);

    // Verification tokens
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const phoneVerificationToken = crypto.randomBytes(6).toString('hex'); // Simple 6-char OTP for phone

    const t = await sequelize.transaction();
    try {
      // Create user record
      const user = await userRepository.create({
        name: payload.name,
        email: payload.email,
        password: passwordHash,
        role: payload.role || 'employee',
        userType: payload.userType || 'employee',
        status: payload.status || 'email_pending', // Default to email verification pending
        emailVerificationToken,
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        phoneVerificationToken,
        phoneVerificationExpiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      }, { transaction: t });

      // Create profile details
      const profilePayload = payload.profile || {};
      await userProfileRepository.create({
        userId: user.id,
        firstName: profilePayload.firstName || null,
        lastName: profilePayload.lastName || null,
        timezone: profilePayload.timezone || 'UTC',
        locale: profilePayload.locale || 'en',
      }, { transaction: t });

      // Create preferences (if present)
      if (payload.preferences && payload.preferences.length > 0) {
        for (const pref of payload.preferences) {
          await userPreferenceRepository.create({
            userId: user.id,
            key: pref.key,
            value: pref.value,
            datatype: pref.datatype || 'string',
            category: pref.category || 'general',
            scope: pref.scope || 'user',
          }, { transaction: t });
        }
      }

      // Create notification preferences (if present)
      if (payload.notificationPreferences && payload.notificationPreferences.length > 0) {
        for (const notif of payload.notificationPreferences) {
          await userNotificationPreferenceRepository.create({
            userId: user.id,
            channel: notif.channel,
            category: notif.category || 'general',
            isEnabled: notif.isEnabled !== false,
          }, { transaction: t });
        }
      } else {
        // Create default channels notification preferences
        const defaultChannels = ['email', 'in_app'];
        for (const channel of defaultChannels) {
          await userNotificationPreferenceRepository.create({
            userId: user.id,
            channel,
            category: 'general',
            isEnabled: true,
          }, { transaction: t });
        }
      }

      // Create User Membership association
      await userMembershipRepository.create({
        userId: user.id,
        tenantId: tenant.id,
        businessId: business.id,
        branchId: branch.id,
        roleId,
        status: 'active',
      }, { transaction: t });

      // Create domain event inside Outbox
      const event = new UserCreatedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user
      );

      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction: t });

      await t.commit();
      this._triggerEventDispatch();

      const telemetryCollector = require('../../shared/telemetry');
      telemetryCollector.increment('userRegistrations');

      auditService.logPlatformAction(
        RequestContext.userId,
        'user:created',
        'user',
        `User ${user.email} provisioned successfully.`
      );

      return await this.getUserByUuid(user.uuid);
    } catch (err) {
      logger.error('Error in PlatformUserService.createUser:', err);
      try {
        await t.rollback();
      } catch (rollbackErr) {}
      throw err;
    }
  }

  /**
   * Update User
   */
  async updateUser(uuid, payload) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    // Optimistic Concurrency Control
    if (parseInt(payload.version) !== user.version) {
      throw new ConflictError(
        'Concurrent overwrite conflict detected. The record has been modified by another process. Please reload and retry.',
        'CONCURRENT_OVERWRITE_CONFLICT'
      );
    }

    const updates = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.role !== undefined) updates.role = payload.role;
    if (payload.userType !== undefined) updates.userType = payload.userType;
    if (payload.status !== undefined) updates.status = payload.status;

    updates.version = user.version + 1;

    const t = await sequelize.transaction();
    try {
      await userRepository.update(user.id, updates, { transaction: t });

      const event = new UserUpdatedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user.uuid,
        updates
      );

      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction: t });

      await t.commit();
      this._triggerEventDispatch();

      auditService.logPlatformAction(
        RequestContext.userId,
        'user:updated',
        'user',
        `User metadata updated for ${user.email}`
      );

      return await this.getUserByUuid(user.uuid);
    } catch (err) {
      logger.error('Error in PlatformUserService.updateUser:', err);
      try {
        await t.rollback();
      } catch (rollbackErr) {}
      throw err;
    }
  }

  /**
   * Internal status lifecycle manager helper
   */
  async _updateStatus(uuid, action, auditAction, EventClass) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const targetStatus = LifecycleManager.validateTransition(user.status, action);
    const updates = LifecycleManager.getTimestampsForState(targetStatus);

    const t = await sequelize.transaction();
    try {
      await userRepository.update(user.id, updates, { transaction: t });

      const event = new EventClass(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user.uuid
      );

      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction: t });

      await t.commit();
      this._triggerEventDispatch();

      auditService.logPlatformAction(
        RequestContext.userId,
        auditAction,
        'user',
        `User ${user.email} status changed to ${targetStatus}`
      );

      if (action === 'deleted') {
        return { uuid: user.uuid, status: 'deleted', isDeleted: true };
      }

      return await this.getUserByUuid(user.uuid);
    } catch (err) {
      logger.error('Error in PlatformUserService._updateStatus:', err);
      try {
        await t.rollback();
      } catch (rollbackErr) {}
      throw err;
    }
  }

  async activateUser(uuid) {
    return await this._updateStatus(uuid, 'active', 'user:activated', UserActivatedEvent);
  }

  async suspendUser(uuid) {
    return await this._updateStatus(uuid, 'suspended', 'user:suspended', UserSuspendedEvent);
  }

  async deleteUser(uuid) {
    return await this._updateStatus(uuid, 'deleted', 'user:deleted', UserDeletedEvent);
  }

  /**
   * Email Verification
   */
  async verifyEmail(uuid, token) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    if (user.emailVerificationToken !== token) {
      throw new BadRequestError('Invalid verification token', 'INVALID_VERIFICATION_TOKEN');
    }

    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestError('Verification token expired', 'TOKEN_EXPIRED');
    }

    const t = await sequelize.transaction();
    try {
      await userRepository.update(user.id, {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
        status: 'active',
      }, { transaction: t });

      const event = new EmailVerifiedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user.uuid
      );

      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction: t });

      await t.commit();
      this._triggerEventDispatch();

      auditService.logPlatformAction(
        RequestContext.userId,
        'user:email_verified',
        'user',
        `Email verified successfully for ${user.email}`
      );

      return { success: true, message: 'Email verified successfully.' };
    } catch (err) {
      logger.error('Error in PlatformUserService.verifyEmail:', err);
      try {
        await t.rollback();
      } catch (rollbackErr) {}
      throw err;
    }
  }

  /**
   * Phone Verification
   */
  async verifyPhone(uuid, token) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    if (user.phoneVerificationToken !== token) {
      throw new BadRequestError('Invalid verification token', 'INVALID_VERIFICATION_TOKEN');
    }

    if (user.phoneVerificationExpiresAt && user.phoneVerificationExpiresAt < new Date()) {
      throw new BadRequestError('Verification token expired', 'TOKEN_EXPIRED');
    }

    const t = await sequelize.transaction();
    try {
      await userRepository.update(user.id, {
        phoneVerifiedAt: new Date(),
        phoneVerificationToken: null,
        phoneVerificationExpiresAt: null,
      }, { transaction: t });

      const event = new PhoneVerifiedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user.uuid
      );

      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction: t });

      await t.commit();
      this._triggerEventDispatch();

      auditService.logPlatformAction(
        RequestContext.userId,
        'user:phone_verified',
        'user',
        `Phone number verified successfully for ${user.email}`
      );

      return { success: true, message: 'Phone number verified successfully.' };
    } catch (err) {
      logger.error('Error in PlatformUserService.verifyPhone:', err);
      try {
        await t.rollback();
      } catch (rollbackErr) {}
      throw err;
    }
  }

  /**
   * Force Password Reset
   */
  async forcePasswordReset(uuid) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    await userRepository.update(user.id, { passwordResetRequired: true });

    auditService.logPlatformAction(
      RequestContext.userId,
      'user:force_password_reset',
      'user',
      `Forced password reset required for ${user.email}`
    );

    return { success: true, message: 'Password reset required on next login.' };
  }

  /**
   * Reset Password
   */
  async resetPassword(uuid, newPassword) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const t = await sequelize.transaction();
    try {
      await userRepository.update(user.id, {
        password: passwordHash,
        passwordChangedAt: new Date(),
        passwordResetRequired: false,
      }, { transaction: t });

      const event = new PasswordChangedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user.uuid
      );

      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction: t });

      await t.commit();
      this._triggerEventDispatch();

      auditService.logPlatformAction(
        RequestContext.userId,
        'user:password_changed',
        'user',
        `Password changed successfully for ${user.email}`
      );

      return { success: true, message: 'Password reset successfully.' };
    } catch (err) {
      logger.error('Error in PlatformUserService.resetPassword:', err);
      try {
        await t.rollback();
      } catch (rollbackErr) {}
      throw err;
    }
  }

  /**
   * Get User Devices list
   */
  async getUserDevices(uuid) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    return await userDeviceRepository.findMany({ userId: user.id });
  }

  /**
   * Delete specific device Fingerprint
   */
  async deleteUserDevice(uuid, deviceUuid) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    const device = await userDeviceRepository.findOne({ userId: user.id, uuid: deviceUuid });
    if (!device) throw new NotFoundError('Device fingerprint not found', 'DEVICE_NOT_FOUND');

    await userDeviceRepository.bulkDelete({ id: device.id });
    return { success: true, message: 'Device fingerprint revoked successfully.' };
  }

  /**
   * Get User Audit logs
   */
  async getUserAudits(uuid) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    const PlatformAudit = require('../audit/platformAudit.model');
    return await PlatformAudit.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
  }

  /**
   * Get User Activities
   */
  async getUserActivities(uuid) {
    const user = await userRepository.findOne({ uuid, isDeleted: false });
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    const LoginHistory = require('../identity/loginHistory.model');
    const logs = await LoginHistory.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return logs;
  }

  async _executeBulkOperation(uuids, operationCallback) {
    const chunkSize = parseInt(process.env.BULK_OPERATION_CHUNK_SIZE || '50');
    const results = {
      success: [],
      failed: []
    };

    for (let i = 0; i < uuids.length; i += chunkSize) {
      const chunk = uuids.slice(i, i + chunkSize);
      const t = await sequelize.transaction();
      try {
        for (const uuid of chunk) {
          try {
            await operationCallback(uuid, t);
            results.success.push(uuid);
          } catch (err) {
            results.failed.push({ uuid, error: err.message });
          }
        }
        await t.commit();
      } catch (err) {
        await t.rollback();
        for (const uuid of chunk) {
          if (!results.success.includes(uuid) && !results.failed.some(f => f.uuid === uuid)) {
            results.failed.push({ uuid, error: `Transaction failure: ${err.message}` });
          }
        }
      }
    }

    return results;
  }

  async bulkActivate(uuids) {
    return await this._executeBulkOperation(uuids, async (uuid, transaction) => {
      const user = await userRepository.findOne({ uuid, isDeleted: false }, { transaction });
      if (!user) throw new NotFoundError(`User ${uuid} not found`);
      await user.update({ isActive: true, status: 'active' }, { transaction });
      
      const event = new UserActivatedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user
      );
      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction });
    });
  }

  async bulkSuspend(uuids) {
    return await this._executeBulkOperation(uuids, async (uuid, transaction) => {
      const user = await userRepository.findOne({ uuid, isDeleted: false }, { transaction });
      if (!user) throw new NotFoundError(`User ${uuid} not found`);
      await user.update({ isActive: false, status: 'suspended' }, { transaction });
      
      const event = new UserSuspendedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user
      );
      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction });
    });
  }

  async bulkDelete(uuids) {
    return await this._executeBulkOperation(uuids, async (uuid, transaction) => {
      const user = await userRepository.findOne({ uuid, isDeleted: false }, { transaction });
      if (!user) throw new NotFoundError(`User ${uuid} not found`);
      
      // Soft delete user and all child elements
      await user.update({ isDeleted: true, deletedAt: new Date() }, { transaction });
      await userProfileRepository.bulkUpdate({ userId: user.id }, { isDeleted: true, deletedAt: new Date() }, { transaction });
      await userPreferenceRepository.bulkUpdate({ userId: user.id }, { isDeleted: true, deletedAt: new Date() }, { transaction });
      await userNotificationPreferenceRepository.bulkUpdate({ userId: user.id }, { isDeleted: true, deletedAt: new Date() }, { transaction });
      await userMetadataRepository.bulkUpdate({ userId: user.id }, { isDeleted: true, deletedAt: new Date() }, { transaction });
      await userDeviceRepository.bulkUpdate({ userId: user.id }, { isDeleted: true, deletedAt: new Date() }, { transaction });

      const event = new UserDeletedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user
      );
      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction });
    });
  }

  async bulkAssignRole(uuids, roleName) {
    const roleRecord = await roleRepository.findOne({ name: roleName });
    if (!roleRecord) throw new BadRequestError(`Role ${roleName} does not exist`);

    return await this._executeBulkOperation(uuids, async (uuid, transaction) => {
      const user = await userRepository.findOne({ uuid, isDeleted: false }, { transaction });
      if (!user) throw new NotFoundError(`User ${uuid} not found`);
      await user.update({ role: roleName }, { transaction });
      
      await userMembershipRepository.bulkUpdate(
        { userId: user.id, status: 'active' },
        { roleId: roleRecord.id },
        { transaction }
      );

      const event = new UserUpdatedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        user
      );
      await Outbox.create({
        eventName: event.eventName,
        payload: event.serialize(),
        status: 'pending',
      }, { transaction });
    });
  }

  async bulkExport(uuids) {
    const users = await userRepository.model.findAll({
      where: { uuid: { [Op.in]: uuids }, isDeleted: false },
      include: [{ association: 'profile' }]
    });
    return users.map(u => this._serializeUser(u));
  }

  /**
   * Serialize User details for HTTP response envelope
   */
  _serializeUser(user) {
    return {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      role: user.role,
      userType: user.userType,
      status: user.status,
      isMfaEnabled: user.isMfaEnabled,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      passwordResetRequired: user.passwordResetRequired,
      failedAttempts: user.failedAttempts,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      version: user.version,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile ? {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        avatarFileId: user.profile.avatarFileId,
        avatarUrl: user.profile.avatarUrl,
        gender: user.profile.gender,
        birthDate: user.profile.birthDate,
        timezone: user.profile.timezone,
        locale: user.profile.locale,
      } : null,
    };
  }
}

module.exports = new PlatformUserService();
