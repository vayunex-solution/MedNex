'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const UserNotificationPreference = require('./userNotificationPreference.model');

class UserNotificationPreferenceRepository extends BaseRepository {
  constructor() {
    super(UserNotificationPreference);
  }
}

module.exports = new UserNotificationPreferenceRepository();
