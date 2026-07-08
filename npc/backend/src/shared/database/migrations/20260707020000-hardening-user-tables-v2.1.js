'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create plat_background_jobs Table
    await queryInterface.createTable('plat_background_jobs', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.CHAR(36), allowNull: false, unique: true },
      queue: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'default' },
      taskName: { type: Sequelize.STRING(100), allowNull: false },
      payload: { type: Sequelize.TEXT, allowNull: true },
      status: { 
        type: Sequelize.ENUM('pending', 'running', 'completed', 'failed', 'dead'), 
        allowNull: false, 
        defaultValue: 'pending' 
      },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      maxAttempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
      error: { type: Sequelize.TEXT, allowNull: true },
      runAt: { type: Sequelize.DATE, allowNull: true },
      lockedUntil: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 2. Create plat_processed_events Table
    await queryInterface.createTable('plat_processed_events', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      eventId: { type: Sequelize.CHAR(36), allowNull: false, unique: true },
      processedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 3. Create plat_user_password_histories Table
    await queryInterface.createTable('plat_user_password_histories', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.BIGINT, allowNull: false },
      passwordHash: { type: Sequelize.STRING(255), allowNull: false },
      hashAlgorithm: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'bcrypt' },
      version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      createdBy: { type: Sequelize.BIGINT, allowNull: true },
      migrationMetadata: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 4. Alter users Table - Add lockedUntil
    const usersTable = await queryInterface.describeTable('users');
    if (!usersTable.lockedUntil) {
      await queryInterface.addColumn('users', 'lockedUntil', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // 5. Alter plat_platform_audits Table
    const platAuditsTable = await queryInterface.describeTable('plat_platform_audits');
    if (!platAuditsTable.recordHash) {
      await queryInterface.addColumn('plat_platform_audits', 'recordHash', { type: Sequelize.CHAR(64), allowNull: true });
      await queryInterface.addColumn('plat_platform_audits', 'previousHash', { type: Sequelize.CHAR(64), allowNull: true });
      await queryInterface.addColumn('plat_platform_audits', 'correlationId', { type: Sequelize.CHAR(36), allowNull: true });
      await queryInterface.addColumn('plat_platform_audits', 'beforeValue', { type: Sequelize.TEXT, allowNull: true });
      await queryInterface.addColumn('plat_platform_audits', 'afterValue', { type: Sequelize.TEXT, allowNull: true });
      await queryInterface.addColumn('plat_platform_audits', 'userAgent', { type: Sequelize.STRING(255), allowNull: true });
      await queryInterface.addColumn('plat_platform_audits', 'operationReason', { type: Sequelize.TEXT, allowNull: true });
    }

    // 6. Alter plat_tenant_audits Table
    const tenantAuditsTable = await queryInterface.describeTable('plat_tenant_audits');
    if (!tenantAuditsTable.recordHash) {
      await queryInterface.addColumn('plat_tenant_audits', 'recordHash', { type: Sequelize.CHAR(64), allowNull: true });
      await queryInterface.addColumn('plat_tenant_audits', 'previousHash', { type: Sequelize.CHAR(64), allowNull: true });
      await queryInterface.addColumn('plat_tenant_audits', 'correlationId', { type: Sequelize.CHAR(36), allowNull: true });
      await queryInterface.addColumn('plat_tenant_audits', 'beforeValue', { type: Sequelize.TEXT, allowNull: true });
      await queryInterface.addColumn('plat_tenant_audits', 'afterValue', { type: Sequelize.TEXT, allowNull: true });
      await queryInterface.addColumn('plat_tenant_audits', 'userAgent', { type: Sequelize.STRING(255), allowNull: true });
      await queryInterface.addColumn('plat_tenant_audits', 'operationReason', { type: Sequelize.TEXT, allowNull: true });
    }

    // 7. Alter Child Tables for Soft-Delete
    const childTables = [
      'plat_user_profiles',
      'plat_user_preferences',
      'plat_user_notification_preferences',
      'plat_user_metadata',
      'plat_user_devices'
    ];

    for (const table of childTables) {
      const desc = await queryInterface.describeTable(table);
      if (!desc.isDeleted) {
        await queryInterface.addColumn(table, 'isDeleted', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
        await queryInterface.addColumn(table, 'deletedAt', {
          type: Sequelize.DATE,
          allowNull: true
        });
      }
    }

    // 8. Alter plat_user_devices - Add fingerprint fields
    const deviceTable = await queryInterface.describeTable('plat_user_devices');
    if (!deviceTable.fingerprintVersion) {
      await queryInterface.addColumn('plat_user_devices', 'fingerprintVersion', { type: Sequelize.STRING(20), allowNull: true });
      await queryInterface.addColumn('plat_user_devices', 'confidenceScore', { type: Sequelize.FLOAT, allowNull: false, defaultValue: 1.0 });
      await queryInterface.addColumn('plat_user_devices', 'normalizedHash', { type: Sequelize.STRING(64), allowNull: true });
    }

    // 9. Add Optimized Indexes (wrapped in try-catch to ensure idempotency)
    try {
      await queryInterface.addIndex('users', ['email', 'isDeleted'], { name: 'idx_users_email_isdeleted' });
    } catch (e) {
      // Ignore if index already exists
    }

    try {
      await queryInterface.addIndex('users', ['phone', 'isDeleted'], { name: 'idx_users_phone_isdeleted' });
    } catch (e) {}

    try {
      await queryInterface.addIndex('users', ['lastLoginAt'], { name: 'idx_users_lastlogin' });
    } catch (e) {}
    
    try {
      await queryInterface.addIndex('plat_user_profiles', ['userId', 'isDeleted'], { name: 'idx_profiles_user_deleted' });
    } catch (e) {}

    try {
      await queryInterface.addIndex('plat_user_preferences', ['userId', 'isDeleted'], { name: 'idx_preferences_user_deleted' });
    } catch (e) {}

    try {
      await queryInterface.addIndex('plat_user_notification_preferences', ['userId', 'isDeleted'], { name: 'idx_notif_pref_user_deleted' });
    } catch (e) {}

    try {
      await queryInterface.addIndex('plat_user_metadata', ['userId', 'isDeleted'], { name: 'idx_metadata_user_deleted' });
    } catch (e) {}

    try {
      await queryInterface.addIndex('plat_user_devices', ['userId', 'isDeleted'], { name: 'idx_devices_user_deleted' });
    } catch (e) {}

    try {
      await queryInterface.addIndex('plat_background_jobs', ['status', 'runAt'], { name: 'idx_jobs_status_runat' });
    } catch (e) {}
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Remove Indexes
    await queryInterface.removeIndex('plat_background_jobs', 'idx_jobs_status_runat').catch(() => null);
    await queryInterface.removeIndex('plat_user_devices', 'idx_devices_user_deleted').catch(() => null);
    await queryInterface.removeIndex('plat_user_metadata', 'idx_metadata_user_deleted').catch(() => null);
    await queryInterface.removeIndex('plat_user_notification_preferences', 'idx_notif_pref_user_deleted').catch(() => null);
    await queryInterface.removeIndex('plat_user_preferences', 'idx_preferences_user_deleted').catch(() => null);
    await queryInterface.removeIndex('plat_user_profiles', 'idx_profiles_user_deleted').catch(() => null);
    await queryInterface.removeIndex('users', 'idx_users_lastlogin').catch(() => null);
    await queryInterface.removeIndex('users', 'idx_users_phone_isdeleted').catch(() => null);
    await queryInterface.removeIndex('users', 'idx_users_email_isdeleted').catch(() => null);

    // 2. Remove Columns from plat_user_devices
    await queryInterface.removeColumn('plat_user_devices', 'fingerprintVersion').catch(() => null);
    await queryInterface.removeColumn('plat_user_devices', 'confidenceScore').catch(() => null);
    await queryInterface.removeColumn('plat_user_devices', 'normalizedHash').catch(() => null);

    // 3. Remove columns from Child Tables
    const childTables = [
      'plat_user_profiles',
      'plat_user_preferences',
      'plat_user_notification_preferences',
      'plat_user_metadata',
      'plat_user_devices'
    ];
    for (const table of childTables) {
      await queryInterface.removeColumn(table, 'isDeleted').catch(() => null);
      await queryInterface.removeColumn(table, 'deletedAt').catch(() => null);
    }

    // 4. Remove Columns from plat_tenant_audits
    await queryInterface.removeColumn('plat_tenant_audits', 'recordHash').catch(() => null);
    await queryInterface.removeColumn('plat_tenant_audits', 'previousHash').catch(() => null);
    await queryInterface.removeColumn('plat_tenant_audits', 'correlationId').catch(() => null);
    await queryInterface.removeColumn('plat_tenant_audits', 'beforeValue').catch(() => null);
    await queryInterface.removeColumn('plat_tenant_audits', 'afterValue').catch(() => null);
    await queryInterface.removeColumn('plat_tenant_audits', 'userAgent').catch(() => null);
    await queryInterface.removeColumn('plat_tenant_audits', 'operationReason').catch(() => null);

    // 5. Remove Columns from plat_platform_audits
    await queryInterface.removeColumn('plat_platform_audits', 'recordHash').catch(() => null);
    await queryInterface.removeColumn('plat_platform_audits', 'previousHash').catch(() => null);
    await queryInterface.removeColumn('plat_platform_audits', 'correlationId').catch(() => null);
    await queryInterface.removeColumn('plat_platform_audits', 'beforeValue').catch(() => null);
    await queryInterface.removeColumn('plat_platform_audits', 'afterValue').catch(() => null);
    await queryInterface.removeColumn('plat_platform_audits', 'userAgent').catch(() => null);
    await queryInterface.removeColumn('plat_platform_audits', 'operationReason').catch(() => null);

    // 6. Remove Column from users
    await queryInterface.removeColumn('users', 'lockedUntil').catch(() => null);

    // 7. Drop Tables
    await queryInterface.dropTable('plat_user_password_histories').catch(() => null);
    await queryInterface.dropTable('plat_processed_events').catch(() => null);
    await queryInterface.dropTable('plat_background_jobs').catch(() => null);
  }
};
