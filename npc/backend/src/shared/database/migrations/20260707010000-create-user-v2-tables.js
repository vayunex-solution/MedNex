'use strict';

const crypto = require('crypto');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Disable foreign key checks
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 0. Drop referencing foreign keys if they exist
    try {
      await queryInterface.sequelize.query('ALTER TABLE `projects` DROP FOREIGN KEY `projects_createdById_fkey`');
    } catch (e) {
      // Ignore if constraint doesn't exist
    }
    try {
      await queryInterface.sequelize.query('ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `refresh_tokens_userId_fkey`');
    } catch (e) {
      // Ignore if constraint doesn't exist
    }

    const tableInfo = await queryInterface.describeTable('users');

    // 0. Reconcile users.id from VARCHAR to BIGINT AUTO_INCREMENT
    if (tableInfo.id && tableInfo.id.type.includes('VARCHAR')) {
      const [users] = await queryInterface.sequelize.query('SELECT id FROM users');
      let seq = 1;
      for (const u of users) {
        if (!/^\d+$/.test(u.id)) {
          // Convert references first
          await queryInterface.sequelize.query('UPDATE `projects` SET `createdById` = ? WHERE `createdById` = ?', {
            replacements: [seq, u.id]
          }).catch(() => null);
          await queryInterface.sequelize.query('UPDATE `refresh_tokens` SET `userId` = ? WHERE `userId` = ?', {
            replacements: [seq, u.id]
          }).catch(() => null);
          await queryInterface.sequelize.query('UPDATE `users` SET `id` = ? WHERE `id` = ?', {
            replacements: [seq, u.id]
          });
          seq++;
        } else {
          seq = Math.max(seq, parseInt(u.id) + 1);
        }
      }

      // Modify referencing columns type to BIGINT
      await queryInterface.sequelize.query('ALTER TABLE `projects` MODIFY `createdById` BIGINT NOT NULL').catch(() => null);
      await queryInterface.sequelize.query('ALTER TABLE `refresh_tokens` MODIFY `userId` BIGINT NOT NULL').catch(() => null);

      // Modify users.id to BIGINT NOT NULL AUTO_INCREMENT
      await queryInterface.sequelize.query('ALTER TABLE `users` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT');

      // Recreate foreign key constraints
      await queryInterface.sequelize.query('ALTER TABLE `projects` ADD CONSTRAINT `projects_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE CASCADE').catch(() => null);
      await queryInterface.sequelize.query('ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE').catch(() => null);
    }

    // 1. Alter users table
    if (!tableInfo.uuid) {
      await queryInterface.addColumn('users', 'uuid', {
        type: Sequelize.UUID,
        allowNull: true,
      });

      // Populate existing users with UUIDs
      const [users] = await queryInterface.sequelize.query('SELECT id FROM users');
      for (const u of users) {
        const uuidVal = crypto.randomUUID();
        await queryInterface.sequelize.query('UPDATE users SET uuid = ? WHERE id = ?', {
          replacements: [uuidVal, u.id]
        });
      }

      await queryInterface.changeColumn('users', 'uuid', {
        type: Sequelize.UUID,
        allowNull: false,
      });

      await queryInterface.addIndex('users', ['uuid'], {
        unique: true,
        name: 'idx_users_uuid',
      });
    }

    if (!tableInfo.userType) {
      await queryInterface.addColumn('users', 'userType', {
        type: Sequelize.ENUM('super_admin', 'developer', 'tenant_owner', 'business_owner', 'branch_manager', 'employee', 'service_account', 'system', 'bot', 'customer'),
        defaultValue: 'employee',
        allowNull: false,
      });
    }

    if (!tableInfo.status) {
      await queryInterface.addColumn('users', 'status', {
        type: Sequelize.ENUM('pending', 'email_pending', 'phone_pending', 'mfa_pending', 'active', 'locked', 'suspended', 'archived', 'deleted'),
        defaultValue: 'active',
        allowNull: false,
      });
    }

    if (!tableInfo.emailVerifiedAt) {
      await queryInterface.addColumn('users', 'emailVerifiedAt', { type: Sequelize.DATE, allowNull: true });
    }
    if (!tableInfo.emailVerificationToken) {
      await queryInterface.addColumn('users', 'emailVerificationToken', { type: Sequelize.STRING(255), allowNull: true });
    }
    if (!tableInfo.emailVerificationExpiresAt) {
      await queryInterface.addColumn('users', 'emailVerificationExpiresAt', { type: Sequelize.DATE, allowNull: true });
    }

    if (!tableInfo.phoneVerifiedAt) {
      await queryInterface.addColumn('users', 'phoneVerifiedAt', { type: Sequelize.DATE, allowNull: true });
    }
    if (!tableInfo.phoneVerificationToken) {
      await queryInterface.addColumn('users', 'phoneVerificationToken', { type: Sequelize.STRING(255), allowNull: true });
    }
    if (!tableInfo.phoneVerificationExpiresAt) {
      await queryInterface.addColumn('users', 'phoneVerificationExpiresAt', { type: Sequelize.DATE, allowNull: true });
    }

    if (!tableInfo.passwordResetRequired) {
      await queryInterface.addColumn('users', 'passwordResetRequired', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false });
    }

    if (!tableInfo.isMfaEnabled) {
      await queryInterface.addColumn('users', 'isMfaEnabled', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false });
    }
    if (!tableInfo.mfaSecret) {
      await queryInterface.addColumn('users', 'mfaSecret', { type: Sequelize.STRING(255), allowNull: true });
    }
    if (!tableInfo.mfaBackupCodes) {
      await queryInterface.addColumn('users', 'mfaBackupCodes', { type: Sequelize.TEXT, allowNull: true });
    }

    if (!tableInfo.failedAttempts) {
      await queryInterface.addColumn('users', 'failedAttempts', { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false });
    }
    if (!tableInfo.lastLoginAt) {
      await queryInterface.addColumn('users', 'lastLoginAt', { type: Sequelize.DATE, allowNull: true });
    }
    if (!tableInfo.lastLoginIp) {
      await queryInterface.addColumn('users', 'lastLoginIp', { type: Sequelize.STRING(50), allowNull: true });
    }
    if (!tableInfo.passwordChangedAt) {
      await queryInterface.addColumn('users', 'passwordChangedAt', { type: Sequelize.DATE, allowNull: true });
    }

    if (!tableInfo.version) {
      await queryInterface.addColumn('users', 'version', { type: Sequelize.INTEGER, defaultValue: 1, allowNull: false });
    }

    if (!tableInfo.archivedAt) {
      await queryInterface.addColumn('users', 'archivedAt', { type: Sequelize.DATE, allowNull: true });
    }
    if (!tableInfo.activatedAt) {
      await queryInterface.addColumn('users', 'activatedAt', { type: Sequelize.DATE, allowNull: true });
    }
    if (!tableInfo.suspendedAt) {
      await queryInterface.addColumn('users', 'suspendedAt', { type: Sequelize.DATE, allowNull: true });
    }
    if (!tableInfo.deletedAt) {
      await queryInterface.addColumn('users', 'deletedAt', { type: Sequelize.DATE, allowNull: true });
    }

    // 2. Create plat_user_profiles
    await queryInterface.createTable('plat_user_profiles', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      firstName: { type: Sequelize.STRING(100), allowNull: true },
      lastName: { type: Sequelize.STRING(100), allowNull: true },
      avatarFileId: { type: Sequelize.STRING(255), allowNull: true },
      avatarUrl: { type: Sequelize.STRING(255), allowNull: true },
      gender: { type: Sequelize.STRING(20), allowNull: true },
      birthDate: { type: Sequelize.DATEONLY, allowNull: true },
      timezone: { type: Sequelize.STRING(100), defaultValue: 'UTC', allowNull: false },
      locale: { type: Sequelize.STRING(20), defaultValue: 'en', allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('plat_user_profiles', ['userId'], {
      name: 'idx_profiles_userId',
    });

    // 3. Create plat_user_preferences
    await queryInterface.createTable('plat_user_preferences', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      key: { type: Sequelize.STRING(100), allowNull: false },
      value: { type: Sequelize.TEXT, allowNull: true },
      datatype: { type: Sequelize.ENUM('string', 'boolean', 'integer', 'float', 'json'), defaultValue: 'string', allowNull: false },
      category: { type: Sequelize.STRING(50), defaultValue: 'general', allowNull: false },
      scope: { type: Sequelize.ENUM('user', 'business', 'branch', 'tenant'), defaultValue: 'user', allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('plat_user_preferences', ['userId', 'key'], {
      name: 'idx_preferences_lookup',
    });

    // 4. Create plat_user_notification_preferences
    await queryInterface.createTable('plat_user_notification_preferences', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      channel: { type: Sequelize.ENUM('email', 'sms', 'push', 'whatsapp', 'webhook', 'in_app'), allowNull: false },
      category: { type: Sequelize.STRING(50), defaultValue: 'general', allowNull: false },
      isEnabled: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('plat_user_notification_preferences', ['userId', 'channel'], {
      name: 'idx_notif_prefs_lookup',
    });

    // 5. Create plat_user_metadata
    await queryInterface.createTable('plat_user_metadata', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      key: { type: Sequelize.STRING(100), allowNull: false },
      value: { type: Sequelize.TEXT, allowNull: true },
      datatype: { type: Sequelize.STRING(50), defaultValue: 'string', allowNull: false },
      visibility: { type: Sequelize.ENUM('private', 'internal', 'public'), defaultValue: 'private', allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('plat_user_metadata', ['userId', 'key'], {
      name: 'idx_metadata_lookup',
    });

    // 6. Create plat_user_devices
    await queryInterface.createTable('plat_user_devices', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      deviceFingerprint: { type: Sequelize.STRING(255), allowNull: false },
      deviceName: { type: Sequelize.STRING(100), allowNull: true },
      deviceType: { type: Sequelize.STRING(50), allowNull: true },
      browser: { type: Sequelize.STRING(50), allowNull: true },
      browserVersion: { type: Sequelize.STRING(50), allowNull: true },
      os: { type: Sequelize.STRING(50), allowNull: true },
      osVersion: { type: Sequelize.STRING(50), allowNull: true },
      ip: { type: Sequelize.STRING(50), allowNull: true },
      country: { type: Sequelize.STRING(100), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      lastSeen: { type: Sequelize.DATE, allowNull: true },
      trustedUntil: { type: Sequelize.DATE, allowNull: true },
      isTrusted: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('plat_user_devices', ['userId', 'deviceFingerprint'], {
      name: 'idx_devices_lookup',
    });

    // Re-enable foreign key checks
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  },

  down: async (queryInterface, Sequelize) => {
    // Drop child tables
    await queryInterface.dropTable('plat_user_devices');
    await queryInterface.dropTable('plat_user_metadata');
    await queryInterface.dropTable('plat_user_notification_preferences');
    await queryInterface.dropTable('plat_user_preferences');
    await queryInterface.dropTable('plat_user_profiles');

    // Remove added columns from users
    try { await queryInterface.removeIndex('users', 'idx_users_uuid'); } catch {}
    try { await queryInterface.removeColumn('users', 'deletedAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'suspendedAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'activatedAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'archivedAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'version'); } catch {}
    try { await queryInterface.removeColumn('users', 'passwordChangedAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'lastLoginIp'); } catch {}
    try { await queryInterface.removeColumn('users', 'lastLoginAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'failedAttempts'); } catch {}
    try { await queryInterface.removeColumn('users', 'mfaBackupCodes'); } catch {}
    try { await queryInterface.removeColumn('users', 'mfaSecret'); } catch {}
    try { await queryInterface.removeColumn('users', 'isMfaEnabled'); } catch {}
    try { await queryInterface.removeColumn('users', 'passwordResetRequired'); } catch {}
    try { await queryInterface.removeColumn('users', 'phoneVerificationExpiresAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'phoneVerificationToken'); } catch {}
    try { await queryInterface.removeColumn('users', 'phoneVerifiedAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'emailVerificationExpiresAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'emailVerificationToken'); } catch {}
    try { await queryInterface.removeColumn('users', 'emailVerifiedAt'); } catch {}
    try { await queryInterface.removeColumn('users', 'status'); } catch {}
    try { await queryInterface.removeColumn('users', 'userType'); } catch {}
    try { await queryInterface.removeColumn('users', 'uuid'); } catch {}
  }
};
