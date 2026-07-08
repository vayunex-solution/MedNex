'use strict';

const tenantProvisioner = require('./tenantProvisioner');
const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { BadRequestError } = require('../../shared/errors/AppError');

const signup = asyncHandler(async (req, res) => {
  const {
    tenantName,
    ownerName,
    ownerEmail,
    ownerPassword,
  } = req.body;

  if (!tenantName || !ownerName || !ownerEmail || !ownerPassword) {
    throw new BadRequestError('Missing required registration parameters (tenantName, ownerName, ownerEmail, ownerPassword)');
  }

  const result = await tenantProvisioner.provisionTenant(req.body);
  return ApiResponse.created(res, result, 'Tenant provisioned successfully');
});

module.exports = { signup };
