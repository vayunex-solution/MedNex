'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BusinessMembership = require('./businessMembership.model');

class BusinessMembershipRepository extends BaseRepository {
  constructor() {
    super(BusinessMembership);
  }
}

const businessMembershipRepository = new BusinessMembershipRepository();
module.exports = businessMembershipRepository;
