'use strict';

class CacheProvider {
  async get(key) {
    throw new Error('Method not implemented');
  }

  async set(key, value, ttlSeconds) {
    throw new Error('Method not implemented');
  }

  async del(key) {
    throw new Error('Method not implemented');
  }

  async flush() {
    throw new Error('Method not implemented');
  }
}

module.exports = CacheProvider;
