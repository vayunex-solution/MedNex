'use strict';

const branchRepository = require('./branch.repository');
const tenantRepository = require('../tenant/tenant.repository');
const businessRepository = require('../business/business.repository');
const BaseValidator = require('../../shared/validators/base.validator');
const { BadRequestError } = require('../../shared/errors/AppError');
const { Op } = require('sequelize');

class BranchValidator extends BaseValidator {
  async validateCreate(req, res, next) {
    try {
      const {
        tenantUuid,
        businessUuid,
        name,
        slug,
        email,
        phone,
      } = req.body;

      this.validateRequired(req.body, ['tenantUuid', 'businessUuid', 'name']);

      // Resolve tenant
      const tenant = await tenantRepository.findOne({ uuid: tenantUuid });
      if (!tenant) {
        throw new BadRequestError(`Tenant not found for UUID: ${tenantUuid}`);
      }
      req.resolvedTenantId = tenant.id;

      // Resolve business
      const business = await businessRepository.findOne({ uuid: businessUuid });
      if (!business) {
        throw new BadRequestError(`Business not found for UUID: ${businessUuid}`);
      }
      req.resolvedBusinessId = business.id;

      // Unique check validations
      if (slug) {
        this.validateSlug(slug);
        const slugExists = await branchRepository.exists({ slug });
        if (slugExists) {
          throw new BadRequestError('Branch slug must be unique');
        }
      }

      if (email) {
        this.validateEmail(email);
        const emailExists = await branchRepository.exists({ email });
        if (emailExists) {
          throw new BadRequestError('Branch email must be unique');
        }
      }

      if (phone) this.validatePhone(phone);

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
      } = req.body;

      const branch = await branchRepository.findOne({ uuid });
      if (!branch) {
        throw new BadRequestError('Branch not found');
      }
      req.resolvedBranchId = branch.id;

      // Unique check validations
      if (slug) {
        this.validateSlug(slug);
        const slugExists = await branchRepository.exists({ slug, id: { [Op.ne]: branch.id } });
        if (slugExists) {
          throw new BadRequestError('Branch slug must be unique');
        }
      }

      if (email) {
        this.validateEmail(email);
        const emailExists = await branchRepository.exists({ email, id: { [Op.ne]: branch.id } });
        if (emailExists) {
          throw new BadRequestError('Branch email must be unique');
        }
      }

      if (phone) this.validatePhone(phone);

      next();
    } catch (err) {
      next(err);
    }
  }
}

const validator = new BranchValidator();

module.exports = {
  validateCreateBranch: (req, res, next) => validator.validateCreate(req, res, next),
  validateUpdateBranch: (req, res, next) => validator.validateUpdate(req, res, next),
};
