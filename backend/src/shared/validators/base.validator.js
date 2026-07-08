'use strict';

const { BadRequestError } = require('../errors/AppError');

class BaseValidator {
  validateTimezone(tz) {
    if (!tz) return;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      throw new BadRequestError(`Invalid timezone identifier: ${tz}`);
    }
  }

  validateLocale(locale) {
    if (!locale) return;
    try {
      Intl.DateTimeFormat.supportedLocalesOf([locale]);
    } catch {
      throw new BadRequestError(`Invalid locale identifier: ${locale}`);
    }
  }

  validateCurrency(currency) {
    if (!currency) return;
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestError(`Invalid ISO currency code format: ${currency}`);
    }
  }

  validatePhone(phone) {
    if (!phone) return;
    if (!/^\+?[0-9\s\-()]{7,25}$/.test(phone)) {
      throw new BadRequestError(`Invalid phone number format: ${phone}`);
    }
  }

  validateEmail(email) {
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError(`Invalid email address format: ${email}`);
    }
  }

  validateWebsite(url) {
    if (!url) return;
    try {
      new URL(url.includes('://') ? url : `http://${url}`);
    } catch {
      throw new BadRequestError(`Invalid website URL format: ${url}`);
    }
  }

  validateSlug(slug) {
    if (!slug) return;
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestError(`Slug must contain only lowercase letters, numbers, and hyphens: ${slug}`);
    }
  }

  validateRequired(body, fields = []) {
    const missing = [];
    for (const f of fields) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        missing.push(f);
      }
    }
    if (missing.length > 0) {
      throw new BadRequestError(`Missing required parameters: ${missing.join(', ')}`);
    }
  }
}

module.exports = BaseValidator;
