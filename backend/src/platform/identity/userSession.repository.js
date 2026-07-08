'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const UserSession = require('./userSession.model');

class UserSessionRepository extends BaseRepository {
  constructor() {
    super(UserSession);
  }
}

const userSessionRepository = new UserSessionRepository();
module.exports = userSessionRepository;
