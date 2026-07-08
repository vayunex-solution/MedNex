'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BranchMembership = require('./branchMembership.model');

class BranchMembershipRepository extends BaseRepository {
  constructor() {
    super(BranchMembership);
  }
}

const branchMembershipRepository = new BranchMembershipRepository();
module.exports = branchMembershipRepository;
