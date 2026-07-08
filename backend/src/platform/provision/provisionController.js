'use strict';

const tenantProvisioner = require('../tenant/tenantProvisioner');
const Tenant = require('../tenant/tenant.model');
const { User } = require('../../models');
const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');

const provision = asyncHandler(async (req, res) => {
  const { tenantName, slug, ownerName, ownerEmail, ownerPassword, ownerPhone } = req.body;

  if (!tenantName || !ownerName || !ownerEmail || !ownerPassword) {
    return res.status(400).json({
      success: false,
      message: 'Missing required provisioning payload attributes'
    });
  }

  // Execute provision transaction
  const result = await tenantProvisioner.provisionTenant({
    tenantName,
    slug,
    ownerName,
    ownerEmail,
    ownerPassword,
    ownerPhone
  });

  return ApiResponse.created(res, result, 'Tenant provisioned successfully on node');
});

const sync = asyncHandler(async (req, res) => {
  const { tenantUuid, name, status, user } = req.body;

  if (tenantUuid) {
    // Synchronization for tenant details
    const tenant = await Tenant.findOne({ where: { uuid: tenantUuid } });
    if (tenant) {
      await tenant.update({
        name: name || tenant.name,
        status: status || tenant.status
      });
    }
  }

  if (user) {
    // Synchronization for user details
    const localUser = await User.findOne({ where: { email: user.email } });
    if (localUser) {
      await localUser.update({
        name: user.name || localUser.name,
        role: user.role || localUser.role
      });
    }
  }

  return ApiResponse.success(res, null, 'Node state synchronized successfully');
});

module.exports = {
  provision,
  sync
};
