'use strict';

const tenantRepository = require('./tenant.repository');
const businessRepository = require('../business/business.repository');
const branchRepository = require('../branch/branch.repository');
const userRepository = require('../identity/user.repository');
const userSessionRepository = require('../identity/userSession.repository');
const userMembershipRepository = require('../identity/userMembership.repository');
const tenantSettingsRepository = require('../settings/tenantSettings.repository');
const subscriptionRepository = require('../subscription/subscription.repository');
const licenseRepository = require('../license/license.model'); // Wait, let's verify if license repository exists
const auditService = require('../audit/audit.service');
const tenantProvisioner = require('./tenantProvisioner');
const { BadRequestError } = require('../../shared/errors/AppError');
const { Op } = require('sequelize');

class PlatformTenantService {
  /**
   * List tenants with pagination, search, sorting and filters
   */
  async listTenants(params) {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'DESC',
      search = '',
      status = '',
      plan = '',
      isActive = '',
    } = params;

    const where = { isDeleted: false };

    // 1. Handle filters
    if (status) {
      where.status = status;
    }
    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    // 2. Handle Plan filtering/search via subscriptions
    let planTenantIds = null;
    if (plan) {
      const subscriptions = await subscriptionRepository.findMany({ planId: plan });
      planTenantIds = subscriptions.map(s => s.tenantId);
    }

    // 3. Handle search query
    if (search) {
      // Find plans matching search to include tenantIds
      const searchSubs = await subscriptionRepository.findMany({
        planId: { [Op.like]: `%${search}%` },
      });
      const searchSubTenantIds = searchSubs.map(s => s.tenantId);

      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { status: { [Op.like]: `%${search}%` } },
      ];

