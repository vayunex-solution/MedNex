'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Role = require('./role.model');

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }
}

const roleRepository = new RoleRepository();
module.exports = roleRepository;
