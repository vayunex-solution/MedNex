'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const existingTables = await queryInterface.showAllTables();
    
    const safeCreateTable = async (tableName, attributes) => {
      if (!existingTables.includes(tableName)) {
        await queryInterface.createTable(tableName, attributes);
      } else {
        console.log(`Table '${tableName}' already exists, skipping creation.`);
      }
    };

    // 1. plat_tenants
    await safeCreateTable('plat_tenants', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      domain: { type: Sequelize.STRING(100), unique: true },
      subdomain: { type: Sequelize.STRING(100), unique: true },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 2. plat_businesses
    await safeCreateTable('plat_businesses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 3. plat_branches
    await safeCreateTable('plat_branches', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      businessId: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      address: { type: Sequelize.TEXT },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 4. plat_departments
    await safeCreateTable('plat_departments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      branchId: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 5. plat_platform_settings
    await safeCreateTable('plat_platform_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(100), unique: true, allowNull: false },
      value: { type: Sequelize.TEXT },
      description: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 6. plat_tenant_settings
    await safeCreateTable('plat_tenant_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      key: { type: Sequelize.STRING(100), allowNull: false },
      value: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 7. plat_user_sessions
    await safeCreateTable('plat_user_sessions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      deviceFingerprint: { type: Sequelize.STRING(255) },
      ipAddress: { type: Sequelize.STRING(50) },
      userAgent: { type: Sequelize.STRING(255) },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 8. plat_refresh_tokens
    await safeCreateTable('plat_refresh_tokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      token: { type: Sequelize.TEXT, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      isRevoked: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 9. plat_login_histories
    await safeCreateTable('plat_login_histories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER },
      emailUsed: { type: Sequelize.STRING(150), allowNull: false },
      ipAddress: { type: Sequelize.STRING(50) },
      userAgent: { type: Sequelize.STRING(255) },
      status: { type: Sequelize.ENUM('success', 'failed'), defaultValue: 'success' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 10. plat_api_keys
    await safeCreateTable('plat_api_keys', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      keyHash: { type: Sequelize.STRING(255), unique: true, allowNull: false },
      label: { type: Sequelize.STRING(100), allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      expiresAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 11. plat_password_resets
    await safeCreateTable('plat_password_resets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      tokenHash: { type: Sequelize.STRING(255), unique: true, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      isUsed: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 12. plat_subscriptions
    await safeCreateTable('plat_subscriptions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      planId: { type: Sequelize.STRING(50), allowNull: false },
      status: { type: Sequelize.STRING(30), defaultValue: 'active' },
      currentPeriodStart: { type: Sequelize.DATE },
      currentPeriodEnd: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 13. plat_licenses
    await safeCreateTable('plat_licenses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      licenseKey: { type: Sequelize.STRING(255), unique: true, allowNull: false },
      licenseType: { type: Sequelize.STRING(50), defaultValue: 'Standard' },
      maxUsers: { type: Sequelize.INTEGER, defaultValue: 5 },
      maxBranches: { type: Sequelize.INTEGER, defaultValue: 1 },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      expiresAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 14. plat_features
    await safeCreateTable('plat_features', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      featureKey: { type: Sequelize.STRING(100), allowNull: false },
      isEnabled: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 15. plat_limits
    await safeCreateTable('plat_limits', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      limitKey: { type: Sequelize.STRING(100), allowNull: false },
      limitValue: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 16. plat_roles
    await safeCreateTable('plat_roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 17. plat_permissions
    await safeCreateTable('plat_permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 18. plat_role_permissions
    await safeCreateTable('plat_role_permissions', {
      roleId: { type: Sequelize.INTEGER, primaryKey: true },
      permissionId: { type: Sequelize.INTEGER, primaryKey: true },
    });

    // 19. plat_platform_audits
    await safeCreateTable('plat_platform_audits', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER },
      action: { type: Sequelize.STRING(100), allowNull: false },
      module: { type: Sequelize.STRING(100), allowNull: false },
      details: { type: Sequelize.TEXT },
      ipAddress: { type: Sequelize.STRING(50) },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 20. plat_tenant_audits
    await safeCreateTable('plat_tenant_audits', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: false },
      userId: { type: Sequelize.INTEGER },
      action: { type: Sequelize.STRING(100), allowNull: false },
      module: { type: Sequelize.STRING(100), allowNull: false },
      details: { type: Sequelize.TEXT },
      ipAddress: { type: Sequelize.STRING(50) },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('plat_tenant_audits');
    await queryInterface.dropTable('plat_platform_audits');
    await queryInterface.dropTable('plat_role_permissions');
    await queryInterface.dropTable('plat_permissions');
    await queryInterface.dropTable('plat_roles');
    await queryInterface.dropTable('plat_limits');
    await queryInterface.dropTable('plat_features');
    await queryInterface.dropTable('plat_licenses');
    await queryInterface.dropTable('plat_subscriptions');
    await queryInterface.dropTable('plat_password_resets');
    await queryInterface.dropTable('plat_api_keys');
    await queryInterface.dropTable('plat_login_histories');
    await queryInterface.dropTable('plat_refresh_tokens');
    await queryInterface.dropTable('plat_user_sessions');
    await queryInterface.dropTable('plat_tenant_settings');
    await queryInterface.dropTable('plat_platform_settings');
    await queryInterface.dropTable('plat_departments');
    await queryInterface.dropTable('plat_branches');
    await queryInterface.dropTable('plat_businesses');
    await queryInterface.dropTable('plat_tenants');
  }
};
