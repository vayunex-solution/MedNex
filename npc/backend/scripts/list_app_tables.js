'use strict';
const dotenv = require('dotenv');
dotenv.config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, dialect: 'mysql', logging: false
});
s.query('SHOW TABLES').then(([rows]) => {
  rows.filter(r => Object.values(r)[0].includes('plat_app')).forEach(r => console.log(Object.values(r)[0]));
  return s.close();
}).catch(e => { console.error(e.message); process.exit(1); });
