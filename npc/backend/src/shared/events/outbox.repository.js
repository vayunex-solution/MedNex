'use strict';

const BaseRepository = require('../core/base.repository');
const Outbox = require('./outbox.model');

class OutboxRepository extends BaseRepository {
  constructor() {
    super(Outbox);
  }
}

const outboxRepository = new OutboxRepository();
module.exports = outboxRepository;
