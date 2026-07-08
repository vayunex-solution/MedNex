'use strict';

const RequestContext = require('./context');
const { Op } = require('sequelize');

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Run custom instance hooks if defined
   */
  async runHook(name, ...args) {
    if (typeof this[name] === 'function') {
      await this[name](...args);
    }
  }

  /**
   * Apply tenant scoping & soft-delete filtering to options
   */
  _applyScope(options = {}) {
    const opts = { ...options };
    opts.where = opts.where ? { ...opts.where } : {};

    // Auto-scope by tenantId if column exists in model
    if (this.model.rawAttributes.tenantId && RequestContext.tenantId) {
      opts.where.tenantId = RequestContext.tenantId;
    }

    // Auto-scope by branchId if column exists in model
    if (this.model.rawAttributes.branchId && RequestContext.branchId) {
      opts.where.branchId = RequestContext.branchId;
    }

    // Auto-scope by isDeleted: false if column exists in model (unless includeDeleted is true)
    if (this.model.rawAttributes.isDeleted && opts.where.isDeleted === undefined && !options.includeDeleted) {
      opts.where.isDeleted = false;
    }

    return opts;
  }

  async findById(id, options = {}) {
    const opts = this._applyScope(options);
    opts.where.id = id;
    return await this.model.findOne(opts);
  }

  async findOne(where = {}, options = {}) {
    const opts = this._applyScope(options);
    opts.where = { ...opts.where, ...where };
    return await this.model.findOne(opts);
  }

  async findMany(where = {}, options = {}) {
    const opts = this._applyScope(options);
    opts.where = { ...opts.where, ...where };
    return await this.model.findAll(opts);
  }

  async findAndCountAll(where = {}, options = {}) {
    const opts = this._applyScope(options);
    opts.where = { ...opts.where, ...where };
    return await this.model.findAndCountAll(opts);
  }

  async paginate(where = {}, page = 1, limit = 20, options = {}) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const opts = this._applyScope(options);
    opts.where = { ...opts.where, ...where };
    opts.limit = limitNum;
    opts.offset = offset;

    const { count, rows } = await this.model.findAndCountAll(opts);
    return {
      count,
      rows,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
    };
  }

  async cursorPaginate(where = {}, cursor = null, limit = 20, options = {}) {
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const opts = this._applyScope(options);
    opts.where = { ...opts.where, ...where };
    opts.limit = limitNum;
    opts.order = opts.order || [['id', 'DESC']];

    // Parse cursor if passed
    if (cursor) {
      try {
        const parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('ascii'));
        const primaryOrder = opts.order[0];
        const orderField = primaryOrder[0];
        const orderDir = primaryOrder[1].toUpperCase();

        const operator = orderDir === 'DESC' ? Op.lt : Op.gt;
        opts.where[orderField] = { [operator]: parsedCursor[orderField] };
      } catch (err) {
        logger.warn('[BaseRepository] Failed to parse pagination cursor:', err);
      }
    }

    const rows = await this.model.findAll(opts);
    const nextRecord = rows.length > 0 ? rows[rows.length - 1] : null;
    let nextCursor = null;

    if (nextRecord) {
      const primaryOrder = opts.order[0];
      const orderField = primaryOrder[0];
      const cursorData = {};
      cursorData[orderField] = nextRecord[orderField];
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    return {
      rows,
      nextCursor
    };
  }

  async search(query, searchFields = [], options = {}) {
    const opts = this._applyScope(options);
    if (query && searchFields.length > 0) {
      opts.where[Op.or] = searchFields.map((f) => ({
        [f]: { [Op.like]: `%${query}%` },
      }));
    }
    return await this.model.findAll(opts);
  }

  async filter(where = {}, options = {}) {
    return await this.findMany(where, options);
  }

  async exists(where = {}) {
    const opts = this._applyScope({ attributes: ['id'] });
    opts.where = { ...opts.where, ...where };
    const count = await this.model.count(opts);
    return count > 0;
  }

  async count(where = {}) {
    const opts = this._applyScope();
    opts.where = { ...opts.where, ...where };
    return await this.model.count(opts);
  }

  async create(data, options = {}) {
    const payload = { ...data };
    
    // Inject context data if schema requires
    if (this.model.rawAttributes.tenantId && RequestContext.tenantId) {
      payload.tenantId = RequestContext.tenantId;
    }
    if (this.model.rawAttributes.branchId && RequestContext.branchId) {
      payload.branchId = RequestContext.branchId;
    }
    if (this.model.rawAttributes.createdBy && RequestContext.userId) {
      payload.createdBy = RequestContext.userId;
    }

    await this.runHook('beforeCreate', payload, options);
    const record = await this.model.create(payload, options);
    await this.runHook('afterCreate', record, options);
    return record;
  }

  async update(id, data, options = {}) {
    const opts = this._applyScope(options);
    opts.where.id = id;

    const record = await this.model.findOne(opts);
    if (!record) {
      return null;
    }

    const payload = { ...data };
    if (this.model.rawAttributes.updatedBy && RequestContext.userId) {
      payload.updatedBy = RequestContext.userId;
    }

    await this.runHook('beforeUpdate', id, payload, options);
    const updatedRecord = await record.update(payload, options);
    await this.runHook('afterUpdate', updatedRecord, options);
    return updatedRecord;
  }

  async bulkCreate(dataList, options = {}) {
    const scopedList = dataList.map((data) => {
      const payload = { ...data };
      if (this.model.rawAttributes.tenantId && RequestContext.tenantId) {
        payload.tenantId = RequestContext.tenantId;
      }
      if (this.model.rawAttributes.branchId && RequestContext.branchId) {
        payload.branchId = RequestContext.branchId;
      }
      if (this.model.rawAttributes.createdBy && RequestContext.userId) {
        payload.createdBy = RequestContext.userId;
      }
      return payload;
    });

    return await this.model.bulkCreate(scopedList, options);
  }

  async bulkUpdate(where = {}, data = {}, options = {}) {
    const opts = this._applyScope(options);
    opts.where = { ...opts.where, ...where };

    const payload = { ...data };
    if (this.model.rawAttributes.updatedBy && RequestContext.userId) {
      payload.updatedBy = RequestContext.userId;
    }

    return await this.model.update(payload, opts);
  }

  async bulkDelete(where = {}, options = {}) {
    const opts = this._applyScope(options);
    opts.where = { ...opts.where, ...where };
    return await this.model.destroy(opts);
  }

  async softDelete(id, options = {}) {
    const opts = this._applyScope(options);
    opts.where.id = id;

    const record = await this.model.findOne(opts);
    if (!record) {
      return false;
    }

    const payload = {};
    if (this.model.rawAttributes.isDeleted) {
      payload.isDeleted = true;
    }
    if (this.model.rawAttributes.updatedBy && RequestContext.userId) {
      payload.updatedBy = RequestContext.userId;
    }

    await this.runHook('beforeDelete', id, options);
    await record.update(payload, options);
    await this.runHook('afterDelete', id, options);
    return true;
  }

  async purge(id, options = {}) {
    const opts = this._applyScope(options);
    opts.where.id = id;
    opts.force = true;
    return await this.model.destroy(opts);
  }

  async restore(id, options = {}) {
    const opts = { ...options };
    opts.where = opts.where ? { ...opts.where } : {};
    opts.where.id = id;

    if (this.model.rawAttributes.tenantId && RequestContext.tenantId) {
      opts.where.tenantId = RequestContext.tenantId;
    }

    const record = await this.model.findOne(opts);
    if (!record) {
      return false;
    }

    const payload = {};
    if (this.model.rawAttributes.isDeleted) {
      payload.isDeleted = false;
    }
    if (this.model.rawAttributes.updatedBy && RequestContext.userId) {
      payload.updatedBy = RequestContext.userId;
    }

    await record.update(payload, options);
    return true;
  }

  async findOrCreate(options = {}) {
    const opts = this._applyScope(options);
    // Ensure default scoping params are inside defaults key
    if (opts.defaults) {
      if (this.model.rawAttributes.tenantId && RequestContext.tenantId) {
        opts.defaults.tenantId = RequestContext.tenantId;
      }
      if (this.model.rawAttributes.branchId && RequestContext.branchId) {
        opts.defaults.branchId = RequestContext.branchId;
      }
      if (this.model.rawAttributes.createdBy && RequestContext.userId) {
        opts.defaults.createdBy = RequestContext.userId;
      }
    }
    return await this.model.findOrCreate(opts);
  }

  async transaction(callback) {
    return await this.model.sequelize.transaction(callback);
  }
}

module.exports = BaseRepository;
