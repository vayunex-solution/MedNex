'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');

const sequelize = require('../src/config/database');

// Load ALL model files recursively
function loadModels(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadModels(fullPath);
    } else if (file.name.endsWith('.model.js')) {
      try {
        require(fullPath);
        console.log('  Loaded:', file.name);
      } catch (e) {
        console.warn('  SKIP:', file.name, '-', e.message);
      }
    }
  }
}

const srcDir = path.join(__dirname, '../src');
console.log('Loading all models from', srcDir);
loadModels(srcDir);

console.log('\nRunning sequelize.sync({ alter: true })...');
sequelize.sync({ force: false, alter: true })
  .then(() => {
    console.log('\n✅ ALL TABLES SYNCED SUCCESSFULLY');
    process.exit(0);
  })
  .catch(e => {
    console.error('\n❌ SYNC FAILED:', e.message);
    process.exit(1);
  });
