'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const User = require('./user.model');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }
}

module.exports = new UserRepository();
