'use strict';

const { ImportFroms } = require('../enums/import-froms');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('crawler_roots', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      import_from: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: ImportFroms.suumo,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      priority: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      last_url: {
        type: Sequelize.STRING,
      },
      last_page_number: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      last_request_params: {
        type: Sequelize.TEXT,
      },
      last_executed_at: {
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex('crawler_roots', ['url'], { unique: true });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('crawler_roots');
  },
};
