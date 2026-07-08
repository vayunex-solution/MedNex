'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const UserDevice = require('./userDevice.model');

class UserDeviceRepository extends BaseRepository {
  constructor() {
    super(UserDevice);
  }
}

module.exports = new UserDeviceRepository();
