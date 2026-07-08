'use strict';

const BaseRepository = require('../core/base.repository');
const PlatBackgroundJob = require('./platBackgroundJobs.model');

class PlatBackgroundJobsRepository extends BaseRepository {
  constructor() {
    super(PlatBackgroundJob);
  }
}

module.exports = new PlatBackgroundJobsRepository();
