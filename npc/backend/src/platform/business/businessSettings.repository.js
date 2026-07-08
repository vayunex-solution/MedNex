'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BusinessSettings = require('./businessSettings.model');

class BusinessSettingsRepository extends BaseRepository {
  constructor() {
    super(BusinessSettings);
  }
}

const businessSettingsRepository = new BusinessSettingsRepository();
module.exports = businessSettingsRepository;
