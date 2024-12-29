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
      this.hasOne(models.Geometry, {
        as: 'geometry',
        foreignKey: 'data_id',
        constraints: false,
        scope: {
          data_type: 'Residence',
        },
      });
      this.hasMany(models.Property, { foreignKey: 'residence_id', as: 'properties' });
    }
  }
  Residence.init(
    {
      name: DataTypes.STRING,
      address: DataTypes.STRING,
      max_floor: DataTypes.STRING,
      route_caption: DataTypes.STRING,
      constructed_at: DataTypes.DATE,
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
