'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BranchSettings = require('./branchSettings.model');

class BranchSettingsRepository extends BaseRepository {
  constructor() {
    super(BranchSettings);
  }
}

const branchSettingsRepository = new BranchSettingsRepository();
module.exports = branchSettingsRepository;
