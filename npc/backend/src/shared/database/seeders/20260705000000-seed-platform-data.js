'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // 1. Seed Roles
    const roles = [
      { name: 'super_admin', uuid: uuidv4(), createdAt: now, updatedAt: now },
      { name: 'admin', uuid: uuidv4(), createdAt: now, updatedAt: now },
      { name: 'pharmacist', uuid: uuidv4(), createdAt: now, updatedAt: now },
      { name: 'cashier', uuid: uuidv4(), createdAt: now, updatedAt: now },
    ];
    await queryInterface.bulkInsert('plat_roles', roles);

    // 2. Seed Permissions
    const permissions = [
      { name: 'manage-billing', uuid: uuidv4(), createdAt: now, updatedAt: now },
      { name: 'manage-inventory', uuid: uuidv4(), createdAt: now, updatedAt: now },
      { name: 'view-reports', uuid: uuidv4(), createdAt: now, updatedAt: now },
      { name: 'manage-users', uuid: uuidv4(), createdAt: now, updatedAt: now },
      { name: 'manage-settings', uuid: uuidv4(), createdAt: now, updatedAt: now },
    ];
    await queryInterface.bulkInsert('plat_permissions', permissions);

    // Fetch inserted roles and permissions to map associations
    const [insertedRoles] = await queryInterface.sequelize.query(`SELECT id, name FROM plat_roles;`);
    const [insertedPermissions] = await queryInterface.sequelize.query(`SELECT id, name FROM plat_permissions;`);

    const roleMap = insertedRoles.reduce((acc, row) => ({ ...acc, [row.name]: row.id }), {});
    const permMap = insertedPermissions.reduce((acc, row) => ({ ...acc, [row.name]: row.id }), {});

    // 3. Seed RolePermissions mappings
    const rolePermissions = [
      // admin gets all standard permissions
      { roleId: roleMap['admin'], permissionId: permMap['manage-billing'] },
      { roleId: roleMap['admin'], permissionId: permMap['manage-inventory'] },
      { roleId: roleMap['admin'], permissionId: permMap['view-reports'] },
      { roleId: roleMap['admin'], permissionId: permMap['manage-users'] },
      { roleId: roleMap['admin'], permissionId: permMap['manage-settings'] },
      
      // pharmacist gets billing & inventory
      { roleId: roleMap['pharmacist'], permissionId: permMap['manage-billing'] },
      { roleId: roleMap['pharmacist'], permissionId: permMap['manage-inventory'] },
      { roleId: roleMap['pharmacist'], permissionId: permMap['view-reports'] },

      // cashier gets only billing
      { roleId: roleMap['cashier'], permissionId: permMap['manage-billing'] },
    ];
    await queryInterface.bulkInsert('plat_role_permissions', rolePermissions);

    // 4. Seed PlatformSettings
    const settings = [
      { key: 'platform_name', value: 'Nex Platform Core', description: 'Name of the SaaS platform', createdAt: now, updatedAt: now },
      { key: 'allowed_signup_tiers', value: 'Free,Growth,Enterprise', description: 'Comma separated plan lists', createdAt: now, updatedAt: now },
      { key: 'maintenance_mode', value: 'false', description: 'Global maintenance toggle', createdAt: now, updatedAt: now },
    ];
    await queryInterface.bulkInsert('plat_platform_settings', settings);

    // 5. Seed default Super Admin user if not exists
    const [users] = await queryInterface.sequelize.query(`SELECT id FROM users WHERE email='admin@mednex.com';`);
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      await queryInterface.bulkInsert('users', [{
        id: 1,
        name: 'Super Admin',
        email: 'admin@mednex.com',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }]);
    } else {
      // Ensure role is super_admin
      await queryInterface.sequelize.query(`UPDATE users SET role='super_admin' WHERE email='admin@mednex.com';`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('plat_role_permissions', null, {});
    await queryInterface.bulkDelete('plat_permissions', null, {});
    await queryInterface.bulkDelete('plat_roles', null, {});
    await queryInterface.bulkDelete('plat_platform_settings', null, {});
  }
};
