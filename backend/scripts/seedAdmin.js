const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../src/models');

async function seedAdmin() {
  try {
    const email = 'admin@medibill.com';
    const existingAdmin = await User.findOne({ where: { email } });
    
    if (existingAdmin) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    await User.create({
      name: 'Super Admin',
      email: email,
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
    });

    console.log('Admin user seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
