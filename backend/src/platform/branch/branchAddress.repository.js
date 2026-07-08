'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BranchAddress = require('./branchAddress.model');

class BranchAddressRepository extends BaseRepository {
  constructor() {
    super(BranchAddress);
  }
}

const branchAddressRepository = new BranchAddressRepository();
module.exports = branchAddressRepository;
