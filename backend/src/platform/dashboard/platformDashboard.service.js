'use strict';

const tenantRepository = require('../tenant/tenant.repository');
const businessRepository = require('../business/business.repository');
const branchRepository = require('../branch/branch.repository');
const userRepository = require('../identity/user.repository');
const userSessionRepository = require('../identity/userSession.repository');
const platformAuditRepository = require('../audit/platformAudit.repository');
const tenantAuditRepository = require('../audit/tenantAudit.repository');
const logger = require('../../shared/logger');

class PlatformDashboardService {
  /**
   * Gather platform metrics and health status for Super Admin
   */
  async getDashboardData() {
    try {
      // 1. Fetch counts across the system
      const totalTenants = await tenantRepository.count();
      const activeTenants = await tenantRepository.count({ isActive: true });
      const totalBusinesses = await businessRepository.count();
      const totalBranches = await branchRepository.count();
      const totalUsers = await userRepository.count({ isDeleted: false });
      const activeSessions = await userSessionRepository.count({ isActive: true });

      // 2. Fetch recent activity audits (last 10 platform & tenant activities)
      const recentPlatformAudits = await platformAuditRepository.findMany({}, {
        limit: 10,
        order: [['createdAt', 'DESC']],
      });

      const recentTenantAudits = await tenantAuditRepository.findMany({}, {
        limit: 10,
        order: [['createdAt', 'DESC']],
      });

      // 3. Gather system health resource diagnostics
      const systemHealth = {
        nodeVersion: process.version,
        platformUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date(),
      };

      return {
        counts: {
          totalTenants,
          activeTenants,
          totalBusinesses,
          totalBranches,
          totalUsers,
          activeSessions,
        },
        health: systemHealth,
        recentActivity: {
          platform: recentPlatformAudits,
          tenant: recentTenantAudits,
        },
      };
    } catch (err) {
      logger.error('[PlatformDashboardService] Error gathering dashboard metrics:', err);
      throw err;
    }
  }
}

const platformDashboardService = new PlatformDashboardService();
module.exports = platformDashboardService;
