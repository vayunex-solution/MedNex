'use strict';

const BaseRepository = require('../core/base.repository');
const PlatProcessedEvent = require('./platProcessedEvents.model');

class PlatProcessedEventsRepository extends BaseRepository {
  constructor() {
    super(PlatProcessedEvent);
  }
}

module.exports = new PlatProcessedEventsRepository();
