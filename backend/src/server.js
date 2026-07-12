'use strict';

require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./config/logger');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
  // Use raw SQL queries to bypass Sequelize model mapping bugs during startup
  const [users] = await sequelize.query('SELECT * FROM users WHERE role = "super_admin" LIMIT 1');
  const admin = users[0];
  
  if (admin) {
    // Super admin already exists - do NOT override their email or password
    logger.info(`Super admin exists: ${admin.email}`);
  } else {
    // No super admin found - create default one
    const hash = await bcrypt.hash('yash00725', 12);
    await sequelize.query(
      'INSERT INTO users (name, email, password, role, status, isDeleted, uuid, createdAt, updatedAt) VALUES ("Super Admin", "yashyr0725@gmail.com", ?, "super_admin", "active", 0, UUID(), NOW(), NOW())',
      { replacements: [hash] }
    );
    logger.info('Default super admin created: yashyr0725@gmail.com');
  }

  const [companies] = await sequelize.query('SELECT * FROM companies LIMIT 1');
  if (companies.length === 0) {
    await sequelize.query(
      `INSERT INTO companies (id, name, gstin, phone, email, address, city, state, pincode, invoicePrefix, purchasePrefix, createdAt, updatedAt) 
       VALUES (1, "MedNex Pharmacy", "29AABCU9603R1ZX", "9876543210", "info@medibillpro.com", "123, Main Street, Bangalore", "Bangalore", "Karnataka", "560001", "INV", "PUR", NOW(), NOW())`
    );
    logger.info('Default company created with ID 1');
  }
  const [gstRows] = await sequelize.query('SELECT id FROM gst_slabs LIMIT 1');
  if (gstRows.length === 0) {
    await sequelize.query(`INSERT INTO gst_slabs (slab, cgst, sgst, igst, createdAt, updatedAt) VALUES
      ('0%', 0, 0, 0, NOW(), NOW()),
      ('5%', 2.5, 2.5, 5, NOW(), NOW()),
      ('12%', 6, 6, 12, NOW(), NOW()),
      ('18%', 9, 9, 18, NOW(), NOW()),
      ('28%', 14, 14, 28, NOW(), NOW())`);
    logger.info('Default GST slabs seeded');
  }
  const [unitRows] = await sequelize.query('SELECT id FROM units LIMIT 1');
  if (unitRows.length === 0) {
    await sequelize.query(`INSERT INTO units (name, shortName, createdAt, updatedAt) VALUES
      ('Tablet', 'TAB', NOW(), NOW()),
      ('Capsule', 'CAP', NOW(), NOW()),
      ('Syrup', 'SYP', NOW(), NOW()),
      ('Injection', 'INJ', NOW(), NOW()),
      ('Cream', 'CRM', NOW(), NOW()),
      ('Ointment', 'OIN', NOW(), NOW()),
      ('Drops', 'DRP', NOW(), NOW()),
      ('Strip', 'STR', NOW(), NOW())`);
    logger.info('Default units seeded');
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    // NOTE: sync({ alter: true }) removed — it was running 100s of ALTER TABLE queries on every
    // startup because we are connected to the LIVE production DB. Schema changes should be done
    // manually via migrations, not on every boot.
    logger.info('Database connection verified (sync disabled)');
    await seedAdmin();
    // Ensure notifications table exists (safe to run on every startup via IF NOT EXISTS)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT DEFAULT NULL,
        type ENUM('sale','purchase','low_stock','expiry','system','update') DEFAULT 'system',
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(300) DEFAULT NULL,
        isRead TINYINT(1) DEFAULT 0,
        isDeleted TINYINT(1) DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT NOW(),
        updatedAt DATETIME NOT NULL DEFAULT NOW()
      )
    `);
    logger.info('Notifications table verified');
    const outboxDispatcher = require('./shared/events/outboxDispatcher');
    outboxDispatcher.start(5000);
    app.listen(PORT, () => logger.info(`MedNex server running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
