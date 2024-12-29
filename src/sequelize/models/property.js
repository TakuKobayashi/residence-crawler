'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Property extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Property.init(
    {
      residence_id: DataTypes.INTEGER,
      import_from: DataTypes.INTEGER,
      category: DataTypes.STRING,
      url: DataTypes.STRING,
      floor_number: DataTypes.INTEGER,
      rent_price: DataTypes.FLOAT,
      management_fee: DataTypes.FLOAT,
      deposit: DataTypes.FLOAT,
      gratuity_fee: DataTypes.FLOAT,
      floor_plan: DataTypes.STRING,
      area: DataTypes.INTEGER,
      options: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Property',
      tableName: 'properties',
      timestamps: false,
    },
  );
  return Property;
};
