'use strict';

const tenantRepository = require('./tenant.repository');
const userRepository = require('../identity/user.repository');
const { BadRequestError } = require('../../shared/errors/AppError');

function isValidTimezone(tz) {
  try {
    if (!tz) return false;
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (err) {
    return false;
  }
}

function isValidLocale(locale) {
  try {
    if (!locale) return false;
    Intl.DateTimeFormat.supportedLocalesOf([locale]);
    return true;
  } catch (err) {
    return false;
  }
}

function isValidCurrency(currency) {
  return /^[A-Z]{3}$/.test(currency);
}

const validateCreateTenant = async (req, res, next) => {
  try {
    const {
      tenantName,
      slug,
      ownerName,
      ownerEmail,
      ownerPassword,
      timezone,
      currency,
      locale,
    } = req.body;

    if (!tenantName || !slug || !ownerName || !ownerEmail || !ownerPassword) {
      throw new BadRequestError('Missing required parameters: tenantName, slug, ownerName, ownerEmail, ownerPassword');
    }

    // Slug format validation
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestError('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      throw new BadRequestError('Invalid owner email address');
    }

    // Timezone validation
    if (timezone && !isValidTimezone(timezone)) {
      throw new BadRequestError(`Invalid timezone identifier: ${timezone}`);
    }

    // Currency validation
    if (currency && !isValidCurrency(currency)) {
      throw new BadRequestError(`Invalid ISO currency code (must be 3 uppercase letters): ${currency}`);
    }

    // Locale validation
    if (locale && !isValidLocale(locale)) {
      throw new BadRequestError(`Invalid locale identifier: ${locale}`);
    }

    // Unique checks
    const nameExists = await tenantRepository.exists({ name: tenantName });
    if (nameExists) {
      throw new BadRequestError('Tenant name must be unique');
    }

    const slugExists = await tenantRepository.exists({ slug });
    if (slugExists) {
      throw new BadRequestError('Tenant slug must be unique');
    }

    const emailExists = await userRepository.exists({ email: ownerEmail });
    if (emailExists) {
      throw new BadRequestError('Owner email must be unique');
    }

    next();
  } catch (err) {
    next(err);
  }
};

const validateUpdateTenant = async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { name, slug, email, timezone, currency, locale } = req.body;

    const tenant = await tenantRepository.findOne({ uuid });
    if (!tenant) {
      throw new BadRequestError('Tenant not found');
    }

    // Slug format validation
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestError('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Email format validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError('Invalid contact email address');
    }

    // Timezone validation
    if (timezone && !isValidTimezone(timezone)) {
      throw new BadRequestError(`Invalid timezone identifier: ${timezone}`);
    }

    // Currency validation
    if (currency && !isValidCurrency(currency)) {
      throw new BadRequestError(`Invalid ISO currency code (must be 3 uppercase letters): ${currency}`);
    }

    // Locale validation
    if (locale && !isValidLocale(locale)) {
      throw new BadRequestError(`Invalid locale identifier: ${locale}`);
    }

    // Unique checks
    const { Op } = require('sequelize');
    if (name) {
      const nameExists = await tenantRepository.exists({ name, id: { [Op.ne]: tenant.id } });
      if (nameExists) {
        throw new BadRequestError('Tenant name must be unique');
      }
    }

    if (slug) {
      const slugExists = await tenantRepository.exists({ slug, id: { [Op.ne]: tenant.id } });
      if (slugExists) {
        throw new BadRequestError('Tenant slug must be unique');
      }
    }

    if (email) {
      const emailExists = await tenantRepository.exists({ email, id: { [Op.ne]: tenant.id } });
      if (emailExists) {
        throw new BadRequestError('Tenant contact email must be unique');
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  validateCreateTenant,
  validateUpdateTenant,
};
