'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BusinessPreference = require('./businessPreference.model');

class BusinessPreferenceRepository extends BaseRepository {
  constructor() {
    super(BusinessPreference);
  }
}

const businessPreferenceRepository = new BusinessPreferenceRepository();
module.exports = businessPreferenceRepository;
