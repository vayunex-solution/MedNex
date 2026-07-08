'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Business = require('./business.model');

class BusinessRepository extends BaseRepository {
  constructor() {
    super(Business);
  }
}

const businessRepository = new BusinessRepository();
module.exports = businessRepository;
