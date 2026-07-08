'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Drop existing column 'address' on plat_branches (normalizing it to plat_branch_addresses)
      try {
        await queryInterface.removeColumn('plat_branches', 'address', { transaction });
      } catch (e) {
        // Safe to ignore if not present
      }

      // 2. Alter plat_branches to add root metadata columns
      await queryInterface.addColumn('plat_branches', 'branchCode', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'slug', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'email', {
        type: Sequelize.STRING(191),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'phone', {
        type: Sequelize.STRING(30),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'status', {
        type: Sequelize.ENUM('provisioning', 'active', 'suspended', 'archived', 'deleted'),
        defaultValue: 'active',
        allowNull: false,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'archivedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'activatedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'suspendedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'createdBy', {
        type: Sequelize.STRING(191),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'updatedBy', {
        type: Sequelize.STRING(191),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('plat_branches', 'version', {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      }, { transaction });

      // Add indexes
      await queryInterface.addIndex('plat_branches', ['slug'], { unique: true, name: 'idx_branches_slug', transaction });
      await queryInterface.addIndex('plat_branches', ['email'], { unique: true, name: 'idx_branches_email', transaction });
      await queryInterface.addIndex('plat_branches', ['status'], { name: 'idx_branches_status', transaction });

      // 3. Create plat_branch_settings table
      await queryInterface.createTable('plat_branch_settings', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        branchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_branches', key: 'id' }, onDelete: 'CASCADE' },
        key: { type: Sequelize.STRING(100), allowNull: false },
        value: { type: Sequelize.TEXT },
        datatype: { type: Sequelize.ENUM('string', 'boolean', 'integer', 'float', 'json'), defaultValue: 'string', allowNull: false },
        category: { type: Sequelize.STRING(50), defaultValue: 'general', allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_branch_settings', ['branchId', 'key'], { unique: true, name: 'idx_branch_settings_key', transaction });

      // 4. Create plat_branch_branding table
      await queryInterface.createTable('plat_branch_branding', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        branchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_branches', key: 'id' }, onDelete: 'CASCADE' },
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

      // 5. Create plat_branch_contacts table
      await queryInterface.createTable('plat_branch_contacts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        branchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_branches', key: 'id' }, onDelete: 'CASCADE' },
        email: { type: Sequelize.STRING(191) },
        phone: { type: Sequelize.STRING(30) },
        alternatePhone: { type: Sequelize.STRING(30) },
        website: { type: Sequelize.STRING(191) },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      // 6. Create plat_branch_addresses table
      await queryInterface.createTable('plat_branch_addresses', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        branchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_branches', key: 'id' }, onDelete: 'CASCADE' },
        addressLine1: { type: Sequelize.STRING(255) },
        addressLine2: { type: Sequelize.STRING(255) },
        city: { type: Sequelize.STRING(100) },
        state: { type: Sequelize.STRING(100) },
        country: { type: Sequelize.STRING(100) },
        postalCode: { type: Sequelize.STRING(20) },
        latitude: { type: Sequelize.DECIMAL(10, 8) },
        longitude: { type: Sequelize.DECIMAL(11, 8) },
        addressType: { type: Sequelize.ENUM('head_office', 'registered', 'billing', 'shipping', 'branch'), defaultValue: 'branch', allowNull: false },
        isDefault: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      // 7. Create plat_branch_preferences table
      await queryInterface.createTable('plat_branch_preferences', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        branchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_branches', key: 'id' }, onDelete: 'CASCADE' },
        key: { type: Sequelize.STRING(100), allowNull: false },
        value: { type: Sequelize.TEXT },
        datatype: { type: Sequelize.ENUM('string', 'boolean', 'integer', 'float', 'json'), defaultValue: 'string', allowNull: false },
        category: { type: Sequelize.STRING(50), defaultValue: 'general', allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_branch_preferences', ['branchId', 'key'], { unique: true, name: 'idx_branch_preferences_key', transaction });

      // 8. Create plat_branch_metadata table
      await queryInterface.createTable('plat_branch_metadata', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        branchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_branches', key: 'id' }, onDelete: 'CASCADE' },
        key: { type: Sequelize.STRING(100), allowNull: false },
        value: { type: Sequelize.TEXT },
        datatype: { type: Sequelize.ENUM('string', 'boolean', 'integer', 'float', 'json'), defaultValue: 'string', allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_branch_metadata', ['branchId', 'key'], { unique: true, name: 'idx_branch_metadata_key', transaction });

      // 9. Create plat_branch_memberships table
      await queryInterface.createTable('plat_branch_memberships', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
        branchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'plat_branches', key: 'id' }, onDelete: 'CASCADE' },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        role: { type: Sequelize.ENUM('manager', 'staff'), defaultValue: 'staff', allowNull: false },
        status: { type: Sequelize.ENUM('active', 'inactive', 'suspended'), defaultValue: 'active', allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await queryInterface.addIndex('plat_branch_memberships', ['branchId', 'userId'], { unique: true, name: 'idx_branch_memberships_unique', transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('plat_branch_memberships', { transaction });
      await queryInterface.dropTable('plat_branch_metadata', { transaction });
      await queryInterface.dropTable('plat_branch_preferences', { transaction });
      await queryInterface.dropTable('plat_branch_addresses', { transaction });
      await queryInterface.dropTable('plat_branch_contacts', { transaction });
      await queryInterface.dropTable('plat_branch_branding', { transaction });
      await queryInterface.dropTable('plat_branch_settings', { transaction });

      try {
        await queryInterface.removeIndex('plat_branches', 'idx_branches_status', { transaction });
        await queryInterface.removeIndex('plat_branches', 'idx_branches_email', { transaction });
        await queryInterface.removeIndex('plat_branches', 'idx_branches_slug', { transaction });
      } catch {}

      const columns = [
        'branchCode', 'slug', 'email', 'phone', 'status', 'archivedAt', 'activatedAt', 'suspendedAt', 'deletedAt',
        'createdBy', 'updatedBy', 'version'
      ];
      for (const col of columns) {
        try {
          await queryInterface.removeColumn('plat_branches', col, { transaction });
        } catch {}
      }

      try {
        await queryInterface.addColumn('plat_branches', 'address', { type: Sequelize.TEXT }, { transaction });
      } catch {}

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
