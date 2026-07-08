'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const UserProfile = require('./userProfile.model');

class UserProfileRepository extends BaseRepository {
  constructor() {
    super(UserProfile);
  }
}

module.exports = new UserProfileRepository();
