'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BusinessMetadata = require('./businessMetadata.model');

class BusinessMetadataRepository extends BaseRepository {
  constructor() {
    super(BusinessMetadata);
  }
}

const businessMetadataRepository = new BusinessMetadataRepository();
module.exports = businessMetadataRepository;
