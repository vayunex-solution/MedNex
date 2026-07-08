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

      // 3. Get operations count for last 7 days (Platform + Tenant Audits)
      const { Op, fn, col } = require('sequelize');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const platformAuditsGrouped = await platformAuditRepository.model.findAll({
        attributes: [
          [fn('DATE', col('createdAt')), 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo
          }
        },
        group: [fn('DATE', col('createdAt'))],
        raw: true
      });

      const tenantAuditsGrouped = await tenantAuditRepository.model.findAll({
        attributes: [
          [fn('DATE', col('createdAt')), 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo
          }
        },
        group: [fn('DATE', col('createdAt'))],
        raw: true
      });

      const activityData = [];
      const activityLabels = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const parseDateString = (dateVal) => {
        if (!dateVal) return '';
        const parsed = new Date(dateVal);
        if (isNaN(parsed.getTime())) return '';
        const offset = parsed.getTimezoneOffset();
        const localDate = new Date(parsed.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
      };

      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];

        const pCount = platformAuditsGrouped.reduce((sum, a) => {
          return parseDateString(a.date) === dateStr ? sum + Number(a.count) : sum;
        }, 0);

        const tCount = tenantAuditsGrouped.reduce((sum, a) => {
          return parseDateString(a.date) === dateStr ? sum + Number(a.count) : sum;
        }, 0);

        activityLabels.push(dayNames[d.getDay()]);
        activityData.push(pCount + tCount);
      }

      // 4. Gather system health resource diagnostics
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
        activity: {
          labels: activityLabels,
          data: activityData,
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
