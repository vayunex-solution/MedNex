const { User } = require('../src/models');

async function checkUser() {
  try {
    const users = await User.findAll({ raw: true });
    console.log('All Users in DB:');
    console.table(users);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
