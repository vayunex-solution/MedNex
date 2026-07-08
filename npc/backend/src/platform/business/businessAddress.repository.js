'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BusinessAddress = require('./businessAddress.model');

class BusinessAddressRepository extends BaseRepository {
  constructor() {
    super(BusinessAddress);
  }
}

const businessAddressRepository = new BusinessAddressRepository();
module.exports = businessAddressRepository;
