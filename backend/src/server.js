'use strict';

require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./config/logger');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
  const { User, Company, GstSlab, Unit } = require('./models');
  const adminExists = await User.findOne({ where: { email: 'admin@mednex.com' } });
  if (!adminExists) {
    await User.create({
      name: 'Super Admin',
      email: 'admin@mednex.com',
      password: await bcrypt.hash('Admin@123', 12),
      role: 'super_admin',
      isActive: true,
    });
    logger.info('Default admin user created: admin@mednex.com / Admin@123');
  }
  const companyExists = await Company.findOne();
  if (!companyExists) {
    await Company.create({
      name: 'MedNex Pharmacy',
      gstin: '29AABCU9603R1ZX',
      phone: '9876543210',
      email: 'info@medibillpro.com',
      address: '123, Main Street, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      invoicePrefix: 'INV',
      purchasePrefix: 'PUR',
    });
  }
  const gstExists = await GstSlab.findOne();
  if (!gstExists) {
    await GstSlab.bulkCreate([
      { slab: '0%', cgst: 0, sgst: 0, igst: 0 },
      { slab: '5%', cgst: 2.5, sgst: 2.5, igst: 5 },
      { slab: '12%', cgst: 6, sgst: 6, igst: 12 },
      { slab: '18%', cgst: 9, sgst: 9, igst: 18 },
      { slab: '28%', cgst: 14, sgst: 14, igst: 28 },
    ]);
  }
  const unitExists = await Unit.findOne();
  if (!unitExists) {
    await Unit.bulkCreate([
      { name: 'Tablet', shortName: 'TAB' },
      { name: 'Capsule', shortName: 'CAP' },
      { name: 'Syrup', shortName: 'SYP' },
      { name: 'Injection', shortName: 'INJ' },
      { name: 'Cream', shortName: 'CRM' },
      { name: 'Ointment', shortName: 'OIN' },
      { name: 'Drops', shortName: 'DRP' },
      { name: 'Strip', shortName: 'STR' },
    ]);
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    await sequelize.sync({ alter: true, force: false });
    logger.info('Database synchronized');
    await seedAdmin();
    app.listen(PORT, () => logger.info(`MedNex server running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
