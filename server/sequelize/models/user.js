'use strict';
const {
  Model
} = require('sequelize');
const {encrypt, decrypt} = require('../../utils/gostEncoder')
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static beforeCreate(instance, options) {
      instance.firstName = encrypt(instance.firstName);
      instance.lastName = encrypt(instance.lastName);
      instance.email = encrypt(instance.email);
    }
  
    static beforeUpdate(instance, options) {
      if (instance.changed('firstName')) {
        instance.firstName = encrypt(instance.firstName);
      }
      if (instance.changed('lastName')) {
        instance.lastName = encrypt(instance.lastName);
      }
      if (instance.changed('email')) {
        instance.email = encrypt(instance.email);
      }
    }

    getDecryptedData() {
      const attributes = Object.assign({}, this.get());
      attributes.firstName = decrypt(attributes.firstName);
      attributes.lastName = decrypt(attributes.lastName);
      return attributes;
    }
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
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    adr_coordinates: {
        type: DataTypes.TEXT,
        allowNull: true
    },
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