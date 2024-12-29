'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('residences', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      constructed_at: {
        type: Sequelize.DATE,
      }
    });
    await queryInterface.addIndex('residences', ['address'], { unique: true });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('residences');
  },
};
