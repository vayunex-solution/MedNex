'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationWebhook = require('./applicationWebhook.model');

class ApplicationWebhookRepository extends BaseRepository {
  constructor() {
    super(ApplicationWebhook);
  }
}

module.exports = new ApplicationWebhookRepository();
