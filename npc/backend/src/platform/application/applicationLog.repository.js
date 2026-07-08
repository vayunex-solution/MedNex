'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationLog = require('./applicationLog.model');

class ApplicationLogRepository extends BaseRepository {
  constructor() {
    super(ApplicationLog);
  }
}

module.exports = new ApplicationLogRepository();
