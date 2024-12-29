'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Geometry extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Geometry.init(
    {
      data_type: DataTypes.STRING,
      data_id: DataTypes.INTEGER,
      geometry_type: DataTypes.STRING,
      group_uuid: DataTypes.STRING,
      lat: DataTypes.FLOAT,
      lon: DataTypes.FLOAT,
      geohash: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Geometry',
      tableName: 'geometries',
      timestamps: false,
    },
  );
  return Geometry;
};
