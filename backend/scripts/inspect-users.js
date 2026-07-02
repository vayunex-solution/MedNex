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

  try {
    const [rows] = await connection.query('SELECT id, name, email FROM users');
    console.log('Current users in database:', rows);
    
    const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'id'");
    console.log('id column definition:', columns);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}
run();
