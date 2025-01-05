'use strict';

const { ImportFroms } = require('../enums/import-froms');
const { PublishStates } = require('../enums/publish-states');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('properties', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      residence_id: {
        type: Sequelize.BIGINT,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      address: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      // 情報の取得先まずはsuumoからのみ
      import_from: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: ImportFroms.suumo,
      },
      category: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      url: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      floor_number: {
        type: Sequelize.INTEGER,
      },
      rent_price: {
        allowNull: false,
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      management_fee: {
        allowNull: false,
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      deposit: {
        allowNull: false,
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      gratuity_fee: {
        allowNull: false,
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      floor_plan: {
        type: Sequelize.STRING,
      },
      area: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      infomation_updated_date: {
        type: Sequelize.DATE,
      },
      publish_state: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: PublishStates.publishing,
      },
      extra_info: {
        type: Sequelize.TEXT,
      },
    });
    await queryInterface.addIndex('properties', ['url'], { unique: true });
    await queryInterface.addIndex('properties', ['residence_id']);
    await queryInterface.addIndex('properties', ['address']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('properties');
  },
};
