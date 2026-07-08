'use strict';

const BaseService = require('../../shared/core/base.service');
const tenantRepository = require('./tenant.repository');
const TenantSettings = require('../settings/tenantSettings.model');

class TenantService extends BaseService {
  constructor() {
    super(tenantRepository);
  }

  async getSettings(tenantId) {
    return await TenantSettings.findAll({ where: { tenantId } });
  }

  async updateSetting(tenantId, key, value) {
    const [setting] = await TenantSettings.findOrCreate({
      where: { tenantId, key },
      defaults: { value },
    });
    if (!setting.isNewRecord) {
      await setting.update({ value });
    }
    return setting;
  }
}

const tenantService = new TenantService();
module.exports = tenantService;
