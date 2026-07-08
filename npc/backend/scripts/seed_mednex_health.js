'use strict';
const dotenv = require('dotenv');
dotenv.config();
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, dialect: 'mysql', logging: false
});

async function run() {
  try {
    const [[app]] = await s.query("SELECT id FROM plat_applications WHERE slug = 'mednex' LIMIT 1");
    if (!app) { console.error('MedNex not found'); process.exit(1); }

    const [health] = await s.query('SELECT id FROM plat_application_health WHERE applicationId = ?', { replacements: [app.id] });
    if (health.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await s.query(
        "INSERT INTO plat_application_health (uuid, applicationId, environment, status, responseTime, uptimeScore, healthScore, heartbeatAt, createdAt, updatedAt) VALUES (?, ?, 'production', 'healthy', 120, 99.9, 98.5, ?, ?, ?)",
        { replacements: [uuidv4(), app.id, now, now, now] }
      );
      console.log('Health record created for MedNex (score: 98.5)');
    } else {
      console.log('Health record already exists for MedNex');
    }
  } catch (err) {
    console.error(err.message);
    // Try describing the health table
    try {
      const [cols] = await s.query('DESCRIBE plat_application_health');
      console.log('Columns:', cols.map(c => c.Field).join(', '));
    } catch {}
    process.exit(1);
  } finally {
    await s.close();
  }
}
run();
