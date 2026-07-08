'use strict';

const CacheProvider = require('./cache.provider');
const logger = require('../logger');
const memoryCache = require('./memory.cache');

class RedisCacheProvider extends CacheProvider {
  constructor() {
    super();
    this.redisClient = null;
  }

  _getClient() {
    if (!this.redisClient) {
      const Redis = require('ioredis');
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 1,
        showFriendlyErrorStack: true
      });
      this.redisClient.on('error', (err) => {
        logger.error('[RedisCacheProvider] Redis connection error:', err);
      });
    }
    return this.redisClient;
  }

  async get(key) {
    try {
      const client = this._getClient();
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      logger.error(`[RedisCacheProvider] GET error on key: ${key}. Falling back to MemoryCache.`, err);
      return await memoryCache.get(key);
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      const client = this._getClient();
      const payload = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await client.set(key, payload);
      }
      return true;
    } catch (err) {
      logger.error(`[RedisCacheProvider] SET error on key: ${key}. Falling back to MemoryCache.`, err);
      return await memoryCache.set(key, value, ttlSeconds);
    }
  }

  async del(key) {
    try {
      const client = this._getClient();
      await client.del(key);
      return true;
    } catch (err) {
      logger.error(`[RedisCacheProvider] DEL error on key: ${key}. Falling back to MemoryCache.`, err);
      return await memoryCache.del(key);
    }
  }

  async flush() {
    try {
      const client = this._getClient();
      await client.flushall();
      return true;
    } catch (err) {
      logger.error('[RedisCacheProvider] FLUSHALL error. Falling back to MemoryCache.', err);
      return await memoryCache.flush();
    }
  }
}

const redisCache = new RedisCacheProvider();
module.exports = redisCache;
