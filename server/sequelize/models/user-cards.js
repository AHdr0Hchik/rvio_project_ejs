'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserCards extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UserCards.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    user_id: DataTypes.INTEGER,
    card_id: DataTypes.INTEGER,
    card_lvl: DataTypes.INTEGER,
    card_exp: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'users_cards',
    timestamps: false
  });
  return UserCards;
};