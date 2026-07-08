'use strict';

const businessRepository = require('./business.repository');
const tenantRepository = require('../tenant/tenant.repository');
const BaseValidator = require('../../shared/validators/base.validator');
const { BadRequestError } = require('../../shared/errors/AppError');
const { Op } = require('sequelize');

class BusinessValidator extends BaseValidator {
  async validateCreate(req, res, next) {
    try {
      const {
        tenantUuid,
        name,
        slug,
        email,
        phone,
        timezone,
        locale,
        currency,
        website,
      } = req.body;

      this.validateRequired(req.body, ['tenantUuid', 'name']);

      // Resolve tenant
      const tenant = await tenantRepository.findOne({ uuid: tenantUuid });
      if (!tenant) {
        throw new BadRequestError(`Tenant not found for UUID: ${tenantUuid}`);
      }
      req.resolvedTenantId = tenant.id;

      // Unique check validations using BaseValidator formats
      if (slug) {
        this.validateSlug(slug);
        const slugExists = await businessRepository.exists({ slug });
        if (slugExists) {
          throw new BadRequestError('Business slug must be unique');
        }
      }

      if (email) {
        this.validateEmail(email);
        const emailExists = await businessRepository.exists({ email });
        if (emailExists) {
          throw new BadRequestError('Business email must be unique');
        }
      }

      if (phone) this.validatePhone(phone);
      if (timezone) this.validateTimezone(timezone);
      if (locale) this.validateLocale(locale);
      if (currency) this.validateCurrency(currency);
      if (website) this.validateWebsite(website);

      next();
    } catch (err) {
      next(err);
    }
  }

  async validateUpdate(req, res, next) {
    try {
      const { uuid } = req.params;
      const {
        slug,
        email,
        phone,
        timezone,
        locale,
        currency,
        website,
      } = req.body;

      const business = await businessRepository.findOne({ uuid });
      if (!business) {
        throw new BadRequestError('Business not found');
      }
      req.resolvedBusinessId = business.id;

      // Unique check validations
      if (slug) {
        this.validateSlug(slug);
        const slugExists = await businessRepository.exists({ slug, id: { [Op.ne]: business.id } });
        if (slugExists) {
          throw new BadRequestError('Business slug must be unique');
        }
      }

      if (email) {
        this.validateEmail(email);
        const emailExists = await businessRepository.exists({ email, id: { [Op.ne]: business.id } });
        if (emailExists) {
          throw new BadRequestError('Business email must be unique');
        }
      }

      if (phone) this.validatePhone(phone);
      if (timezone) this.validateTimezone(timezone);
      if (locale) this.validateLocale(locale);
      if (currency) this.validateCurrency(currency);
      if (website) this.validateWebsite(website);

      next();
    } catch (err) {
      next(err);
    }
  }
}

const validator = new BusinessValidator();

module.exports = {
  validateCreateBusiness: (req, res, next) => validator.validateCreate(req, res, next),
  validateUpdateBusiness: (req, res, next) => validator.validateUpdate(req, res, next),
};
