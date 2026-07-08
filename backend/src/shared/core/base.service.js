'use strict';

const RequestContext = require('./context');
const { ValidationError, UnauthorizedError, ForbiddenError } = require('../errors/AppError');

class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Helper to verify if user has a specific permission
   */
  checkPermission(permission) {
    const userPermissions = RequestContext.permissions || [];
    if (!userPermissions.includes(permission)) {
      throw new ForbiddenError(`Missing required permission: ${permission}`);
    }
  }

  /**
   * Helper to verify if a feature flag is enabled
   */
  checkFeature(feature) {
    const enabledFeatures = RequestContext.features || [];
    if (!enabledFeatures.includes(feature)) {
      throw new ForbiddenError(`Feature not unlocked on current plan: ${feature}`);
    }
  }

  /**
   * Database transaction manager wrapper
   */
  async withTransaction(callback) {
    return await this.repository.transaction(callback);
  }

  // Hook placeholders for subclasses to override
  async beforeCreate(data) {}
  async afterCreate(record) {}
  async beforeUpdate(id, data, record) {}
  async afterUpdate(record) {}
  async beforeDelete(id, record) {}
  async afterDelete(id) {}

  async getAll(where = {}, options = {}) {
    return await this.repository.findMany(where, options);
  }

  async getPaginated(where = {}, page = 1, limit = 20, options = {}) {
    return await this.repository.paginate(where, page, limit, options);
  }

  async getById(id, options = {}) {
    const record = await this.repository.findById(id, options);
    if (!record) {
      return null;
    }
    return record;
  }

  async create(data, options = {}) {
    await this.beforeCreate(data);
    
    let record;
    if (options.transaction) {
      record = await this.repository.create(data, options);
      await this.afterCreate(record);
    } else {
      record = await this.withTransaction(async (t) => {
        const rec = await this.repository.create(data, { ...options, transaction: t });
        await this.afterCreate(rec);
        return rec;
      });
    }

    return record;
  }

  async update(id, data, options = {}) {
    const record = await this.repository.findById(id, options);
    if (!record) {
      return null;
    }

    await this.beforeUpdate(id, data, record);

    let updatedRecord;
    if (options.transaction) {
      updatedRecord = await this.repository.update(id, data, options);
      await this.afterUpdate(updatedRecord);
    } else {
      updatedRecord = await this.withTransaction(async (t) => {
        const rec = await this.repository.update(id, data, { ...options, transaction: t });
        await this.afterUpdate(rec);
        return rec;
      });
    }

    return updatedRecord;
  }

  async delete(id, options = {}) {
    const record = await this.repository.findById(id, options);
    if (!record) {
      return false;
    }

    await this.beforeDelete(id, record);

    let result;
    if (options.transaction) {
      result = await this.repository.softDelete(id, options);
      await this.afterDelete(id);
    } else {
      result = await this.withTransaction(async (t) => {
        const res = await this.repository.softDelete(id, { ...options, transaction: t });
        await this.afterDelete(id);
        return res;
      });
    }

    return result;
  }
}

module.exports = BaseService;
