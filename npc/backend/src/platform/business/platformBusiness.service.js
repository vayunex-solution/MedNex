'use strict';

const sequelize = require('../../config/database');
const businessRepository = require('./business.repository');
const businessSettingsRepository = require('./businessSettings.repository');
const businessBrandingRepository = require('./businessBranding.repository');
const businessContactRepository = require('./businessContact.repository');
const businessAddressRepository = require('./businessAddress.repository');
const businessPreferenceRepository = require('./businessPreference.repository');
const businessMetadataRepository = require('./businessMetadata.repository');
const businessMembershipRepository = require('./businessMembership.repository');
const tenantRepository = require('../tenant/tenant.repository');
const branchRepository = require('../branch/branch.repository');
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
  BusinessCreatedEvent,
  BusinessUpdatedEvent,
  BusinessArchivedEvent,
  BusinessSuspendedEvent,
  BusinessRestoredEvent,
  BusinessDeletedEvent
} = require('../../shared/events/domainEvents');
const RequestContext = require('../../shared/core/context');
const crypto = require('crypto');
const { Op } = require('sequelize');

class PlatformBusinessService {
  /**
   * Helper to execute Outbox publish events asynchronously
   */
  _triggerEventDispatch() {
    setImmediate(() => outboxDispatcher.dispatch());
  }

  /**
   * List businesses with pagination, search, sorting and filters
   */
  async listBusinesses(params) {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'DESC',
      search = '',
      status = '',
      industry = '',
      businessType = '',
      country = '',
      tenantUuid = '',
      startDate = '',
      endDate = '',
    } = params;

    const builder = new SearchBuilder();
    builder.eq('isDeleted', false);

    // Apply structured searches/filters using SearchBuilder
    if (status) builder.eq('status', status);
    if (industry) builder.eq('industry', industry);
    if (businessType) builder.eq('businessType', businessType);

    if (tenantUuid) {
      const tenant = await tenantRepository.findOne({ uuid: tenantUuid });
      if (!tenant) return { count: 0, rows: [] };
      builder.eq('tenantId', tenant.id);
    }

    if (startDate && endDate) {
      builder.between('createdAt', startDate, endDate);
    }

    if (search) {
      builder.orLike(['name', 'slug', 'email', 'industry', 'businessType'], search);
    }

    const where = builder.build();

    // Country filtering/search via Address relation (if required)
    if (country) {
      const addresses = await businessAddressRepository.findMany({
        country: { [Op.like]: `%${country}%` },
      });
      const ids = addresses.map((a) => a.businessId);
      where.id = { [Op.in]: ids };
    }

    const pagination = PaginationBuilder.build(page, limit);
    const orderOptions = PaginationBuilder.order(sort, order);

    const paginatedResult = await businessRepository.paginate(where, pagination.page, pagination.limit, {
      order: orderOptions,
    });

    // Hydrate child entities
    const hydrated = [];
    for (const b of paginatedResult.rows) {
      const settings = await businessSettingsRepository.findMany({ businessId: b.id });
      const branding = await businessBrandingRepository.findOne({ businessId: b.id });
      const contacts = await businessContactRepository.findOne({ businessId: b.id });
      const addresses = await businessAddressRepository.findMany({ businessId: b.id });
      const preferences = await businessPreferenceRepository.findMany({ businessId: b.id });
      const metadata = await businessMetadataRepository.findMany({ businessId: b.id });

      hydrated.push({
        ...b.toJSON(),
        settings,
        branding,
        contacts,
        addresses,
        preferences,
        metadata,
      });
    }

