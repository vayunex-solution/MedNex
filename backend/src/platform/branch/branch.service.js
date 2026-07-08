'use strict';

const BaseService = require('../../shared/core/base.service');
const branchRepository = require('./branch.repository');

class BranchService extends BaseService {
  constructor() {
    super(branchRepository);
  }
}

const branchService = new BranchService();
module.exports = branchService;
