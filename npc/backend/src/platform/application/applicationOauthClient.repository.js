'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationOauthClient = require('./applicationOauthClient.model');

class ApplicationOauthClientRepository extends BaseRepository {
  constructor() {
    super(ApplicationOauthClient);
  }
}

module.exports = new ApplicationOauthClientRepository();
