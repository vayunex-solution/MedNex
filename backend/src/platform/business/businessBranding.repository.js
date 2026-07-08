'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const BusinessBranding = require('./businessBranding.model');

class BusinessBrandingRepository extends BaseRepository {
  constructor() {
    super(BusinessBranding);
  }
}

const businessBrandingRepository = new BusinessBrandingRepository();
module.exports = businessBrandingRepository;
