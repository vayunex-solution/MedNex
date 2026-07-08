'use strict';

const roleRepository = require('./role.repository');
const permissionRepository = require('./permission.repository');
const rolePermissionRepository = require('./rolePermission.repository');
const memoryCache = require('../../shared/cache/memory.cache');
const logger = require('../../shared/logger');

class RbacService {
  async assignPermissionToRole(roleName, permissionName) {
    try {
      const [role] = await roleRepository.findOrCreate({ where: { name: roleName }, defaults: { name: roleName } });
      const [permission] = await permissionRepository.findOrCreate({ where: { name: permissionName }, defaults: { name: permissionName } });

      await rolePermissionRepository.findOrCreate({
        where: { roleId: role.id, permissionId: permission.id },
      });

      // Clear cached permissions dynamically for this role
      await memoryCache.del(`rbac:role:${roleName}`);
      return true;
    } catch (err) {
      logger.error(`[RbacService] Error assigning permission ${permissionName} to role ${roleName}:`, err);
      throw err;
    }
  }

  async getPermissionsForRole(roleName) {
    const cacheKey = `rbac:role:${roleName}`;
    const cached = await memoryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const role = await roleRepository.findOne({ name: roleName });
      if (!role) {
        return [];
      }

      // Fetch all role permissions in raw format
      const permissions = await rolePermissionRepository.findMany({ roleId: role.id });
      const ids = permissions.map(rp => rp.permissionId);

      if (ids.length === 0) {
        return [];
      }

      const records = await permissionRepository.findMany({ id: ids });
      const list = records.map(r => r.name);

      await memoryCache.set(cacheKey, list, 600); // cache for 10 minutes
      return list;
    } catch (err) {
      logger.error(`[RbacService] Error fetching permissions for role ${roleName}:`, err);
      return [];
    }
  }

  async checkPermission(roleName, requiredPermission) {
    // Super admins automatically bypass all permission locks
    if (roleName === 'super_admin') {
      return true;
    }
    const permissions = await this.getPermissionsForRole(roleName);
    return permissions.includes(requiredPermission);
  }
}

const rbacService = new RbacService();
module.exports = rbacService;
