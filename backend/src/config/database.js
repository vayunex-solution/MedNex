'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('./logger');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'medibill_pro',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      paranoid: false,
      underscored: false,
    },
  }
);

// Global Hooks for Tenant Scoping (RLS)
sequelize.addHook('beforeFind', function(options) {
  const RequestContext = require('../shared/core/context');
  
  if (this && this.rawAttributes && this.rawAttributes.tenantId && RequestContext.tenantId) {
    options.where = options.where || {};
    
    // Only enforce scope if tenantId filter is not explicitly set by the query
    if (options.where.tenantId === undefined) {
      options.where.tenantId = RequestContext.tenantId;
    }
  }
});

sequelize.addHook('beforeCreate', (instance) => {
  const RequestContext = require('../shared/core/context');
  
  if (instance.constructor.rawAttributes.tenantId && RequestContext.tenantId) {
    instance.tenantId = RequestContext.tenantId;
  }
});

sequelize.addHook('beforeBulkCreate', (instances) => {
  const RequestContext = require('../shared/core/context');
  
  if (RequestContext.tenantId) {
    for (const instance of instances) {
      if (instance.constructor.rawAttributes.tenantId) {
        instance.tenantId = RequestContext.tenantId;
      }
    }
  }
});

module.exports = sequelize;
