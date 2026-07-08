'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Tenant = require('./tenant.model');

class TenantRepository extends BaseRepository {
  constructor() {
    super(Tenant);
  }
}

const tenantRepository = new TenantRepository();
module.exports = tenantRepository;
