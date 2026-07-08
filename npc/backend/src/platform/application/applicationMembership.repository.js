'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationMembership = require('./applicationMembership.model');

class ApplicationMembershipRepository extends BaseRepository {
  constructor() {
    super(ApplicationMembership);
  }
}

module.exports = new ApplicationMembershipRepository();
