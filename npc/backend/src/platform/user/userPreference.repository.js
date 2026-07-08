'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const UserPreference = require('./userPreference.model');

class UserPreferenceRepository extends BaseRepository {
  constructor() {
    super(UserPreference);
  }
}

module.exports = new UserPreferenceRepository();
