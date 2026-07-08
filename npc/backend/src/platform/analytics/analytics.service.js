'use strict';

const sequelize = require('../../config/database');
const Tenant = require('../tenant/tenant.model');
const logger = require('../../shared/logger');

class AnalyticsService {
  /**
   * Platform Analytics (Super Admin perspective)
   */
  async getPlatformMetrics() {
    try {
      const activeTenants = await Tenant.count({ where: { isActive: true, isDeleted: false } });
      const totalTenants = await Tenant.count({ where: { isDeleted: false } });
      
      return {
        activeTenants,
        totalTenants,
        churnRate: totalTenants > 0 ? ((totalTenants - activeTenants) / totalTenants) * 100 : 0,
        mrrEstimate: activeTenants * 49, // Placeholder pricing logic
      };
    } catch (err) {
      logger.error('[AnalyticsService] Error fetching platform metrics:', err);
      throw err;
    }
  }

  /**
   * Tenant Analytics (Specific Tenant perspective)
   */
  async getTenantMetrics(tenantId) {
    try {
      // Query tenant specific invoices/batches dynamically.
      // Legacy queries will hook into this later in Phase 1.
      return {
        tenantId,
        queryTimestamp: new Date(),
        status: 'Operational',
      };
    } catch (err) {
      logger.error(`[AnalyticsService] Error fetching metrics for tenant ${tenantId}:`, err);
      throw err;
    }
  }
}

const analyticsService = new AnalyticsService();
module.exports = analyticsService;
