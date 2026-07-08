'use strict';

const BaseService = require('../../shared/core/base.service');
const businessRepository = require('./business.repository');

class BusinessService extends BaseService {
  constructor() {
    super(businessRepository);
  }
}

const businessService = new BusinessService();
module.exports = businessService;
