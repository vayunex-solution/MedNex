'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Permission = require('./permission.model');

class PermissionRepository extends BaseRepository {
  constructor() {
    super(Permission);
  }
}

const permissionRepository = new PermissionRepository();
module.exports = permissionRepository;
