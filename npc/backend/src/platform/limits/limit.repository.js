'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Limit = require('./limit.model');

class LimitRepository extends BaseRepository {
  constructor() {
    super(Limit);
  }
}

const limitRepository = new LimitRepository();
module.exports = limitRepository;
