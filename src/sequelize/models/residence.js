'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Residence extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.Property, { sourceKey: 'id', foreignKey: 'residence_id', as: 'properties' });
    }
  }
  Residence.init(
    {
      name: DataTypes.STRING,
      address: DataTypes.STRING,
      max_floor: DataTypes.STRING,
      route_caption: DataTypes.STRING,
      constructed_date: {
        type: DataTypes.DATE,
        field: 'constructed_date',
        set(value) {
          if (!value) {
            return null;
          }
          return value.toISOString().replace(/\..+/g, '')
        },
      },
      lat: DataTypes.FLOAT,
      lon: DataTypes.FLOAT,
      geohash: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Residence',
      tableName: 'residences',
      timestamps: false,
    },
  );
  return Residence;
};
