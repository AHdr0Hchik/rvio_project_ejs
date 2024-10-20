'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserResults extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
        // define association here
            UserResults.belongsTo(models.Tests, { foreignKey: 'test_id' });
            
        }
    }
    UserResults.init({
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        score: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        start_time: {
            type: DataTypes.DATE, // Время начала прохождения теста
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        completed_at: {
            type: DataTypes.DATE, // Время окончания теста
        }
    }, {
        sequelize,
        modelName: 'UserResults',
        timestamps: false
    });
    return UserResults;
};