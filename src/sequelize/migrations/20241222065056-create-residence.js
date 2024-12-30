'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('residences', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      uuid: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      address: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      max_floor: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      route_caption: {
        type: Sequelize.STRING,
      },
      constructed_date: {
        type: Sequelize.DATE,
      },
      lat: {
        type: Sequelize.FLOAT,
      },
      lon: {
        type: Sequelize.FLOAT,
      },
      geohash: {
        type: Sequelize.STRING,
      },
    });
    await queryInterface.addIndex('residences', ['address'], { unique: true });
    await queryInterface.addIndex('residences', ['uuid'], { unique: true });
    await queryInterface.addIndex('residences', ['geohash']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('residences');
  },
};
