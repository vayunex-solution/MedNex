'use strict';

const ApiResponse = require('../../shared/response/ApiResponse');

class CapabilitiesController {
  getCapabilities(req, res) {
    const capabilities = {
      platformName: 'Nex Platform Core (NPC)',
      version: 'NPC-1.0.0',
      supportedApiVersions: ['v1'],
      enabledModules: [
        'dashboard',
        'tenant-management',
        'business-management',
        'branch-management',
        'subscription-management',
        'license-management',
        'feature-management',
        'platform-settings',
        'audit-trail'
      ],
      featureFlags: [
        { key: 'pos-billing', name: 'POS Billing System', defaultValue: true },
        { key: 'inventory-tracking', name: 'Inventory & Batch Tracking', defaultValue: true },
        { key: 'reports-export', name: 'Reports Generation & Export', defaultValue: false },
        { key: 'multi-business', name: 'Multi-Business Hierarchy Support', defaultValue: false }
      ],
      permissionsCatalog: {
        super_admin: ['*'],
        admin: [
          'tenant:read', 'tenant:update',
          'business:read', 'business:update',
          'branch:create', 'branch:read', 'branch:update', 'branch:delete',
          'user:create', 'user:read', 'user:update', 'user:delete'
        ],
        pharmacist: [
          'business:read', 'branch:read',
          'inventory:read', 'inventory:write',
          'sale:create', 'sale:read'
        ],
        cashier: [
          'business:read', 'branch:read',
          'sale:create', 'sale:read'
        ]
      },
      sdkVersionCompatibility: {
        javascript: '>=1.0.0',
        python: '>=1.0.0',
        dart: '>=1.0.0'
      }
    };

    return ApiResponse.success(res, capabilities, 'Capabilities metadata contract retrieved successfully');
  }
}

module.exports = new CapabilitiesController();
