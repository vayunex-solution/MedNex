const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Connected to database. Disabling foreign key checks and fixing auto-increment...');
  
  try {
    // 1. Disable foreign key checks for this session
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Clean up any invalid/empty rows that could block auto_increment setup
    console.log('Cleaning up users table...');
    await connection.query("DELETE FROM `users` WHERE `email` = '' OR `email` IS NULL");

    // 3. Make users.id AUTO_INCREMENT
    console.log('Setting auto_increment on users.id...');
    await connection.query('ALTER TABLE `users` MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT');

    // 4. Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Database fix script completed successfully!');
  } catch (err) {
    console.error('Error running fix script:', err);
  } finally {
    await connection.end();
  }
}

run();
