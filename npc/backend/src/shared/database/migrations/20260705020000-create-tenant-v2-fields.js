'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Alter plat_tenants
    // Add slug, email, status columns
    await queryInterface.addColumn('plat_tenants', 'slug', {
      type: Sequelize.STRING(100),
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('plat_tenants', 'email', {
      type: Sequelize.STRING(191),
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('plat_tenants', 'status', {
      type: Sequelize.ENUM('provisioning', 'active', 'suspended', 'archived'),
      defaultValue: 'active',
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns
    try {
      await queryInterface.removeColumn('plat_tenants', 'status');
      await queryInterface.removeColumn('plat_tenants', 'email');
      await queryInterface.removeColumn('plat_tenants', 'slug');
    } catch {}
  }
};
