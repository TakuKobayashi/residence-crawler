'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('properties', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      residence_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      // 情報の取得先まずはsuumoからのみ
      importFrom: {
        allowNull: false,
        type: Sequelize.INTEGER,
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
      options: {
        type: Sequelize.TEXT,
      },
    });
    await queryInterface.addIndex('properties', ['url'], { unique: true });
    await queryInterface.addIndex('properties', ['residence_id']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('properties');
  },
};
