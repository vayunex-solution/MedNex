'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. plat_applications
    await queryInterface.createTable('plat_applications', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      displayName: { type: Sequelize.STRING(150) },
      slug: { type: Sequelize.STRING(100), unique: true, allowNull: false },
      description: { type: Sequelize.TEXT },
      logo: { type: Sequelize.STRING(255) },
      icon: { type: Sequelize.STRING(50) },
      theme: { type: Sequelize.STRING(50) },
      category: { type: Sequelize.STRING(50) },
      status: { type: Sequelize.ENUM('active', 'suspended', 'archived'), defaultValue: 'active', allowNull: false },
      ownerUserId: { type: Sequelize.INTEGER, allowNull: true },
      tenantId: { type: Sequelize.INTEGER, allowNull: true },
      businessId: { type: Sequelize.INTEGER, allowNull: true },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      productionUrl: { type: Sequelize.STRING(255) },
      stagingUrl: { type: Sequelize.STRING(255) },
      developmentUrl: { type: Sequelize.STRING(255) },
      sdkVersion: { type: Sequelize.STRING(50), defaultValue: '1.0.0' },
      manifest: { type: Sequelize.TEXT }, // APP-201
      pluginConfig: { type: Sequelize.TEXT }, // APP-213
      marketplaceConfig: { type: Sequelize.TEXT }, // APP-211
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 2. plat_application_memberships
    await queryInterface.createTable('plat_application_memberships', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      role: { type: Sequelize.STRING(50), defaultValue: 'member', allowNull: false },
      status: { type: Sequelize.STRING(50), defaultValue: 'active', allowNull: false },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 3. plat_application_api_keys
    await queryInterface.createTable('plat_application_api_keys', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      key: { type: Sequelize.STRING(255), unique: true, allowNull: false },
      secret: { type: Sequelize.STRING(255) },
      name: { type: Sequelize.STRING(150), allowNull: false },
      scopes: { type: Sequelize.TEXT },
      status: { type: Sequelize.ENUM('active', 'revoked', 'expired'), defaultValue: 'active', allowNull: false },
      expiresAt: { type: Sequelize.DATE },
      lastUsedAt: { type: Sequelize.DATE },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 4. plat_application_sdk_credentials
    await queryInterface.createTable('plat_application_sdk_credentials', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      clientId: { type: Sequelize.STRING(100), unique: true, allowNull: false },
      clientSecret: { type: Sequelize.STRING(255), allowNull: false },
      status: { type: Sequelize.STRING(50), defaultValue: 'active', allowNull: false },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 5. plat_application_webhooks
    await queryInterface.createTable('plat_application_webhooks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      url: { type: Sequelize.STRING(255), allowNull: false },
      secret: { type: Sequelize.STRING(255), allowNull: false },
      signingKey: { type: Sequelize.STRING(255) },
      events: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(50), defaultValue: 'active', allowNull: false },
      retryPolicy: { type: Sequelize.TEXT },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 6. plat_application_oauth_clients
    await queryInterface.createTable('plat_application_oauth_clients', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      clientId: { type: Sequelize.STRING(100), unique: true, allowNull: false },
      clientSecret: { type: Sequelize.STRING(255), allowNull: false },
      redirectUrls: { type: Sequelize.TEXT },
      scopes: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(50), defaultValue: 'active', allowNull: false },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 7. plat_application_feature_flags
    await queryInterface.createTable('plat_application_feature_flags', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      key: { type: Sequelize.STRING(100), allowNull: false },
      value: { type: Sequelize.STRING(255), defaultValue: 'false', allowNull: false },
      description: { type: Sequelize.TEXT },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 8. plat_application_rate_limits
    await queryInterface.createTable('plat_application_rate_limits', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      limit: { type: Sequelize.INTEGER, defaultValue: 1000, allowNull: false },
      burstLimit: { type: Sequelize.INTEGER, defaultValue: 60, allowNull: false },
      period: { type: Sequelize.STRING(50), defaultValue: 'day', allowNull: false },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 9. plat_application_logs
    await queryInterface.createTable('plat_application_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      level: { type: Sequelize.STRING(50), defaultValue: 'info', allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      meta: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 10. plat_application_health
    await queryInterface.createTable('plat_application_health', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      status: { type: Sequelize.STRING(50), defaultValue: 'online', allowNull: false },
      responseTime: { type: Sequelize.INTEGER },
      heartbeatAt: { type: Sequelize.DATE },
      uptimeScore: { type: Sequelize.FLOAT, defaultValue: 100.0, allowNull: false },
      healthScore: { type: Sequelize.FLOAT, defaultValue: 100.0, allowNull: false }, // APP-214
      lastError: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 11. plat_application_analytics
    await queryInterface.createTable('plat_application_analytics', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      date: { type: Sequelize.STRING(10), allowNull: false },
      requestsCount: { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false },
      errorsCount: { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false },
      activeUsersCount: { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false },
      storageBytes: { type: Sequelize.BIGINT, defaultValue: 0, allowNull: false },
      billingUnits: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0.00, allowNull: false }, // APP-212
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 12. plat_application_domains
    await queryInterface.createTable('plat_application_domains', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      domain: { type: Sequelize.STRING(255), allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      status: { type: Sequelize.STRING(50), defaultValue: 'pending', allowNull: false },
      verificationToken: { type: Sequelize.STRING(255) },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 13. plat_application_environments
    await queryInterface.createTable('plat_application_environments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      configs: { type: Sequelize.TEXT },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 14. plat_application_secrets
    await queryInterface.createTable('plat_application_secrets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      applicationId: { type: Sequelize.INTEGER, allowNull: false },
      environment: { type: Sequelize.STRING(50), defaultValue: 'production', allowNull: false },
      key: { type: Sequelize.STRING(100), allowNull: false },
      value: { type: Sequelize.TEXT, allowNull: false },
      isDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Add indexes for efficient queries
    await queryInterface.addIndex('plat_application_memberships', ['applicationId', 'userId']);
    await queryInterface.addIndex('plat_application_api_keys', ['applicationId', 'environment']);
    await queryInterface.addIndex('plat_application_webhooks', ['applicationId', 'environment']);
    await queryInterface.addIndex('plat_application_feature_flags', ['applicationId', 'key']);
    await queryInterface.addIndex('plat_application_logs', ['applicationId', 'environment']);
    await queryInterface.addIndex('plat_application_health', ['applicationId', 'environment']);
    await queryInterface.addIndex('plat_application_analytics', ['applicationId', 'environment', 'date']);
    await queryInterface.addIndex('plat_application_domains', ['applicationId', 'environment']);
    await queryInterface.addIndex('plat_application_secrets', ['applicationId', 'environment', 'key']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('plat_application_secrets');
    await queryInterface.dropTable('plat_application_environments');
    await queryInterface.dropTable('plat_application_domains');
    await queryInterface.dropTable('plat_application_analytics');
    await queryInterface.dropTable('plat_application_health');
    await queryInterface.dropTable('plat_application_logs');
    await queryInterface.dropTable('plat_application_rate_limits');
    await queryInterface.dropTable('plat_application_feature_flags');
    await queryInterface.dropTable('plat_application_oauth_clients');
    await queryInterface.dropTable('plat_application_webhooks');
    await queryInterface.dropTable('plat_application_sdk_credentials');
    await queryInterface.dropTable('plat_application_api_keys');
    await queryInterface.dropTable('plat_application_memberships');
    await queryInterface.dropTable('plat_applications');
  }
};
