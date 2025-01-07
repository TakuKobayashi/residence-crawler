'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CrawlerRoot extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrawlerRoot.init(
    {
      import_from: DataTypes.INTEGER,
      title: DataTypes.STRING,
      url: DataTypes.STRING,
      priority: DataTypes.INTEGER,
      sequence_start_url: DataTypes.STRING,
      sequence_last_url: DataTypes.STRING,
      last_page_number: DataTypes.INTEGER,
      last_request_params: DataTypes.STRING,
      reached_end_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'CrawlerRoot',
      tableName: 'crawler_roots',
      timestamps: false,
    },
  );
  return CrawlerRoot;
};
