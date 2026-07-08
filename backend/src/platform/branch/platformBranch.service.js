'use strict';

const sequelize = require('../../config/database');
const branchRepository = require('./branch.repository');
const branchSettingsRepository = require('./branchSettings.repository');
const branchBrandingRepository = require('./branchBranding.repository');
const branchContactRepository = require('./branchContact.repository');
const branchAddressRepository = require('./branchAddress.repository');
const branchPreferenceRepository = require('./branchPreference.repository');
const branchMetadataRepository = require('./branchMetadata.repository');
const branchMembershipRepository = require('./branchMembership.repository');
const tenantRepository = require('../tenant/tenant.repository');
const businessRepository = require('../business/business.repository');
const userMembershipRepository = require('../identity/userMembership.repository');
const userSessionRepository = require('../identity/userSession.repository');
const subscriptionRepository = require('../subscription/subscription.repository');
const auditService = require('../audit/audit.service');
const platformAuditRepository = require('../audit/platformAudit.repository');

// Enterprise & Clean Architecture Abstractions
const memoryLockProvider = require('../../shared/core/LockProvider');
const featurePolicyEngine = require('../../shared/core/FeaturePolicyEngine');
const LifecycleManager = require('../../shared/core/LifecycleManager');
const SearchBuilder = require('../../shared/core/SearchBuilder');
const PaginationBuilder = require('../../shared/core/PaginationBuilder');
const { ConflictError, BadRequestError, NotFoundError } = require('../../shared/errors/AppError');
const Outbox = require('../../shared/events/outbox.model');
const outboxDispatcher = require('../../shared/events/outboxDispatcher');
const {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchArchivedEvent,
  BranchSuspendedEvent,
  BranchRestoredEvent,
  BranchDeletedEvent
} = require('../../shared/events/domainEvents');
const RequestContext = require('../../shared/core/context');
const crypto = require('crypto');
const { Op } = require('sequelize');

class PlatformBranchService {
  /**
   * Helper to execute Outbox publish events asynchronously
   */
  _triggerEventDispatch() {
    setImmediate(() => outboxDispatcher.dispatch());
  }

  /**
   * List branches with pagination, search, sorting and filters
   */
  async listBranches(params = {}) {
    const { page, limit, search, status, tenantUuid, businessUuid, sortBy, sortOrder } = params;

    const builder = new SearchBuilder();

    if (search) {
      builder.orLike(['name', 'slug', 'email', 'branchCode'], search);
    }

    if (status) {
      builder.eq('status', status);
    }

    if (tenantUuid) {
      const tenant = await tenantRepository.findOne({ uuid: tenantUuid });
      if (tenant) builder.eq('tenantId', tenant.id);
    }

    if (businessUuid) {
      const business = await businessRepository.findOne({ uuid: businessUuid });
      if (business) builder.eq('businessId', business.id);
    }

    builder.eq('isDeleted', false);

    const where = builder.build();

    const pagination = PaginationBuilder.build(page, limit);
    const orderOptions = PaginationBuilder.order(sortBy || 'createdAt', sortOrder || 'DESC');

    const paginatedResult = await branchRepository.paginate(where, pagination.page, pagination.limit, {
      order: orderOptions,
    });

    const hydratedRows = [];
    for (const row of paginatedResult.rows) {
      hydratedRows.push(await this.getBranchByUuid(row.uuid));
    }

    return {
      rows: hydratedRows,
      count: paginatedResult.count,
    };
  }

