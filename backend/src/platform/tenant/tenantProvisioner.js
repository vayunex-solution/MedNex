'use strict';

const crypto = require('crypto');
const sequelize = require('../../config/database');
const Tenant = require('./tenant.model');
const Business = require('../business/business.model');
const Branch = require('../branch/branch.model');
const TenantSettings = require('../settings/tenantSettings.model');
const Subscription = require('../subscription/subscription.model');
const License = require('../license/license.model');
const Feature = require('../feature/feature.model');
const Limit = require('../limits/limit.model');
const { User } = require('../../models');
const bcrypt = require('bcryptjs');
const auditService = require('../audit/audit.service');

// Standalone Child Models
const BusinessSettings = require('../business/businessSettings.model');
const BusinessBranding = require('../business/businessBranding.model');
const BusinessContact = require('../business/businessContact.model');
const BusinessAddress = require('../business/businessAddress.model');
const BusinessPreference = require('../business/businessPreference.model');
const BusinessMembership = require('../business/businessMembership.model');

class TenantProvisioner {
  async provisionTenant(data) {
    const t = await sequelize.transaction();
    try {
      const {
        tenantName,
        slug = null,
        ownerName,
        ownerEmail,
        ownerPassword,
        ownerPhone = null,
        planId = 'Free',
        timezone = 'Asia/Kolkata',
        currency = 'INR',
        locale = 'en-US',
      } = data;

      const subdomainVal = slug || `tenant-${crypto.randomBytes(4).toString('hex')}`;

      // 1. Find or Create Tenant
      let tenant = await Tenant.findOne({ where: { slug: slug || subdomainVal }, transaction: t });
      if (!tenant) {
        tenant = await Tenant.create({
          name: tenantName,
          slug: slug || subdomainVal,
          email: ownerEmail,
          subdomain: subdomainVal,
          domain: data.domain || null,
          status: 'active',
          isActive: true,
        }, { transaction: t });
      } else {
        await tenant.update({
          name: tenantName,
          email: ownerEmail,
          isActive: true,
          status: 'active'
        }, { transaction: t });
      }

      // 2. Find or Create Business
      let business = await Business.findOne({ where: { slug: slug || subdomainVal }, transaction: t });
      if (!business) {
        business = await Business.create({
          tenantId: tenant.id,
          name: `${tenantName} Business`,
          legalName: `${tenantName} Ltd`,
          displayName: `${tenantName} Store`,
          businessCode: 'BUS-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
          slug: slug || subdomainVal,
          email: ownerEmail,
          phone: ownerPhone,
          currency,
          timezone,
          locale,
          status: 'active',
          isActive: true,
        }, { transaction: t });
      } else {
        await business.update({
          tenantId: tenant.id,
          name: `${tenantName} Business`,
          email: ownerEmail,
          status: 'active',
          isActive: true
        }, { transaction: t });
      }

      // 3. Create Business Configuration Registry
      await BusinessSettings.destroy({ where: { businessId: business.id }, transaction: t });
      await BusinessSettings.bulkCreate([
        { businessId: business.id, key: 'billing.prefix.invoice', value: 'INV', datatype: 'string', category: 'billing' },
        { businessId: business.id, key: 'billing.prefix.receipt', value: 'REC', datatype: 'string', category: 'billing' },
        { businessId: business.id, key: 'billing.prefix.purchase', value: 'PUR', datatype: 'string', category: 'billing' },
        { businessId: business.id, key: 'system.date_format', value: 'YYYY-MM-DD', datatype: 'string', category: 'system' },
        { businessId: business.id, key: 'system.time_format', value: 'HH:mm:ss', datatype: 'string', category: 'system' },
        { businessId: business.id, key: 'system.timezone', value: timezone, datatype: 'string', category: 'system' },
        { businessId: business.id, key: 'system.locale', value: locale, datatype: 'string', category: 'system' },
        { businessId: business.id, key: 'system.decimal_precision', value: '2', datatype: 'integer', category: 'system' },
        { businessId: business.id, key: 'system.quantity_precision', value: '2', datatype: 'integer', category: 'system' },
        { businessId: business.id, key: 'system.maintenance_mode', value: 'false', datatype: 'boolean', category: 'system' },
      ], { transaction: t });

      // 4. Create Business Branding
      await BusinessBranding.destroy({ where: { businessId: business.id }, transaction: t });
      await BusinessBranding.create({
        businessId: business.id,
        logo: null,
        darkLogo: null,
        favicon: null,
        primaryColor: '#0052CC',
        secondaryColor: '#0065FF',
        theme: 'light',
      }, { transaction: t });

      // 5. Create Business Contact Card
      await BusinessContact.destroy({ where: { businessId: business.id }, transaction: t });
      await BusinessContact.create({
        businessId: business.id,
        email: ownerEmail,
        phone: ownerPhone,
      }, { transaction: t });

      // 6. Create Default Address
      await BusinessAddress.destroy({ where: { businessId: business.id }, transaction: t });
      await BusinessAddress.create({
        businessId: business.id,
        addressLine1: 'Main HQ Street',
        city: 'HQ City',
        state: 'HQ State',
        country: 'India',
        postalCode: '110001',
        addressType: 'registered',
        isDefault: true,
      }, { transaction: t });

      // 7. Create Business Preference
      await BusinessPreference.destroy({ where: { businessId: business.id }, transaction: t });
      await BusinessPreference.create({
        businessId: business.id,
        key: 'system.notification_channel',
        value: 'email',
        datatype: 'string',
        category: 'system',
      }, { transaction: t });

      // 8. Find or Create Owner User
      const hashedPassword = await bcrypt.hash(ownerPassword, 12);
      let owner = await User.findOne({ where: { email: ownerEmail }, transaction: t });
      if (!owner) {
        owner = await User.create({
          uuid: crypto.randomUUID(),
          name: ownerName,
          email: ownerEmail,
          password: hashedPassword,
          role: 'admin',
          phone: ownerPhone,
          isActive: true,
        }, { transaction: t });
      } else {
        await owner.update({
          name: ownerName,
          password: hashedPassword,
          role: 'admin',
          isActive: true
        }, { transaction: t });
      }

      // Create Business Membership
      let bizMembership = await BusinessMembership.findOne({
        where: { businessId: business.id, userId: owner.id },
        transaction: t
      });
      if (!bizMembership) {
        await BusinessMembership.create({
          businessId: business.id,
          userId: owner.id,
          role: 'owner',
          status: 'active',
        }, { transaction: t });
      }

      // 9. Find or Create Branch
      let branch = await Branch.findOne({
        where: { tenantId: tenant.id, businessId: business.id, name: 'Main Branch' },
        transaction: t
      });
      if (!branch) {
        branch = await Branch.create({
          tenantId: tenant.id,
          businessId: business.id,
          name: 'Main Branch',
        }, { transaction: t });
      }

      // 10. Find or Create default UserMembership
      const UserMembership = require('../identity/userMembership.model');
      let userMembership = await UserMembership.findOne({
        where: { userId: owner.id, tenantId: tenant.id, businessId: business.id },
        transaction: t
      });
      if (!userMembership) {
        await UserMembership.create({
          uuid: crypto.randomUUID(),
          userId: owner.id,
          tenantId: tenant.id,
          businessId: business.id,
          branchId: branch.id,
          roleId: 2, // Admin role ID
          status: 'active',
        }, { transaction: t });
      }

      // 11. Create default TenantSettings
      await TenantSettings.destroy({ where: { tenantId: tenant.id }, transaction: t });
      await TenantSettings.bulkCreate([
        { tenantId: tenant.id, key: 'timezone', value: timezone },
        { tenantId: tenant.id, key: 'currency', value: currency },
        { tenantId: tenant.id, key: 'dateFormat', value: 'YYYY-MM-DD' },
        { tenantId: tenant.id, key: 'locale', value: locale },
      ], { transaction: t });

      // 12. Create Subscription
      await Subscription.destroy({ where: { tenantId: tenant.id }, transaction: t });
      const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days trial
      const subscription = await Subscription.create({
        tenantId: tenant.id,
        planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd,
      }, { transaction: t });

      // 13. Create License
      await License.destroy({ where: { tenantId: tenant.id }, transaction: t });
      const licenseKey = 'lic_' + crypto.randomUUID().replace(/-/g, '');
      const license = await License.create({
        tenantId: tenant.id,
        licenseKey,
        licenseType: planId === 'Free' ? 'Standard' : 'Premium',
        maxUsers: planId === 'Free' ? 5 : 25,
        maxBranches: planId === 'Free' ? 1 : 5,
        expiresAt: currentPeriodEnd,
      }, { transaction: t });

      // 14. Create default Features
      await Feature.destroy({ where: { tenantId: tenant.id }, transaction: t });
      await Feature.bulkCreate([
        { tenantId: tenant.id, featureKey: 'pos-billing', isEnabled: true },
        { tenantId: tenant.id, featureKey: 'inventory-tracking', isEnabled: true },
        { tenantId: tenant.id, featureKey: 'reports-export', isEnabled: planId !== 'Free' },
      ], { transaction: t });

      // 15. Create default Limits
      await Limit.destroy({ where: { tenantId: tenant.id }, transaction: t });
      await Limit.bulkCreate([
        { tenantId: tenant.id, limitKey: 'max-users', limitValue: planId === 'Free' ? 5 : 25 },
        { tenantId: tenant.id, limitKey: 'max-branches', limitValue: planId === 'Free' ? 1 : 5 },
      ], { transaction: t });

      // Commit transaction
      await t.commit();

      // Log audit events asynchronously via event bus
      auditService.logTenantAction(tenant.id, owner.id, 'tenant:provisioned', 'tenant', `Tenant ${tenantName} provisioned successfully.`);

      return {
        tenantUuid: tenant.uuid,
        tenantName: tenant.name,
        businessUuid: business.uuid,
        branchUuid: branch.uuid,
        ownerEmail: owner.email,
        licenseKey: license.licenseKey,
        subscriptionStatus: subscription.status,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

const tenantProvisioner = new TenantProvisioner();
module.exports = tenantProvisioner;
