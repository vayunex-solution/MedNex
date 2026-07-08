'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create plat_user_memberships
    await queryInterface.createTable('plat_user_memberships', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      userId: { type: Sequelize.STRING(191), allowNull: false },
      tenantId: { type: Sequelize.BIGINT, allowNull: false },
      businessId: { type: Sequelize.BIGINT, allowNull: false },
      branchId: { type: Sequelize.BIGINT, allowNull: false },
      roleId: { type: Sequelize.BIGINT, allowNull: false },
      status: { type: Sequelize.ENUM('active', 'pending', 'suspended'), defaultValue: 'active', allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Add index for fast memberships lookup
    await queryInterface.addIndex('plat_user_memberships', ['userId', 'tenantId', 'branchId'], {
      name: 'idx_membership_lookup',
    });

    // 2. Create plat_login_rate_limits
    await queryInterface.createTable('plat_login_rate_limits', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      attemptKey: { type: Sequelize.STRING(255), unique: true, allowNull: false },
      attemptsCount: { type: Sequelize.INTEGER, defaultValue: 1, allowNull: false },
      lockExpiry: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 3. Create plat_api_key_scopes
    await queryInterface.createTable('plat_api_key_scopes', {
      apiKeyId: { type: Sequelize.BIGINT, primaryKey: true },
      permissionId: { type: Sequelize.BIGINT, primaryKey: true },
    });

    // 4. Alter plat_user_sessions
    // Add columns for status, lastActiveAt, expiresAt
    await queryInterface.addColumn('plat_user_sessions', 'status', {
      type: Sequelize.ENUM('active', 'expired', 'terminated'),
      defaultValue: 'active',
      allowNull: false,
    });
    await queryInterface.addColumn('plat_user_sessions', 'lastActiveAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    // Add uuid column to user sessions (in case it wasn't there)
    await queryInterface.addColumn('plat_user_sessions', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
    });

    // 5. Alter plat_refresh_tokens
    // Add parentHash, familyRootHash, isRevoked, sessionId
    await queryInterface.addColumn('plat_refresh_tokens', 'parentHash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('plat_refresh_tokens', 'familyRootHash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('plat_refresh_tokens', 'sessionId', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });

    // 6. Alter plat_api_keys
    // Add prefix, uuid, lastUsedAt, revokedAt, revokedReason columns
    await queryInterface.addColumn('plat_api_keys', 'prefix', {
      type: Sequelize.STRING(10),
      allowNull: true,
    });
    await queryInterface.addColumn('plat_api_keys', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
    });
    await queryInterface.addColumn('plat_api_keys', 'lastUsedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('plat_api_keys', 'revokedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('plat_api_keys', 'revokedReason', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns
    try {
      await queryInterface.removeColumn('plat_api_keys', 'revokedReason');
      await queryInterface.removeColumn('plat_api_keys', 'revokedAt');
      await queryInterface.removeColumn('plat_api_keys', 'lastUsedAt');
      await queryInterface.removeColumn('plat_api_keys', 'uuid');
      await queryInterface.removeColumn('plat_api_keys', 'prefix');
    } catch {}
    try {
      await queryInterface.removeColumn('plat_refresh_tokens', 'sessionId');
      await queryInterface.removeColumn('plat_refresh_tokens', 'familyRootHash');
      await queryInterface.removeColumn('plat_refresh_tokens', 'parentHash');
    } catch {}
    try {
      await queryInterface.removeColumn('plat_user_sessions', 'uuid');
      await queryInterface.removeColumn('plat_user_sessions', 'lastActiveAt');
      await queryInterface.removeColumn('plat_user_sessions', 'status');
    } catch {}

    await queryInterface.dropTable('plat_api_key_scopes');
    await queryInterface.dropTable('plat_login_rate_limits');
    await queryInterface.dropTable('plat_user_memberships');
  }
};
