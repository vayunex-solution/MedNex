'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const TenantSettings = require('./tenantSettings.model');

class TenantSettingsRepository extends BaseRepository {
  constructor() {
    super(TenantSettings);
  }
}

const tenantSettingsRepository = new TenantSettingsRepository();
module.exports = tenantSettingsRepository;
