'use strict';

const CacheProvider = require('./cache.provider');

class MemoryCacheProvider extends CacheProvider {
  constructor() {
    super();
    this.cache = new Map();
    // Run periodic garbage collection sweep every 60 seconds
    this.gcInterval = setInterval(() => this._sweep(), 60000);
    if (this.gcInterval.unref) {
      this.gcInterval.unref(); // Don't block event loop on process exit
    }
  }

  _sweep() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && item.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 300) {
    const expiry = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
    return true;
  }

  async del(key) {
    this.cache.delete(key);
    return true;
  }

  async flush() {
    this.cache.clear();
    return true;
  }
}

// Single instance for in-process memory sharing
const memoryCache = new MemoryCacheProvider();
module.exports = memoryCache;
