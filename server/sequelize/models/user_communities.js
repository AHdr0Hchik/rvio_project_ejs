'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class User_communities extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
        // define association here
            User_communities.belongsToMany(models.User, {
                through: 'User_communities',
                as: 'members',
                foreignKey: 'communityId'
            });
        }
    }
    User_communities.init({
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('member', 'admin'),
            allowNull: false,
            defaultValue: 'member'
        },
            createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
            updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'User_communities'
    });
    return User_communities;
};