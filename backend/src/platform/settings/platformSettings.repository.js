'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const PlatformSettings = require('./platformSettings.model');

class PlatformSettingsRepository extends BaseRepository {
  constructor() {
    super(PlatformSettings);
  }
}

const platformSettingsRepository = new PlatformSettingsRepository();
module.exports = platformSettingsRepository;