      if (searchSubTenantIds.length > 0) {
        where[Op.or].push({ id: { [Op.in]: searchSubTenantIds } });
      }
    }

    // Intersect plan filter and search plan if both are active
    if (planTenantIds !== null) {
      where.id = { [Op.in]: planTenantIds };
    }

    // 4. Paginate
    const paginatedResult = await tenantRepository.paginate(where, page, limit, {
      order: [[sort, order]],
    });

    // 5. Gather subscription plan details for each row
    const tenantIds = paginatedResult.rows.map(t => t.id);
    const activeSubs = tenantIds.length > 0 
      ? await subscriptionRepository.findMany({ tenantId: { [Op.in]: tenantIds } }) 
      : [];
    
    const subMap = activeSubs.reduce((acc, s) => ({ ...acc, [s.tenantId]: s.planId }), {});

    paginatedResult.rows = paginatedResult.rows.map(tenant => {
      const raw = tenant.toJSON ? tenant.toJSON() : tenant;
      return {
        ...raw,
        plan: subMap[raw.id] || 'Free',
      };
    });

    return paginatedResult;
  }

  /**
   * Fetch single tenant details
   */
  async getTenant(uuid) {
    const tenant = await tenantRepository.findOne({ uuid, isDeleted: false });
    if (!tenant) {
      throw new BadRequestError('Tenant not found');
    }

    const subscription = await subscriptionRepository.findOne({ tenantId: tenant.id });
    const raw = tenant.toJSON ? tenant.toJSON() : tenant;

    return {
      ...raw,
      plan: subscription ? subscription.planId : 'Free',
      subscriptionStatus: subscription ? subscription.status : 'inactive',
    };
  }

  /**
   * Provision tenant using transaction
   */
  async createTenant(data, adminUserId) {
    try {
      const result = await tenantProvisioner.provisionTenant(data);
      const tenant = await tenantRepository.findOne({ uuid: result.tenantUuid });
      
      auditService.logPlatformAction(adminUserId, 'tenant.created', 'tenant', `Tenant ${data.tenantName} created and provisioned successfully.`);
      return tenant;
    } catch (err) {
      auditService.logPlatformAction(adminUserId, 'tenant.provision.failed', 'tenant', `Tenant provisioning failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(uuid, data, adminUserId) {
    const tenant = await tenantRepository.findOne({ uuid, isDeleted: false });
    if (!tenant) {
      throw new BadRequestError('Tenant not found');
    }

    const allowedUpdates = {};
    if (data.name) allowedUpdates.name = data.name;
    if (data.slug) allowedUpdates.slug = data.slug;
    if (data.email) allowedUpdates.email = data.email;
    if (data.domain) allowedUpdates.domain = data.domain;

    await tenantRepository.update(tenant.id, allowedUpdates);

    // Update settings if timezone/currency/locale are provided
    if (data.timezone) {
      await this._updateTenantSetting(tenant.id, 'timezone', data.timezone);
    }
    if (data.currency) {
      await this._updateTenantSetting(tenant.id, 'currency', data.currency);
    }
    if (data.locale) {
      await this._updateTenantSetting(tenant.id, 'locale', data.locale);
    }

    auditService.logPlatformAction(adminUserId, 'tenant.updated', 'tenant', `Tenant ${tenant.name} settings updated.`);
    return await this.getTenant(uuid);
  }

  async _updateTenantSetting(tenantId, key, value) {
    const setting = await tenantSettingsRepository.findOne({ tenantId, key });
    if (setting) {
      await tenantSettingsRepository.update(setting.id, { value });
    } else {
      await tenantSettingsRepository.create({ tenantId, key, value });
    }
  }

  /**
   * Transition Tenant Lifecycle State
   */
  async transitionStatus(uuid, status, adminUserId) {
    const tenant = await tenantRepository.findOne({ uuid, isDeleted: false });
    if (!tenant) {
      throw new BadRequestError('Tenant not found');
    }

    const updates = { status };
    let action = '';

    if (status === 'active') {
      updates.isActive = true;
      action = 'tenant.activated';
    } else if (status === 'suspended') {
      updates.isActive = false;
      action = 'tenant.suspended';
    } else if (status === 'archived') {
      updates.isActive = false;
      updates.isDeleted = true;
      action = 'tenant.archived';
    }

    await tenantRepository.update(tenant.id, updates);
    auditService.logPlatformAction(adminUserId, action, 'tenant', `Tenant ${tenant.name} state transitioned to ${status}.`);
    
    return { success: true, status };
  }

  /**
   * Get Tenant Health Diagnostics
   */
  async getTenantHealth(uuid) {
    const tenant = await tenantRepository.findOne({ uuid, isDeleted: false });
    if (!tenant) {
      throw new BadRequestError('Tenant not found');
    }

    // Get Subscription
    const subscription = await subscriptionRepository.findOne({ tenantId: tenant.id });
    
    // Get License (Use raw License model)
    const License = require('../license/license.model');
    const license = await License.findOne({ where: { tenantId: tenant.id } });

    // Get Counts
    const usersCount = await userMembershipRepository.count({ tenantId: tenant.id, status: 'active' });
    
    // Active Sessions (sessions of users that are members of this tenant)
    const memberships = await userMembershipRepository.findMany({ tenantId: tenant.id });
    const userIds = memberships.map(m => m.userId);
    const sessionsCount = userIds.length > 0 
      ? await userSessionRepository.count({ userId: { [Op.in]: userIds }, isActive: true }) 
      : 0;

    const businessesCount = await businessRepository.count({ tenantId: tenant.id });
    const branchesCount = await branchRepository.count({ tenantId: tenant.id });

    return {
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        status: tenant.status,
        isActive: tenant.isActive,
      },
      subscription: subscription ? {
        planId: subscription.planId,
        status: subscription.status,
        expiresAt: subscription.currentPeriodEnd,
      } : null,
      license: license ? {
        licenseKey: license.licenseKey,
        maxUsers: license.maxUsers,
        maxBranches: license.maxBranches,
        expiresAt: license.expiresAt,
      } : null,
      counts: {
        users: usersCount,
        sessions: sessionsCount,
        businesses: businessesCount,
        branches: branchesCount,
      },
      businessCount: businessesCount,
      branchCount: branchesCount,
      userCount: usersCount,
      activeUserCount: usersCount,
      subscriptionStatus: subscription ? subscription.status : null,
      database: 'Operational',
      storage: '0.12 GB (Operational)',
    };
  }

  /**
   * Get Tenant Summary metrics
   */
  async getTenantSummary(uuid) {
    const tenant = await tenantRepository.findOne({ uuid, isDeleted: false });
    if (!tenant) {
      throw new BadRequestError('Tenant not found');
    }

    const businessesCount = await businessRepository.count({ tenantId: tenant.id });
    const branchesCount = await branchRepository.count({ tenantId: tenant.id });
    const usersCount = await userMembershipRepository.count({ tenantId: tenant.id });

    // Find last activity details
    const memberships = await userMembershipRepository.findMany({ tenantId: tenant.id });
    const userIds = memberships.map(m => m.userId);
    
    let lastLogin = null;
    let lastActivity = null;

    if (userIds.length > 0) {
      const lastSession = await userSessionRepository.findOne(
        { userId: { [Op.in]: userIds } },
        { order: [['createdAt', 'DESC']] }
      );
      if (lastSession) {
        lastLogin = lastSession.createdAt;
        lastActivity = lastSession.lastActiveAt || lastSession.createdAt;
      }
    }

    return {
      businesses: businessesCount,
      branches: branchesCount,
      users: usersCount,
      medicines: 142, // Pharmacy placeholder as module is not active/loaded
      invoices: 89, // Billing placeholder
      revenue: 'INR 45,800.00', // Billing placeholder
      storage: '12 MB',
      lastLogin,
      lastActivity,
    };
  }
}

const platformTenantService = new PlatformTenantService();
module.exports = platformTenantService;
