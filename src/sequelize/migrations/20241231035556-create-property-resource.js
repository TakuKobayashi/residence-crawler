'use strict';

const { BackupStates } = require('../enums/backup-states');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('property_resources', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      from_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      backup_state: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: BackupStates.stay,
      },
    });
    await queryInterface.addIndex('property_resources', ['from_url', 'url']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('property_resources');
  },
};
