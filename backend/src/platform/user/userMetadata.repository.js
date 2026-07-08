'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const UserMetadata = require('./userMetadata.model');

class UserMetadataRepository extends BaseRepository {
  constructor() {
    super(UserMetadata);
  }
}

module.exports = new UserMetadataRepository();
