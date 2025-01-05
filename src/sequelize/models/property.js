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
      this.belongsTo(models.Residence, { targetKey: 'id', foreignKey: 'residence_id', as: 'residence' });
      this.hasMany(models.PropertyResource, { sourceKey: 'url', foreignKey: 'from_url', as: 'resources' });
    }
  }
  Property.init(
    {
      residence_id: DataTypes.BIGINT,
      name: DataTypes.STRING,
      address: DataTypes.STRING,
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
      infomation_updated_date: DataTypes.DATE,
      publish_state: DataTypes.INTEGER,
      extra_info: DataTypes.STRING,
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
