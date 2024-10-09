'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Cards extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Cards.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: DataTypes.STRING,
    shortDesc: DataTypes.STRING,
    fullDesc: DataTypes.STRING,
    baseExp: DataTypes.FLOAT,
    basePrice: DataTypes.FLOAT,
    imgSrc: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Cards',
    timestamps: false
  });
  return Cards;
};