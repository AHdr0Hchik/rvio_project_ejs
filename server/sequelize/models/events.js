'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Events extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Events.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    date: DataTypes.DATE,
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    imgSrc: DataTypes.STRING,
    organization: DataTypes.STRING,
    address: DataTypes.STRING,
    reward_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Events',
    timestamps: false
  });
  return Events;
};