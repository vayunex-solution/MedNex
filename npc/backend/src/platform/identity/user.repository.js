'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const { User } = require('../../models');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }
}

const userRepository = new UserRepository();
module.exports = userRepository;
