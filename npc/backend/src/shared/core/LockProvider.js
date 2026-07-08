'use strict';

const sequelize = require('../../config/database');
const logger = require('../logger');

class LockProvider {
  async acquire(key, ttlMs, options = {}) {
    throw new Error('Method not implemented');
  }

  async release(key, options = {}) {
    throw new Error('Method not implemented');
  }
}

class MemoryLockProvider extends LockProvider {
  constructor() {
    super();
    this.locks = new Map();
  }

  async acquire(key, ttlMs = 5000, options = {}) {
    const now = Date.now();
    const currentLock = this.locks.get(key);

    if (currentLock && currentLock.expiresAt > now) {
      return false; // Lock already held
    }

    this.locks.set(key, {
      expiresAt: now + ttlMs,
    });
    return true;
  }

  async release(key, options = {}) {
    this.locks.delete(key);
    return true;
  }
}

class DatabaseLockProvider extends LockProvider {
  async acquire(key, ttlMs = 5000, options = {}) {
    const strategy = options.strategy || 'advisory';

    if (strategy === 'row') {
      const transaction = options.transaction;
      if (!transaction) {
        throw new Error('Transaction is required for row-level SELECT ... FOR UPDATE locking');
      }
      try {
        // Run transactional row-level lock (e.g. lock a specific row or lock query)
        // If resource details are provided, we can lock a specific record, otherwise a dummy SELECT
        await sequelize.query('SELECT 1 FOR UPDATE', { transaction, logging: false });
        return true;
      } catch (err) {
        logger.error(`[DatabaseLockProvider] Failed to acquire row lock on key: ${key}:`, err);
        return false;
      }
    } else {
      // Default: MySQL Advisory Lock (GET_LOCK)
      // GET_LOCK(str, timeout) returns 1 if lock was acquired, 0 if timed out, null on error
      const timeoutSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      try {
        const [result] = await sequelize.query(
          'SELECT GET_LOCK(?, ?) AS lockStatus',
          {
            replacements: [key, timeoutSeconds],
            type: sequelize.QueryTypes.SELECT,
            logging: false
          }
        );
        return result && result.lockStatus === 1;
      } catch (err) {
        logger.error(`[DatabaseLockProvider] Failed to acquire advisory lock: ${key}:`, err);
        return false;
      }
    }
  }

  async release(key, options = {}) {
    const strategy = options.strategy || 'advisory';
    if (strategy === 'row') {
      // Row locks are automatically released when the transaction commits or rolls back.
      return true;
    }

    try {
      const [result] = await sequelize.query(
        'SELECT RELEASE_LOCK(?) AS lockStatus',
        {
          replacements: [key],
          type: sequelize.QueryTypes.SELECT,
          logging: false
        }
      );
      return result && result.lockStatus === 1;
    } catch (err) {
      logger.error(`[DatabaseLockProvider] Failed to release advisory lock: ${key}:`, err);
      return false;
    }
  }
}

class RedisLockProvider extends LockProvider {
  constructor() {
    super();
    this.redisClient = null;
  }

  _getRedisClient() {
    if (!this.redisClient) {
      const Redis = require('ioredis');
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 1,
        showFriendlyErrorStack: true
      });
      this.redisClient.on('error', (err) => {
        logger.error('[RedisLockProvider] Redis Client Error:', err);
      });
    }
    return this.redisClient;
  }

  async acquire(key, ttlMs = 5000, options = {}) {
    try {
      const client = this._getRedisClient();
      // Set key with NX (only if not exists) and PX (expiration in ms)
      const result = await client.set(`lock:${key}`, 'locked', 'NX', 'PX', ttlMs);
      return result === 'OK';
    } catch (err) {
      logger.error(`[RedisLockProvider] Failed to acquire lock: ${key}. Falling back to MemoryLock.`, err);
      // Graceful fallback to memory lock
      return await memoryLockProvider.acquire(key, ttlMs, options);
    }
  }

  async release(key, options = {}) {
    try {
      const client = this._getRedisClient();
      await client.del(`lock:${key}`);
      return true;
    } catch (err) {
      logger.error(`[RedisLockProvider] Failed to release lock: ${key}`, err);
      return await memoryLockProvider.release(key, options);
    }
  }
}

// Singletons
const memoryLockProvider = new MemoryLockProvider();
const databaseLockProvider = new DatabaseLockProvider();
const redisLockProvider = new RedisLockProvider();

class LockFactory {
  static getProvider() {
    const driver = process.env.LOCK_DRIVER || 'database';
    if (driver === 'redis') {
      return redisLockProvider;
    }
    if (driver === 'database') {
      return databaseLockProvider;
    }
    return memoryLockProvider;
  }
}

// Export factory-selected lock provider
module.exports = {
  getProvider: () => LockFactory.getProvider(),
  MemoryLockProvider,
  DatabaseLockProvider,
  RedisLockProvider
};
