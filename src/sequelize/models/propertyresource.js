'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PropertyResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  PropertyResource.init(
    {
      from_url: DataTypes.STRING,
      url: DataTypes.STRING,
      backup_state: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'PropertyResource',
      tableName: 'property_resources',
      timestamps: false,
    },
  );
  return PropertyResource;
};
