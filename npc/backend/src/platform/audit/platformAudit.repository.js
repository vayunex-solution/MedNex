'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const PlatformAudit = require('./platformAudit.model');

class PlatformAuditRepository extends BaseRepository {
  constructor() {
    super(PlatformAudit);
  }
}

const platformAuditRepository = new PlatformAuditRepository();
module.exports = platformAuditRepository;
