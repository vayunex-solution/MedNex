'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BranchContact = require('./branchContact.model');

class BranchContactRepository extends BaseRepository {
  constructor() {
    super(BranchContact);
  }
}

const branchContactRepository = new BranchContactRepository();
module.exports = branchContactRepository;
