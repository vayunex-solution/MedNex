'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Application = require('./application.model');

class ApplicationRepository extends BaseRepository {
  constructor() {
    super(Application);
  }
}

module.exports = new ApplicationRepository();
