'use strict';

const memoryCache = require('./memory.cache');
const redisCache = require('./redis.cache');
const logger = require('../logger');

const pendingPromises = new Map();

let hitCount = 0;
let missCount = 0;
let refreshCount = 0;
let stampedePreventionCount = 0;

class CacheManager {
  constructor() {
    this.provider = null;
  }

  getProvider() {
    if (!this.provider) {
      const driver = process.env.CACHE_DRIVER || 'memory';
      if (driver === 'redis') {
        this.provider = redisCache;
      } else {
        this.provider = memoryCache;
      }
      logger.info(`[CacheManager] Initialized with driver: ${driver}`);
    }
    return this.provider;
  }

  async get(key) {
    const provider = this.getProvider();
    const wrapped = await provider.get(key);
    if (wrapped && typeof wrapped === 'object' && wrapped.expiresAt) {
      if (wrapped.expiresAt < Date.now()) {
        await provider.del(key);
        return null;
      }
      hitCount++;
      return wrapped.value;
    }
    return null;
  }

  async set(key, value, ttlSeconds = 300) {
    const provider = this.getProvider();
    const expiresAt = Date.now() + ttlSeconds * 1000;
    return await provider.set(key, { value, expiresAt, totalTtl: ttlSeconds }, ttlSeconds);
  }

  async del(key) {
    const provider = this.getProvider();
    return await provider.del(key);
  }

  async flush() {
    const provider = this.getProvider();
    return await provider.flush();
  }

  /**
   * Cache Stampede Protection using Single-Flight and Refresh-Ahead strategies
   */
  async getOrSet(key, fetchFunction, ttlSeconds = 300) {
    const provider = this.getProvider();
    const wrapped = await provider.get(key);
    const now = Date.now();

    if (wrapped && typeof wrapped === 'object' && wrapped.expiresAt) {
      const timeRemaining = wrapped.expiresAt - now;
      if (timeRemaining > 0) {
        hitCount++;
        const threshold = (ttlSeconds * 1000) * 0.2; // 20% threshold of TTL

        // Refresh-Ahead / Stale-While-Revalidate
        if (timeRemaining < threshold) {
          refreshCount++;
          // Trigger background refresh asynchronously
          this._revalidate(key, fetchFunction, ttlSeconds).catch(() => null);
        }

        return wrapped.value;
      } else {
        // Expired
        await provider.del(key);
      }
    }

    missCount++;

    // Single-Flight Locking (Stampede Prevention)
    if (pendingPromises.has(key)) {
      stampedePreventionCount++;
      return pendingPromises.get(key);
    }

    const promise = (async () => {
      try {
        const freshValue = await fetchFunction();
        const expiresAt = Date.now() + ttlSeconds * 1000;
        await provider.set(key, { value: freshValue, expiresAt, totalTtl: ttlSeconds }, ttlSeconds);
        return freshValue;
      } finally {
        pendingPromises.delete(key);
      }
    })();

    pendingPromises.set(key, promise);
    return promise;
  }

  async _revalidate(key, fetchFunction, ttlSeconds) {
    // Run validation inside single-flight to avoid redundant background fetches
    if (pendingPromises.has(key)) return;

    const promise = (async () => {
      try {
        const freshValue = await fetchFunction();
        const expiresAt = Date.now() + ttlSeconds * 1000;
        await this.getProvider().set(key, { value: freshValue, expiresAt, totalTtl: ttlSeconds }, ttlSeconds);
      } catch (err) {
        logger.error(`[CacheManager] Stale-while-revalidate failed for key: ${key}`, err);
      } finally {
        pendingPromises.delete(key);
      }
    })();

    pendingPromises.set(key, promise);
    await promise;
  }

  getMetrics() {
    const totalRequests = hitCount + missCount;
    return {
      hitRatio: totalRequests > 0 ? parseFloat((hitCount / totalRequests).toFixed(2)) : 0,
      missRatio: totalRequests > 0 ? parseFloat((missCount / totalRequests).toFixed(2)) : 0,
      refreshCount,
      stampedePreventionCount,
      hitCount,
      missCount
    };
  }
}

const cacheManager = new CacheManager();
module.exports = cacheManager;
