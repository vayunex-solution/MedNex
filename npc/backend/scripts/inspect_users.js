'use strict';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = require('../src/config/database');

async function inspect() {
  try {
    console.log('--- Inspecting Users Table Schema ---');
    const [columns] = await sequelize.query('DESCRIBE users;');
    console.table(columns);

    console.log('--- Inspecting Users Rows ---');
    const [rows] = await sequelize.query('SELECT id, name, email, role, isActive, isDeleted FROM users;');
    console.table(rows);
    
    console.log('--- Inspecting Memberships ---');
    const [memberships] = await sequelize.query('SELECT * FROM plat_user_memberships;');
    console.table(memberships);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

inspect();
