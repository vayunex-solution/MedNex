'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationFeatureFlag = require('./applicationFeatureFlag.model');

class ApplicationFeatureFlagRepository extends BaseRepository {
  constructor() {
    super(ApplicationFeatureFlag);
  }
}

module.exports = new ApplicationFeatureFlagRepository();