  /**
   * Fetch Branch by UUID with child resources
   */
  async getBranchByUuid(uuid) {
    const branch = await branchRepository.findOne({ uuid, isDeleted: false });
    if (!branch) {
      return null;
    }

    const [settings, branding, contacts, addresses, preferences, metadata, memberships] = await Promise.all([
      branchSettingsRepository.findMany({ branchId: branch.id }),
      branchBrandingRepository.findOne({ branchId: branch.id }),
      branchContactRepository.findOne({ branchId: branch.id }),
      branchAddressRepository.findMany({ branchId: branch.id }),
      branchPreferenceRepository.findMany({ branchId: branch.id }),
      branchMetadataRepository.findMany({ branchId: branch.id }),
      branchMembershipRepository.findMany({ branchId: branch.id }),
    ]);

    const settingsObj = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.datatype === 'integer' ? parseInt(s.value) : s.value;
    });

    const preferencesObj = {};
    preferences.forEach((p) => {
      preferencesObj[p.key] = p.value;
    });

    const metadataObj = {};
    metadata.forEach((m) => {
      metadataObj[m.key] = m.value;
    });

    return {
      id: branch.id,
      uuid: branch.uuid,
      tenantId: branch.tenantId,
      businessId: branch.businessId,
      name: branch.name,
      branchCode: branch.branchCode,
      slug: branch.slug,
      email: branch.email,
      phone: branch.phone,
      status: branch.status,
      isActive: branch.isActive,
      version: branch.version,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      settings: settingsObj,
      branding: branding || {},
      contacts: contacts || {},
      addresses: addresses || [],
      preferences: preferencesObj,
      metadata: metadataObj,
      memberships: memberships || [],
    };
  }

  /**
   * Provision a new branch with nested tables
   */
  async createBranch(data) {
    const {
      tenantUuid,
      businessUuid,
      name,
      slug,
      email,
      phone,
      branchCode,
      settings = {},
      branding = {},
      contacts = {},
      address = {},
      preferences = [],
    } = data;

    // Mutex Lock preventing duplicate provisioning race conditions
    const lockKey = `lock:branch_provision:${tenantUuid}:${slug || name}`;
    await memoryLockProvider.acquire(lockKey, 5000); // 5s expiry lock

    try {
      // Resolve Tenant
      const tenant = await tenantRepository.findOne({ uuid: tenantUuid });
      if (!tenant) {
        throw new BadRequestError(`Tenant not found for UUID: ${tenantUuid}`, 'TENANT_NOT_FOUND');
      }

      // Resolve Business
      const business = await businessRepository.findOne({ uuid: businessUuid });
      if (!business) {
        throw new BadRequestError(`Business not found for UUID: ${businessUuid}`, 'BUSINESS_NOT_FOUND');
      }

      // Evaluate limits before creating Branch
      const currentCount = await branchRepository.count({ tenantId: tenant.id });
      await featurePolicyEngine.evaluate(tenant.id, null, 'max-branches', currentCount);

      const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + crypto.randomBytes(3).toString('hex');

      const t = await sequelize.transaction();
      try {
        // Create root branch
        const branch = await branchRepository.create({
          tenantId: tenant.id,
          businessId: business.id,
          name,
          branchCode: branchCode || 'BR-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
          slug: generatedSlug,
          email,
          phone,
          status: 'active',
          isActive: true,
          version: 1,
        }, { transaction: t });

        // Create branch settings
        const settingsToCreate = [
          { key: 'billing.prefix.invoice', value: settings.invoicePrefix || 'INV', datatype: 'string', category: 'billing' },
          { key: 'system.timezone', value: settings.timezone || 'Asia/Kolkata', datatype: 'string', category: 'system' },
          { key: 'system.locale', value: settings.locale || 'en-IN', datatype: 'string', category: 'system' },
        ];

        for (const set of settingsToCreate) {
          await branchSettingsRepository.create({
            branchId: branch.id,
            ...set,
          }, { transaction: t });
        }

        // Create branding
        await branchBrandingRepository.create({
          branchId: branch.id,
          logo: branding.logo || null,
          darkLogo: branding.darkLogo || null,
          favicon: branding.favicon || null,
          primaryColor: branding.primaryColor || '#0052CC',
          secondaryColor: branding.secondaryColor || '#0065FF',
          theme: branding.theme || 'light',
        }, { transaction: t });

        // Create contacts
        await branchContactRepository.create({
          branchId: branch.id,
          email: contacts.email || email,
          phone: contacts.phone || phone,
          alternatePhone: contacts.alternatePhone || null,
          website: contacts.website || null,
        }, { transaction: t });

        // Create Address
        await branchAddressRepository.create({
          branchId: branch.id,
          addressLine1: address.addressLine1 || 'Main Branch Street',
          addressLine2: address.addressLine2 || null,
          city: address.city || 'Branch City',
          state: address.state || 'Branch State',
          country: address.country || 'India',
          postalCode: address.postalCode || '110001',
          latitude: address.latitude || null,
          longitude: address.longitude || null,
          addressType: address.addressType || 'branch',
          isDefault: true,
        }, { transaction: t });

        // Create Preferences if provided
        if (preferences && preferences.length > 0) {
          for (const pref of preferences) {
            await branchPreferenceRepository.create({
              branchId: branch.id,
              key: pref.key,
              value: pref.value,
              datatype: pref.datatype || 'string',
              category: pref.category || 'general',
            }, { transaction: t });
          }
        } else {
          await branchPreferenceRepository.create({
            branchId: branch.id,
            key: 'system.notification_channel',
            value: 'email',
            datatype: 'string',
            category: 'system',
          }, { transaction: t });
        }

        // Enroll provisioning user as branch manager (membership setup)
        const creatorId = RequestContext.userId || 'system';
        await branchMembershipRepository.create({
          branchId: branch.id,
          userId: creatorId,
          role: 'manager',
          status: 'active',
        }, { transaction: t });

        // Also enroll in the platform user membership table
        await userMembershipRepository.create({
          userId: creatorId,
          tenantId: tenant.id,
          businessId: business.id,
          branchId: branch.id,
          roleId: 2, // Admin role ID
          status: 'active',
        }, { transaction: t });

        // ─── Transactional Outbox Pattern ───────────────────────────────────────
        const event = new BranchCreatedEvent(
          RequestContext.userId,
          RequestContext.requestId,
          RequestContext.correlationId,
          branch
        );

        await Outbox.create({
          eventName: event.eventName,
          payload: event.serialize(),
          status: 'pending',
        }, { transaction: t });

        await t.commit();

        // Dispatch outbox asynchronously after commit
        this._triggerEventDispatch();

        auditService.logPlatformAction(
          RequestContext.userId,
          'branch:created',
          'branch',
          `Branch ${name} provisioned successfully.`
        );

        return await this.getBranchByUuid(branch.uuid);
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } finally {
      await memoryLockProvider.release(lockKey);
    }
  }

  /**
   * Update Branch root metadata with Optimistic Locking check
   */
  async updateBranch(uuid, data) {
    const branch = await branchRepository.findOne({ uuid });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    if (data.version !== undefined && data.version !== branch.version) {
      throw new ConflictError(
        'Concurrent overwrite conflict detected. The record has been modified by another process. Please reload and retry.',
        'CONCURRENT_OVERWRITE_CONFLICT'
      );
    }

    const t = await sequelize.transaction();
    try {
      // Validate and lock via version updates
      const updated = await branchRepository.update(branch.id, {
        ...data,
        version: branch.version + 1, // Enforces optimistic locking counter increment
      }, {
        transaction: t,
        where: { version: branch.version }
      });

      if (!updated) {
        throw new ConflictError(
          'Concurrent overwrite conflict detected. The record has been modified by another process. Please reload and retry.',
          'CONCURRENT_OVERWRITE_CONFLICT'
        );
      }

      // Outbox event
      const event = new BranchUpdatedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        branch.uuid,
        data
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
        'branch:updated',
        'branch',
        `Branch metadata updated for ${branch.name}`
      );

      return await this.getBranchByUuid(branch.uuid);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Update settings configurations
   */
  async updateBranchSettings(uuid, settingsArray) {
    const branch = await branchRepository.findOne({ uuid });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const t = await sequelize.transaction();
    try {
      for (const item of settingsArray) {
        const { key, value, datatype, category } = item;
        const existing = await branchSettingsRepository.findOne({ branchId: branch.id, key });
        if (existing) {
          await branchSettingsRepository.update(existing.id, { value, datatype, category }, { transaction: t });
        } else {
          await branchSettingsRepository.create({
            branchId: branch.id,
            key,
            value,
            datatype: datatype || 'string',
            category: category || 'general',
          }, { transaction: t });
        }
      }

      await t.commit();
      auditService.logPlatformAction(
        RequestContext.userId,
        'branch:settings_updated',
        'branch',
        `Branch settings updated for ${branch.name}`
      );

      return await this.getBranchByUuid(branch.uuid);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Update branding details
   */
  async updateBranchBranding(uuid, brandingData) {
    const branch = await branchRepository.findOne({ uuid });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const t = await sequelize.transaction();
    try {
      const existing = await branchBrandingRepository.findOne({ branchId: branch.id });
      if (existing) {
        await branchBrandingRepository.update(existing.id, brandingData, { transaction: t });
      } else {
        await branchBrandingRepository.create({
          branchId: branch.id,
          ...brandingData
        }, { transaction: t });
      }

      await t.commit();
      auditService.logPlatformAction(
        RequestContext.userId,
        'branch:branding_updated',
        'branch',
        `Branch branding details updated for ${branch.name}`
      );

      return await this.getBranchByUuid(branch.uuid);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async _updateStatus(uuid, action, auditAction, EventClass) {
    const branch = await branchRepository.findOne({ uuid });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const targetStatus = LifecycleManager.validateTransition(branch.status, action);
    const updates = LifecycleManager.getTimestampsForState(targetStatus);

    const t = await sequelize.transaction();
    try {
      await branchRepository.update(branch.id, updates, { transaction: t });

      const event = new EventClass(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        branch.uuid
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
        'branch',
        `Branch ${branch.name} state changed to ${targetStatus}`
      );

      if (action === 'deleted') {
        return { uuid: branch.uuid, status: 'deleted', isDeleted: true };
      }

      return await this.getBranchByUuid(branch.uuid);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async activateBranch(uuid) {
    return await this._updateStatus(uuid, 'active', 'branch:activated', BranchRestoredEvent);
  }

  async suspendBranch(uuid) {
    return await this._updateStatus(uuid, 'suspended', 'branch:suspended', BranchSuspendedEvent);
  }

  async archiveBranch(uuid) {
    return await this._updateStatus(uuid, 'archived', 'branch:archived', BranchArchivedEvent);
  }

  async restoreBranch(uuid) {
    return await this._updateStatus(uuid, 'restore', 'branch:restored', BranchRestoredEvent);
  }

  async deleteBranch(uuid) {
    return await this._updateStatus(uuid, 'deleted', 'branch:deleted', BranchDeletedEvent);
  }

  /**
   * Retrieve platform-generic branch health diagnostics
   */
  async getBranchHealth(uuid) {
    const branch = await branchRepository.findOne({ uuid });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const subscription = await subscriptionRepository.findOne({ tenantId: branch.tenantId });
    const userCount = await userMembershipRepository.count({ branchId: branch.id });

    return {
      branchUuid: branch.uuid,
      name: branch.name,
      status: branch.status,
      subscriptionPlan: subscription ? subscription.planId : 'Free',
      metrics: {
        totalUsers: userCount,
        allocatedStorageBytes: 1073741824, // 1 GB placeholder
        usedStorageBytes: 104857600, // 100 MB placeholder
      },
      diagnostics: {
        databaseUptime: process.uptime(),
        apiConnectivity: 'healthy',
        cacheLatencyMs: 0,
      },
    };
  }

  /**
   * Retrieve platform-generic branch activity summaries
   */
  async getBranchSummary(uuid) {
    const branch = await branchRepository.findOne({ uuid });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const memberships = await userMembershipRepository.findMany({ branchId: branch.id });
    const userIds = memberships.map((m) => m.userId);

    const activeSessionsCount = await userSessionRepository.count({
      userId: { [Op.in]: userIds },
      status: 'active',
    });

    const recentAudits = await platformAuditRepository.findMany({}, { limit: 5, order: [['createdAt', 'DESC']] });

    return {
      branchUuid: branch.uuid,
      name: branch.name,
      branchCode: branch.branchCode,
      status: branch.status,
      ownerEmail: branch.email,
      activeSessions: activeSessionsCount,
      recentEvents: recentAudits.map((a) => ({
        action: a.action,
        module: a.module,
        details: a.details,
        createdAt: a.createdAt,
      })),
    };
  }
}

const platformBranchService = new PlatformBranchService();
module.exports = platformBranchService;
