'use strict';

require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./config/logger');
const bcrypt = require('bcryptjs');
const outboxDispatcher = require('./shared/events/outboxDispatcher');

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
  const { User } = require('./models');
  
  // Check if a super admin already exists
  const admin = await User.findOne({ where: { role: 'super_admin' } });
  if (admin) {
    let changed = false;
    if (admin.email !== 'yashkr4748@gmail.com') {
      admin.email = 'yashkr4748@gmail.com';
      changed = true;
    }
    const passMatch = await bcrypt.compare('yash00725', admin.password);
    if (!passMatch) {
      admin.password = await bcrypt.hash('yash00725', 12);
      changed = true;
    }
    if (changed) {
      await admin.save();
      logger.info('Admin credentials asserted to yashkr4748@gmail.com / yash00725');
    }
  } else {
    // If not, create one
    await User.create({
      id: 27, // Match the existing table entry
      name: 'Super Admin',
      email: 'yashkr4748@gmail.com',
      password: await bcrypt.hash('yash00725', 12),
      role: 'super_admin',
      isActive: true,
    });
    logger.info('Default admin user created: yashkr4748@gmail.com / yash00725');
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // We run migrations using CLI in production/CI, but for convenience we sync if forced
    // await sequelize.sync({ alter: false, force: false });
    logger.info('Database synchronized (skipped)');
    
    await seedAdmin();
    
    // Start Outbox Dispatcher loop
    outboxDispatcher.start(5000);

    // Start Operations Job Queue Worker
    const operationJobEngine = require('./platform/application/operationJobEngine');
    operationJobEngine.start(5000);

    app.listen(PORT, () => logger.info(`Nex Platform Core server running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
