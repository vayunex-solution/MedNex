'use strict';

const dotenv = require('dotenv');
dotenv.config();

const { User } = require('../src/models');
const bcrypt = require('bcryptjs');

async function reset() {
  try {
    const hashed = await bcrypt.hash('yash00725', 12);
    const [updated] = await User.update(
      { password: hashed },
      { where: { email: 'yashkr4748@gmail.com' } }
    );
    console.log(`Updated admin password successfully: ${updated} row(s) updated.`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

reset();
