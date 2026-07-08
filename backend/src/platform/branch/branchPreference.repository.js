'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BranchPreference = require('./branchPreference.model');

class BranchPreferenceRepository extends BaseRepository {
  constructor() {
    super(BranchPreference);
  }
}

const branchPreferenceRepository = new BranchPreferenceRepository();
module.exports = branchPreferenceRepository;
