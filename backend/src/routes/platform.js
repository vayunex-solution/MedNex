'use strict';

const express = require('express');
const router = express.Router();

const dashboardCtrl = require('../platform/dashboard/platformDashboardController');
const tenantCtrl = require('../platform/tenant/platformTenantController');
const businessCtrl = require('../platform/business/platformBusinessController');
const branchCtrl = require('../platform/branch/platformBranchController');
const capabilitiesCtrl = require('../platform/capabilities/capabilitiesController');
const userCtrl = require('../platform/user/platformUserController');

const { validateCreateTenant, validateUpdateTenant } = require('../platform/tenant/tenantValidator');
const { validateCreateBusiness, validateUpdateBusiness } = require('../platform/business/businessValidator');
const { validateCreateBranch, validateUpdateBranch } = require('../platform/branch/branchValidator');
const userValidator = require('../platform/user/userValidator');
const idempotencyMiddleware = require('../middleware/idempotency');
const upload = require('../middleware/upload');

const { authenticate, authorize } = require('../middleware/auth');

// Apply super_admin restrictions globally to all platform management routes
router.use(authenticate);
router.use(authorize('super_admin'));

// ─── Capabilities Contract ────────────────────────────────────────────────────
router.get('/capabilities', capabilitiesCtrl.getCapabilities);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', dashboardCtrl.getDashboard);

// ─── Tenant Management ────────────────────────────────────────────────────────
router.get('/tenants', tenantCtrl.listTenants);
router.get('/tenants/:uuid', tenantCtrl.getTenant);
router.post('/tenants', idempotencyMiddleware, validateCreateTenant, tenantCtrl.createTenant);
router.put('/tenants/:uuid', idempotencyMiddleware, validateUpdateTenant, tenantCtrl.updateTenant);
router.post('/tenants/:uuid/activate', tenantCtrl.activateTenant);
router.post('/tenants/:uuid/suspend', tenantCtrl.suspendTenant);
router.post('/tenants/:uuid/archive', tenantCtrl.archiveTenant);
router.get('/tenants/:uuid/health', tenantCtrl.getTenantHealth);
router.get('/tenants/:uuid/summary', tenantCtrl.getTenantSummary);

// ─── Business Management ──────────────────────────────────────────────────────
router.get('/businesses', businessCtrl.listBusinesses);
router.get('/businesses/:uuid', businessCtrl.getBusiness);
router.post('/businesses', idempotencyMiddleware, validateCreateBusiness, businessCtrl.createBusiness);
router.put('/businesses/:uuid', idempotencyMiddleware, validateUpdateBusiness, businessCtrl.updateBusiness);
router.delete('/businesses/:uuid', businessCtrl.deleteBusiness);
router.post('/businesses/:uuid/activate', businessCtrl.activateBusiness);
router.post('/businesses/:uuid/suspend', businessCtrl.suspendBusiness);
router.post('/businesses/:uuid/archive', businessCtrl.archiveBusiness);
router.post('/businesses/:uuid/restore', businessCtrl.restoreBusiness);
router.get('/businesses/:uuid/health', businessCtrl.getBusinessHealth);
router.get('/businesses/:uuid/summary', businessCtrl.getBusinessSummary);
router.put('/businesses/:uuid/settings', idempotencyMiddleware, businessCtrl.updateSettings);
router.put('/businesses/:uuid/branding', idempotencyMiddleware, businessCtrl.updateBranding);

// ─── Branch Management ────────────────────────────────────────────────────────
router.get('/branches', branchCtrl.listBranches);
router.get('/branches/:uuid', branchCtrl.getBranch);
router.post('/branches', idempotencyMiddleware, validateCreateBranch, branchCtrl.createBranch);
router.put('/branches/:uuid', idempotencyMiddleware, validateUpdateBranch, branchCtrl.updateBranch);
router.delete('/branches/:uuid', branchCtrl.deleteBranch);
router.post('/branches/:uuid/activate', branchCtrl.activateBranch);
router.post('/branches/:uuid/suspend', branchCtrl.suspendBranch);
router.post('/branches/:uuid/archive', branchCtrl.archiveBranch);
router.post('/branches/:uuid/restore', branchCtrl.restoreBranch);
router.get('/branches/:uuid/health', branchCtrl.getBranchHealth);
router.get('/branches/:uuid/summary', branchCtrl.getBranchSummary);
router.put('/branches/:uuid/settings', idempotencyMiddleware, branchCtrl.updateSettings);
router.put('/branches/:uuid/branding', idempotencyMiddleware, branchCtrl.updateBranding);

// ─── Universal User Engine ────────────────────────────────────────────────────
router.get('/users', userCtrl.listUsers);
router.post('/users/bulk-activate', userCtrl.bulkActivate);
router.post('/users/bulk-suspend', userCtrl.bulkSuspend);
router.post('/users/bulk-delete', userCtrl.bulkDelete);
router.post('/users/bulk-assign-role', userCtrl.bulkAssignRole);
router.post('/users/bulk-export', userCtrl.bulkExport);
router.get('/users/:uuid', userCtrl.getUserByUuid);
router.post('/users', idempotencyMiddleware, userValidator.validateCreateUser, userCtrl.createUser);
router.put('/users/:uuid', idempotencyMiddleware, userValidator.validateUpdateUser, userCtrl.updateUser);
router.delete('/users/:uuid', userCtrl.deleteUser);
router.post('/users/:uuid/activate', userCtrl.activateUser);
router.post('/users/:uuid/suspend', userCtrl.suspendUser);
router.put('/users/:uuid/profile', idempotencyMiddleware, userValidator.validateUpdateProfile, userCtrl.updateProfile);
router.put('/users/:uuid/preferences', idempotencyMiddleware, userValidator.validateUpdatePreferences, userCtrl.updatePreferences);
router.put('/users/:uuid/notification-preferences', idempotencyMiddleware, userCtrl.updateNotificationPreferences);
router.post('/users/:uuid/avatar', upload.single('avatar'), userCtrl.uploadAvatar);
router.get('/users/:uuid/devices', userCtrl.getUserDevices);
router.delete('/users/:uuid/devices/:deviceUuid', userCtrl.deleteUserDevice);
router.get('/users/:uuid/audits', userCtrl.getUserAudits);
router.get('/users/:uuid/activities', userCtrl.getUserActivities);
router.post('/users/:uuid/verify-email', userCtrl.verifyEmail);
router.post('/users/:uuid/verify-phone', userCtrl.verifyPhone);
router.post('/users/:uuid/reset-password', userCtrl.resetPassword);
router.post('/users/:uuid/force-password-reset', userCtrl.forcePasswordReset);

module.exports = router;
