'use strict';

const BaseService = require('../../shared/core/base.service');
const platformSettingsRepository = require('./platformSettings.repository');

class PlatformSettingsService extends BaseService {
  constructor() {
    super(platformSettingsRepository);
  }

  async getVal(key, defaultVal = null) {
    const setting = await this.repository.findOne({ key });
    return setting ? setting.value : defaultVal;
  }

  async setVal(key, value, description = '') {
    const [setting] = await this.repository.findOrCreate({
      where: { key },
      defaults: { value, description },
    });
    if (!setting.isNewRecord) {
      await setting.update({ value });
    }
    return setting;
  }
}

const platformSettingsService = new PlatformSettingsService();
module.exports = platformSettingsService;
