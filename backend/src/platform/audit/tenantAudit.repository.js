'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const TenantAudit = require('./tenantAudit.model');

class TenantAuditRepository extends BaseRepository {
  constructor() {
    super(TenantAudit);
  }
}

const tenantAuditRepository = new TenantAuditRepository();
module.exports = tenantAuditRepository;
