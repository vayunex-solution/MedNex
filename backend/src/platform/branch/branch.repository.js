'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Branch = require('./branch.model');

class BranchRepository extends BaseRepository {
  constructor() {
    super(Branch);
  }
}

const branchRepository = new BranchRepository();
module.exports = branchRepository;
