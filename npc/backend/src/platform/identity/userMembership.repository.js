'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const UserMembership = require('./userMembership.model');

class UserMembershipRepository extends BaseRepository {
  constructor() {
    super(UserMembership);
  }
}

const userMembershipRepository = new UserMembershipRepository();
module.exports = userMembershipRepository;