    return {
      count: paginatedResult.count,
      rows: hydrated,
      page: paginatedResult.page,
      limit: paginatedResult.limit,
      totalPages: paginatedResult.totalPages,
    };
  }

  /**
   * Get single business by uuid
   */
  async getBusinessByUuid(uuid) {
    const business = await businessRepository.findOne({ uuid });
    if (!business) {
      throw new NotFoundError(`Business not found for UUID: ${uuid}`, 'BUSINESS_NOT_FOUND');
    }

    const settings = await businessSettingsRepository.findMany({ businessId: business.id });
    const branding = await businessBrandingRepository.findOne({ businessId: business.id });
    const contacts = await businessContactRepository.findOne({ businessId: business.id });
    const addresses = await businessAddressRepository.findMany({ businessId: business.id });
    const preferences = await businessPreferenceRepository.findMany({ businessId: business.id });
    const metadata = await businessMetadataRepository.findMany({ businessId: business.id });

    return {
      ...business.toJSON(),
      settings,
      branding,
      contacts,
      addresses,
      preferences,
      metadata,
    };
  }

  /**
   * Create and provision a new business under transaction + limit checks
   */
  async createBusiness(data) {
    const {
      tenantUuid,
      name,
      legalName,
      displayName,
      businessCode,
      slug = null,
      email,
      phone,
      industry,
      businessType,
      currency = 'INR',
      timezone = 'Asia/Kolkata',
      locale = 'en-US',
      language = 'en',
      website,
      taxNumber,
      registrationNumber,
      settings = {},
      branding = {},
      contacts = {},
      address = {},
      preferences = [],
    } = data;

    // Acquire lock to prevent race conditions during provisioning
    const lockKey = `provision:business:${tenantUuid}:${slug || name}`;
    const locked = await memoryLockProvider.acquire(lockKey, 5000);
    if (!locked) {
      throw new ConflictError('Another provisioning request is currently active. Please retry shortly.', 'PROVISIONING_LOCKED');
    }

    try {
      // Resolve Tenant
      const tenant = await tenantRepository.findOne({ uuid: tenantUuid });
      if (!tenant) {
        throw new BadRequestError(`Tenant not found for UUID: ${tenantUuid}`, 'TENANT_NOT_FOUND');
      }

      // Evaluate limits before creating Business
      const currentCount = await businessRepository.count({ tenantId: tenant.id });
      await featurePolicyEngine.evaluate(tenant.id, null, 'max-businesses', currentCount);

      const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + crypto.randomBytes(3).toString('hex');

      const t = await sequelize.transaction();
      try {
        // Create root business
        const business = await businessRepository.create({
          tenantId: tenant.id,
          name,
          legalName,
          displayName,
          businessCode: businessCode || 'BUS-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
          slug: generatedSlug,
          email,
          phone,
          industry,
          businessType,
          currency,
          timezone,
          locale,
          language,
          website,
          taxNumber,
          registrationNumber,
          status: 'active',
          isActive: true,
          version: 1,
        }, { transaction: t });

        // Create registry settings key-values
        const settingsToCreate = [
          { key: 'billing.prefix.invoice', value: settings.invoicePrefix || 'INV', datatype: 'string', category: 'billing' },
          { key: 'billing.prefix.receipt', value: settings.receiptPrefix || 'REC', datatype: 'string', category: 'billing' },
          { key: 'billing.prefix.purchase', value: settings.purchasePrefix || 'PUR', datatype: 'string', category: 'billing' },
          { key: 'system.date_format', value: settings.dateFormat || 'YYYY-MM-DD', datatype: 'string', category: 'system' },
          { key: 'system.time_format', value: settings.timeFormat || 'HH:mm:ss', datatype: 'string', category: 'system' },
          { key: 'system.timezone', value: timezone, datatype: 'string', category: 'system' },
          { key: 'system.locale', value: locale, datatype: 'string', category: 'system' },
        ];

        for (const set of settingsToCreate) {
          await businessSettingsRepository.create({
            businessId: business.id,
            ...set,
          }, { transaction: t });
        }

        // Create branding
        await businessBrandingRepository.create({
          businessId: business.id,
          logo: branding.logo || null,
          darkLogo: branding.darkLogo || null,
          favicon: branding.favicon || null,
          primaryColor: branding.primaryColor || '#0052CC',
          secondaryColor: branding.secondaryColor || '#0065FF',
          theme: branding.theme || 'light',
        }, { transaction: t });

        // Create contacts
        await businessContactRepository.create({
          businessId: business.id,
          email: contacts.email || email,
          phone: contacts.phone || phone,
          alternatePhone: contacts.alternatePhone || null,
          website: contacts.website || website,
        }, { transaction: t });

        // Create Address
        await businessAddressRepository.create({
          businessId: business.id,
          addressLine1: address.addressLine1 || 'Main HQ Street',
          addressLine2: address.addressLine2 || null,
          city: address.city || 'HQ City',
          state: address.state || 'HQ State',
          country: address.country || 'India',
          postalCode: address.postalCode || '110001',
          latitude: address.latitude || null,
          longitude: address.longitude || null,
          addressType: address.addressType || 'registered',
          isDefault: true,
        }, { transaction: t });

        // Create Preferences if provided
        if (preferences && preferences.length > 0) {
          for (const pref of preferences) {
            await businessPreferenceRepository.create({
              businessId: business.id,
              key: pref.key,
              value: pref.value,
              datatype: pref.datatype || 'string',
              category: pref.category || 'general',
            }, { transaction: t });
          }
        } else {
          await businessPreferenceRepository.create({
            businessId: business.id,
            key: 'system.notification_channel',
            value: 'email',
            datatype: 'string',
            category: 'system',
          }, { transaction: t });
        }

        // Create default Branch for this new Business
        const defaultBranch = await branchRepository.create({
          tenantId: tenant.id,
          businessId: business.id,
          name: `${name} Main Branch`,
        }, { transaction: t });

        // Enroll owner/creator user in Business Membership (BUS-101)
        const creatorId = RequestContext.userId || 'system';
        await businessMembershipRepository.create({
          businessId: business.id,
          userId: creatorId,
          role: 'owner',
          status: 'active',
        }, { transaction: t });

        // Enroll owner/creator user in User Membership registry (for workspace routing)
        await userMembershipRepository.create({
          userId: creatorId,
          tenantId: tenant.id,
          businessId: business.id,
          branchId: defaultBranch.id,
          roleId: 2, // Admin role ID
          status: 'active',
        }, { transaction: t });

        // ─── Transactional Outbox Pattern ───────────────────────────────────────
        const event = new BusinessCreatedEvent(
          RequestContext.userId,
          RequestContext.requestId,
          RequestContext.correlationId,
          business
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
          'business:created',
          'business',
          `Business ${name} provisioned successfully.`
        );

        return await this.getBusinessByUuid(business.uuid);
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } finally {
      await memoryLockProvider.release(lockKey);
    }
  }

  /**
   * Update Business root metadata with Optimistic Locking check
   */
  async updateBusiness(uuid, data) {
    const business = await businessRepository.findOne({ uuid });
    if (!business) {
      throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');
    }

    if (data.version !== undefined && data.version !== business.version) {
      throw new ConflictError(
        'Concurrent overwrite conflict detected. The record has been modified by another process. Please reload and retry.',
        'CONCURRENT_OVERWRITE_CONFLICT'
      );
    }

    const t = await sequelize.transaction();
    try {
      // Validate and lock via version updates
      const updated = await businessRepository.update(business.id, {
        ...data,
        version: business.version + 1, // Enforces optimistic locking counter increment
      }, {
        transaction: t,
        where: { version: business.version } // Query where exact version matches!
      });

      if (!updated) {
        throw new ConflictError(
          'Concurrent overwrite conflict detected. The record has been modified by another process. Please reload and retry.',
          'CONCURRENT_OVERWRITE_CONFLICT'
        );
      }

      // Outbox event
      const event = new BusinessUpdatedEvent(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        business.uuid,
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
        'business:updated',
        'business',
        `Business metadata updated for ${business.name}`
      );

      return await this.getBusinessByUuid(business.uuid);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Update settings configurations
   */
  async updateBusinessSettings(uuid, settingsArray) {
    const business = await businessRepository.findOne({ uuid });
    if (!business) {
      throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');
    }

    const t = await sequelize.transaction();
    try {
      for (const item of settingsArray) {
        const { key, value, datatype, category } = item;
        const existing = await businessSettingsRepository.findOne({ businessId: business.id, key });
        if (existing) {
          await businessSettingsRepository.update(existing.id, { value, datatype, category }, { transaction: t });
        } else {
          await businessSettingsRepository.create({
            businessId: business.id,
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
        'business:settings_updated',
        'business',
        `Business configuration settings updated for ${business.name}`
      );

      return await this.getBusinessByUuid(business.uuid);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Update branding configurations
   */
  async updateBusinessBranding(uuid, data) {
    const business = await businessRepository.findOne({ uuid });
    if (!business) {
      throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');
    }

    const branding = await businessBrandingRepository.findOne({ businessId: business.id });
    if (!branding) {
      throw new NotFoundError('Business branding record not found', 'BRANDING_NOT_FOUND');
    }

    const t = await sequelize.transaction();
    try {
      await businessBrandingRepository.update(branding.id, data, { transaction: t });
      await t.commit();

      auditService.logPlatformAction(
        RequestContext.userId,
        'business:branding_updated',
        'business',
        `Business branding theme updated for ${business.name}`
      );

      return await this.getBusinessByUuid(business.uuid);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Helper to execute transition states using LifecycleManager state machine
   */
  async _updateStatus(uuid, action, auditAction, eventClass) {
    const business = await businessRepository.findOne({ uuid });
    if (!business) {
      throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');
    }

    const targetStatus = LifecycleManager.validateTransition(business.status, action);
    const updates = LifecycleManager.getTimestampsForState(targetStatus);

    const t = await sequelize.transaction();
    try {
      await businessRepository.update(business.id, updates, { transaction: t });

      // Dispatch outbox event
      const event = new eventClass(
        RequestContext.userId,
        RequestContext.requestId,
        RequestContext.correlationId,
        business.uuid
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
        'business',
        `Business ${business.name} state changed to ${targetStatus}`
      );

      return await this.getBusinessByUuid(business.uuid);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async activateBusiness(uuid) {
    return await this._updateStatus(uuid, 'active', 'business:activated', BusinessRestoredEvent);
  }

  async suspendBusiness(uuid) {
    return await this._updateStatus(uuid, 'suspended', 'business:suspended', BusinessSuspendedEvent);
  }

  async archiveBusiness(uuid) {
    return await this._updateStatus(uuid, 'archived', 'business:archived', BusinessArchivedEvent);
  }

  async restoreBusiness(uuid) {
    return await this._updateStatus(uuid, 'restore', 'business:restored', BusinessRestoredEvent);
  }

  async deleteBusiness(uuid) {
    return await this._updateStatus(uuid, 'deleted', 'business:deleted', BusinessDeletedEvent);
  }

  /**
   * Retrieve platform-generic health diagnostics
   */
  async getBusinessHealth(uuid) {
    const business = await businessRepository.findOne({ uuid });
    if (!business) {
      throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');
    }

    // Evaluate policies or fetch resource counts
    const subscription = await subscriptionRepository.findOne({ tenantId: business.tenantId });
    const branchCount = await branchRepository.count({ businessId: business.id });
    const userCount = await userMembershipRepository.count({ businessId: business.id });

    return {
      businessUuid: business.uuid,
      name: business.name,
      status: business.status,
      subscriptionPlan: subscription ? subscription.planId : 'Free',
      metrics: {
        totalBranches: branchCount,
        totalUsers: userCount,
        allocatedStorageBytes: 1073741824, // 1 GB placeholder (Platform-generic)
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
   * Retrieve platform-generic activity summaries
   */
  async getBusinessSummary(uuid) {
    const business = await businessRepository.findOne({ uuid });
    if (!business) {
      throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');
    }

    // Retrieve last active user sessions generic to the business
    const memberships = await userMembershipRepository.findMany({ businessId: business.id });
    const userIds = memberships.map((m) => m.userId);

    const activeSessionsCount = await userSessionRepository.count({
      userId: { [Op.in]: userIds },
      status: 'active',
    });

    const recentAudits = await platformAuditRepository.findMany({}, { limit: 5, order: [['createdAt', 'DESC']] });

    return {
      businessUuid: business.uuid,
      name: business.name,
      legalName: business.legalName,
      status: business.status,
      ownerEmail: business.email,
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

const platformBusinessService = new PlatformBusinessService();
module.exports = platformBusinessService;
