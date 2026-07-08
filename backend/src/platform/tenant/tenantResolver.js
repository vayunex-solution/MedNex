'use strict';

const Tenant = require('./tenant.model');
const memoryCache = require('../../shared/cache/memory.cache');
const logger = require('../../shared/logger');

class TenantResolver {
  /**
   * Helper to check if a string is a valid UUID
   */
  _isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Resolve tenant from Request context headers, JWT, or subdomain.
   * Returns numeric tenant ID (for internal db scoping) or null.
   */
  async resolveTenant(req) {
    // 1. Single Tenant Mode check
    if (process.env.SINGLE_TENANT_MODE === 'true') {
      const defaultId = process.env.DEFAULT_TENANT_ID;
      if (defaultId) {
        return parseInt(defaultId);
      }
    }

    // 2. JWT Mode check (if req.user has tenantId already populated)
    if (req.user && req.user.tenantId) {
      return req.user.tenantId;
    }

    // 3. Header Mode check (X-Tenant-ID header)
    const tenantHeader = req.headers['x-tenant-id'];
    if (tenantHeader) {
      return await this._resolveFromIdentifier(tenantHeader);
    }

    // 4. Subdomain Mode check (Future-proofed)
    const host = req.headers.host || '';
    const parts = host.split('.');
    if (parts.length > 2) {
      const subdomain = parts[0];
      // Skip common system subdomains
      if (subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'app') {
        return await this._resolveFromSubdomain(subdomain);
      }
    }

    return null;
  }

  /**
   * Internal helper to resolve numeric ID from UUID or numeric string
   */
  async _resolveFromIdentifier(identifier) {
    const cacheKey = `tenant:id:${identifier}`;
    const cachedId = await memoryCache.get(cacheKey);
    if (cachedId) {
      return cachedId;
    }

    try {
      let tenant = null;
      if (this._isUUID(identifier)) {
        tenant = await Tenant.findOne({ where: { uuid: identifier, isDeleted: false, isActive: true } });
      } else {
        // Fallback for numeric ID headers in transition phase
        const numId = parseInt(identifier);
        if (!isNaN(numId)) {
          tenant = await Tenant.findOne({ where: { id: numId, isDeleted: false, isActive: true } });
        }
      }

      if (tenant) {
        await memoryCache.set(cacheKey, tenant.id, 600); // cache for 10 minutes
        return tenant.id;
      }
    } catch (err) {
      logger.error(`[TenantResolver] Error resolving tenant identifier ${identifier}:`, err);
    }
    return null;
  }

  /**
   * Internal helper to resolve numeric ID from subdomain string
   */
  async _resolveFromSubdomain(subdomain) {
    const cacheKey = `tenant:subdomain:${subdomain}`;
    const cachedId = await memoryCache.get(cacheKey);
    if (cachedId) {
      return cachedId;
    }

    try {
      const tenant = await Tenant.findOne({
        where: { subdomain, isDeleted: false, isActive: true },
      });
      if (tenant) {
        await memoryCache.set(cacheKey, tenant.id, 600);
        return tenant.id;
      }
    } catch (err) {
      logger.error(`[TenantResolver] Error resolving subdomain ${subdomain}:`, err);
    }
    return null;
  }
}

const tenantResolver = new TenantResolver();
module.exports = tenantResolver;
