'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const PlatProcessedEvent = sequelize.define('PlatProcessedEvent', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  eventId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    unique: true,
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'plat_processed_events',
  timestamps: false,
});

module.exports = PlatProcessedEvent;
