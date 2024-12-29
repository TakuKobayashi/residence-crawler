'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('geometries', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      data_type: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      data_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      // GeoJsonのtypeを "Point" | "MultiPoint" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon" | "GeometryCollection" | "Feature" | "FeatureCollection"
      geometry_type: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      group_uuid: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      lat: {
        allowNull: false,
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      lon: {
        allowNull: false,
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      geohash: {
        type: Sequelize.STRING,
      },
    });
    await queryInterface.addIndex('geometries', ['data_type', 'data_id']);
    await queryInterface.addIndex('geometries', ['group_uuid']);
    await queryInterface.addIndex('geometries', ['geohash']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('geometries');
  },
};
