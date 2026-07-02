const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Connected to database. Fixing auto-increment schemas...');
  
  try {
    // 1. Drop foreign keys that prevent altering
    try {
      console.log('Dropping foreign key audit_logs_userId_fkey...');
      await connection.query('ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_userId_fkey`');
    } catch(e) { 
      console.log('Note (might not exist yet):', e.message); 
    }

    // 2. Clean up any invalid/empty rows that could block auto_increment setup
    console.log('Cleaning up users table...');
    await connection.query("DELETE FROM `users` WHERE `email` = '' OR `email` IS NULL");

    // 3. Make users.id AUTO_INCREMENT
    console.log('Setting auto_increment on users.id...');
    await connection.query('ALTER TABLE `users` MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT');

    // 4. Re-create the foreign key constraint
    try {
      console.log('Re-creating foreign key constraint...');
      await connection.query('ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE');
    } catch(e) { 
      console.log('Note (re-creation):', e.message); 
    }

    console.log('Database fix script completed successfully!');
  } catch (err) {
    console.error('Error running fix script:', err);
  } finally {
    await connection.end();
  }
}

run();
