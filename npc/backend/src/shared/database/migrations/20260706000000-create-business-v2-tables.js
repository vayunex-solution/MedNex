'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Alter plat_businesses table to add all root fields & version
      await queryInterface.addColumn('plat_businesses', 'legalName', {
        type: Sequelize.STRING(200),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'displayName', {
        type: Sequelize.STRING(200),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'businessCode', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'slug', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'email', {
        type: Sequelize.STRING(191),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'phone', {
        type: Sequelize.STRING(30),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'industry', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'businessType', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'currency', {
        type: Sequelize.STRING(10),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'timezone', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'locale', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'language', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'website', {
        type: Sequelize.STRING(191),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'taxNumber', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'registrationNumber', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'status', {
        type: Sequelize.ENUM('provisioning', 'active', 'suspended', 'archived', 'deleted'),
        defaultValue: 'active',
        allowNull: false,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'archivedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'activatedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'suspendedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'createdBy', {
        type: Sequelize.STRING(191),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'updatedBy', {
        type: Sequelize.STRING(191),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_businesses', 'version', {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      }, { transaction });

      // Add indexes for searching/filtering
      await queryInterface.addIndex('plat_businesses', ['slug'], { unique: true, name: 'idx_businesses_slug', transaction });
      await queryInterface.addIndex('plat_businesses', ['email'], { unique: true, name: 'idx_businesses_email', transaction });
      await queryInterface.addIndex('plat_businesses', ['status'], { name: 'idx_businesses_status', transaction });

      // 2. Create plat_business_settings (Configuration Registry) table
      await queryInterface.createTable('plat_business_settings', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_businesses', key: 'id' }, onDelete: 'CASCADE' },
        key: { type: Sequelize.STRING(100), allowNull: false },
        value: { type: Sequelize.TEXT },
        datatype: { type: Sequelize.ENUM('string', 'boolean', 'integer', 'float', 'json'), defaultValue: 'string', allowNull: false },
        category: { type: Sequelize.STRING(50), defaultValue: 'general', allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_business_settings', ['businessId', 'key'], { unique: true, name: 'idx_business_settings_key', transaction });

      // 3. Create plat_business_branding table
      await queryInterface.createTable('plat_business_branding', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_businesses', key: 'id' }, onDelete: 'CASCADE' },
        logo: { type: Sequelize.STRING(255) },
        darkLogo: { type: Sequelize.STRING(255) },
        favicon: { type: Sequelize.STRING(255) },
        primaryColor: { type: Sequelize.STRING(20), defaultValue: '#0052CC' },
        secondaryColor: { type: Sequelize.STRING(20), defaultValue: '#0065FF' },
        theme: { type: Sequelize.STRING(20), defaultValue: 'light' },
        emailHeaderLogo: { type: Sequelize.STRING(255) },
        emailFooterLogo: { type: Sequelize.STRING(255) },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      // 4. Create plat_business_contacts table
      await queryInterface.createTable('plat_business_contacts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_businesses', key: 'id' }, onDelete: 'CASCADE' },
        email: { type: Sequelize.STRING(191) },
        phone: { type: Sequelize.STRING(30) },
        alternatePhone: { type: Sequelize.STRING(30) },
        website: { type: Sequelize.STRING(191) },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      // 5. Create plat_business_addresses table
      await queryInterface.createTable('plat_business_addresses', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_businesses', key: 'id' }, onDelete: 'CASCADE' },
        addressLine1: { type: Sequelize.STRING(255) },
        addressLine2: { type: Sequelize.STRING(255) },
        city: { type: Sequelize.STRING(100) },
        state: { type: Sequelize.STRING(100) },
        country: { type: Sequelize.STRING(100) },
        postalCode: { type: Sequelize.STRING(20) },
        latitude: { type: Sequelize.DECIMAL(10, 8) },
        longitude: { type: Sequelize.DECIMAL(11, 8) },
        addressType: { type: Sequelize.ENUM('head_office', 'registered', 'billing', 'shipping', 'branch'), defaultValue: 'registered', allowNull: false },
        isDefault: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      // 6. Create plat_business_preferences table
      await queryInterface.createTable('plat_business_preferences', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_businesses', key: 'id' }, onDelete: 'CASCADE' },
        key: { type: Sequelize.STRING(100), allowNull: false },
        value: { type: Sequelize.TEXT },
        datatype: { type: Sequelize.ENUM('string', 'boolean', 'integer', 'float', 'json'), defaultValue: 'string', allowNull: false },
        category: { type: Sequelize.STRING(50), defaultValue: 'general', allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_business_preferences', ['businessId', 'key'], { unique: true, name: 'idx_business_preferences_key', transaction });

      // 7. Create plat_business_metadata table
      await queryInterface.createTable('plat_business_metadata', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_businesses', key: 'id' }, onDelete: 'CASCADE' },
        key: { type: Sequelize.STRING(100), allowNull: false },
        value: { type: Sequelize.TEXT },
        datatype: { type: Sequelize.ENUM('string', 'boolean', 'integer', 'float', 'json'), defaultValue: 'string', allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_business_metadata', ['businessId', 'key'], { unique: true, name: 'idx_business_metadata_key', transaction });

      // 8. Create plat_business_memberships table
      await queryInterface.createTable('plat_business_memberships', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_businesses', key: 'id' }, onDelete: 'CASCADE' },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        role: { type: Sequelize.ENUM('owner', 'manager', 'staff'), defaultValue: 'staff', allowNull: false },
        status: { type: Sequelize.ENUM('active', 'inactive', 'suspended'), defaultValue: 'active', allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_business_memberships', ['businessId', 'userId'], { unique: true, name: 'idx_business_memberships_unique', transaction });

      // 9. Create plat_outbox table
      await queryInterface.createTable('plat_outbox', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        eventName: { type: Sequelize.STRING(100), allowNull: false },
        payload: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.ENUM('pending', 'processed', 'failed'), defaultValue: 'pending', allowNull: false },
        error: { type: Sequelize.TEXT },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_outbox', ['status'], { name: 'idx_outbox_status', transaction });

      // 10. Create plat_idempotency_keys table
      await queryInterface.createTable('plat_idempotency_keys', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        key: { type: Sequelize.STRING(255), allowNull: false, unique: true },
        status: { type: Sequelize.ENUM('processing', 'completed'), defaultValue: 'processing', allowNull: false },
        responseStatus: { type: Sequelize.INTEGER },
        responseBody: { type: Sequelize.TEXT },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('plat_idempotency_keys', { transaction });
      await queryInterface.dropTable('plat_outbox', { transaction });
      await queryInterface.dropTable('plat_business_memberships', { transaction });
      await queryInterface.dropTable('plat_business_metadata', { transaction });
      await queryInterface.dropTable('plat_business_preferences', { transaction });
      await queryInterface.dropTable('plat_business_addresses', { transaction });
      await queryInterface.dropTable('plat_business_contacts', { transaction });
      await queryInterface.dropTable('plat_business_branding', { transaction });
      await queryInterface.dropTable('plat_business_settings', { transaction });

      try {
        await queryInterface.removeIndex('plat_businesses', 'idx_businesses_status', { transaction });
        await queryInterface.removeIndex('plat_businesses', 'idx_businesses_email', { transaction });
        await queryInterface.removeIndex('plat_businesses', 'idx_businesses_slug', { transaction });
      } catch {}

      const columns = [
        'legalName', 'displayName', 'businessCode', 'slug', 'email', 'phone', 'industry', 'businessType',
        'currency', 'timezone', 'locale', 'language', 'website', 'taxNumber', 'registrationNumber',
        'status', 'archivedAt', 'activatedAt', 'suspendedAt', 'deletedAt', 'createdBy', 'updatedBy', 'version'
      ];
      for (const col of columns) {
        try {
          await queryInterface.removeColumn('plat_businesses', col, { transaction });
        } catch {}
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
