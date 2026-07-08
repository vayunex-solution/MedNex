'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BusinessContact = require('./businessContact.model');

class BusinessContactRepository extends BaseRepository {
  constructor() {
    super(BusinessContact);
  }
}

const businessContactRepository = new BusinessContactRepository();
module.exports = businessContactRepository;
