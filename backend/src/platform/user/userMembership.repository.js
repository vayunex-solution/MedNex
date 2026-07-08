'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const UserMembership = require('../identity/userMembership.model');

class UserMembershipRepository extends BaseRepository {
  constructor() {
    super(UserMembership);
  }
}

module.exports = new UserMembershipRepository();
