'use strict';

const { BadRequestError } = require('../../shared/errors/AppError');

class UserValidator {
  static validateCreateUser(req, res, next) {
    try {
      const {
        name,
        email,
        password,
        tenantUuid,
        businessUuid,
        branchUuid,
      } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new BadRequestError('Name is required and must be a valid string.');
      }

      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestError('A valid email address is required.');
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        throw new BadRequestError('Password is required and must be at least 6 characters long.');
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!tenantUuid || !uuidRegex.test(tenantUuid)) {
        throw new BadRequestError('A valid tenantUuid (UUID v4) is required.');
      }

      if (!businessUuid || !uuidRegex.test(businessUuid)) {
        throw new BadRequestError('A valid businessUuid (UUID v4) is required.');
      }

      if (!branchUuid || !uuidRegex.test(branchUuid)) {
        throw new BadRequestError('A valid branchUuid (UUID v4) is required.');
      }

      next();
    } catch (err) {
      next(err);
    }
  }

  static validateUpdateUser(req, res, next) {
    try {
      const { version } = req.body;
      if (version === undefined || isNaN(parseInt(version))) {
        throw new BadRequestError('Version is required and must be a valid integer.');
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  static validateUpdateProfile(req, res, next) {
    try {
      // Basic profile validation (optional fields if present)
      const { firstName, lastName } = req.body;
      if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length > 100)) {
        throw new BadRequestError('First name must be a valid string under 100 characters.');
      }
      if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length > 100)) {
        throw new BadRequestError('Last name must be a valid string under 100 characters.');
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  static validateUpdatePreferences(req, res, next) {
    try {
      const { preferences } = req.body;
      if (!preferences || !Array.isArray(preferences)) {
        throw new BadRequestError('Preferences array is required.');
      }
      for (const pref of preferences) {
        if (!pref.key || typeof pref.key !== 'string') {
          throw new BadRequestError('Each preference must contain a valid key string.');
        }
        if (pref.value === undefined) {
          throw new BadRequestError('Each preference must contain a value.');
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserValidator;
