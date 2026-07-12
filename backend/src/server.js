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
        updatedAt DATETIME NOT NULL DEFAULT NOW()
      )
    `);
    logger.info('Notifications table verified');

    // Create plat_impersonation_logs
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_impersonation_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sessionId VARCHAR(100) NOT NULL,
        adminId INT NOT NULL,
        tenantId INT NOT NULL,
        reason VARCHAR(255) NOT NULL,
        ipAddress VARCHAR(45) NOT NULL,
        userAgent VARCHAR(255) NOT NULL,
        startedAt DATETIME NOT NULL DEFAULT NOW(),
        endedAt DATETIME NULL,
        duration INT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
      )
    `);

    // Create plat_plans
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT NOW()
      )
    `);

    // Create plat_plan_features
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_plan_features (
        planId VARCHAR(50) NOT NULL,
        featureKey VARCHAR(100) NOT NULL,
        PRIMARY KEY (planId, featureKey)
      )
    `);

    // Create plat_tenant_feature_overrides
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_tenant_feature_overrides (
        tenantId INT NOT NULL,
        featureKey VARCHAR(100) NOT NULL,
        isEnabled TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (tenantId, featureKey)
      )
    `);

    // Create plat_outbox_jobs
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_outbox_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        jobType VARCHAR(100) NOT NULL,
        payload TEXT NOT NULL,
        priority INT NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        maxAttempts INT NOT NULL DEFAULT 5,
        nextRunAt DATETIME NOT NULL DEFAULT NOW(),
        lockedAt DATETIME NULL,
        lockedBy VARCHAR(100) NULL,
        createdAt DATETIME NOT NULL DEFAULT NOW(),
        updatedAt DATETIME NOT NULL DEFAULT NOW(),
        finishedAt DATETIME NULL,
        lastError TEXT NULL
      )
    `);

    // Create plat_api_keys
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        keyHash VARCHAR(64) NOT NULL,
        keyPrefix VARCHAR(12) NOT NULL,
        scopes TEXT NOT NULL,
        rateLimit INT NOT NULL DEFAULT 60,
        expiresAt DATETIME NULL,
        revokedAt DATETIME NULL,
        lastUsedAt DATETIME NULL,
        createdBy INT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT NOW()
      )
    `);

    // Create plat_webhooks
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_webhooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        url VARCHAR(255) NOT NULL,
        secretKey VARCHAR(100) NOT NULL,
        events TEXT NOT NULL,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT NOW()
      )
    `);

    // Create plat_offers
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        type ENUM('flat', 'percentage', 'buy_x_get_y') NOT NULL,
        value DECIMAL(10,2) NOT NULL DEFAULT 0,
        minBillAmount DECIMAL(10,2) DEFAULT 0,
        holderType VARCHAR(50) DEFAULT 'General',
        startDate DATETIME NOT NULL,
        endDate DATETIME NOT NULL,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT NOW()
      )
    `);

    // Create plat_email_campaigns
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_email_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        segment VARCHAR(50) NOT NULL, -- 'VIP', 'Inactive', 'Doctors', 'All' etc.
        status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed'
        sentCount INT NOT NULL DEFAULT 0,
        deliveredCount INT NOT NULL DEFAULT 0,
        failedCount INT NOT NULL DEFAULT 0,
        scheduledAt DATETIME NULL,
        createdAt DATETIME NOT NULL DEFAULT NOW()
      )
    `);

    // Create plat_email_campaign_logs
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS plat_email_campaign_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaignId INT NOT NULL,
        recipientEmail VARCHAR(150) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
        sentAt DATETIME NULL,
        lastError TEXT NULL
      )
    `);

    // Seed default plans if empty
    const [plansCount] = await sequelize.query('SELECT COUNT(*) as count FROM plat_plans');
    if (plansCount[0].count === 0) {
      await sequelize.query(`
        INSERT INTO plat_plans (id, name, price) VALUES
        ('Starter', 'Starter Plan', 19.00),
        ('Professional', 'Professional Plan', 49.00),
        ('Enterprise', 'Enterprise Plan', 99.00)
      `);
      await sequelize.query(`
        INSERT INTO plat_plan_features (planId, featureKey) VALUES
        ('Starter', 'pos-billing'),
        ('Starter', 'inventory-tracking'),
        ('Professional', 'pos-billing'),
        ('Professional', 'inventory-tracking'),
        ('Professional', 'reports-export'),
        ('Professional', 'email-notifications'),
        ('Enterprise', 'pos-billing'),
        ('Enterprise', 'inventory-tracking'),
        ('Enterprise', 'reports-export'),
        ('Enterprise', 'email-notifications'),
        ('Enterprise', 'email-marketing'),
        ('Enterprise', 'developer-apis')
      `);
      logger.info('SaaS Plans seeded successfully');
    }

    const outboxDispatcher = require('./shared/events/outboxDispatcher');
    outboxDispatcher.start(5000);
    app.listen(PORT, () => logger.info(`MedNex server running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
