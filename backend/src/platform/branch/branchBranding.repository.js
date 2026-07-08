'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BranchBranding = require('./branchBranding.model');

class BranchBrandingRepository extends BaseRepository {
  constructor() {
    super(BranchBranding);
  }
}

const branchBrandingRepository = new BranchBrandingRepository();
module.exports = branchBrandingRepository;
