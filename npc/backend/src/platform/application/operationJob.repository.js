'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const OperationJob = require('./operationJob.model');

class OperationJobRepository extends BaseRepository {
  constructor() {
    super(OperationJob);
  }
}

module.exports = new OperationJobRepository();
