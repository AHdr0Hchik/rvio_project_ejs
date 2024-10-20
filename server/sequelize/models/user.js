'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.belongsToMany(models.Communities, {
        through: 'User_communities',
        as: 'communities',
        foreignKey: 'userId'
      });

      User.hasMany(models.users_cards, {
        as: 'cards',
        foreignKey: 'user_id'
      });
    }
  }
  User.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: DataTypes.STRING,
    imgSrc: DataTypes.STRING,
    passwordHash: DataTypes.STRING,
    lvl: DataTypes.INTEGER,
    totalExp: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};