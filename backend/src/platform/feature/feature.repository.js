'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Feature = require('./feature.model');

class FeatureRepository extends BaseRepository {
  constructor() {
    super(Feature);
  }
}

const featureRepository = new FeatureRepository();
module.exports = featureRepository;
