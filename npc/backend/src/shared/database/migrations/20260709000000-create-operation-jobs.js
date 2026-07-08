'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('plat_operation_jobs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
      },
      applicationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'plat_applications',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tenantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'plat_tenants',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      operationType: {
        type: Sequelize.ENUM('provision', 'deprovision', 'sync', 'suspend', 'resume', 'backup', 'restore', 'rotate', 'upgrade', 'migrate'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'queued', 'running', 'waiting_for_remote', 'retrying', 'completed', 'failed', 'dead_letter'),
        defaultValue: 'pending',
        allowNull: false
      },
      retryCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      maxRetries: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
        allowNull: false
      },
      payload: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      lastError: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      nextAttemptAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('plat_operation_jobs');
  }
};
