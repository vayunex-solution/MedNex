'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const RolePermission = require('./rolePermission.model');

class RolePermissionRepository extends BaseRepository {
  constructor() {
    super(RolePermission);
  }
}

const rolePermissionRepository = new RolePermissionRepository();
module.exports = rolePermissionRepository;
