'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BranchMetadata = require('./branchMetadata.model');

class BranchMetadataRepository extends BaseRepository {
  constructor() {
    super(BranchMetadata);
  }
}

const branchMetadataRepository = new BranchMetadataRepository();
module.exports = branchMetadataRepository;
