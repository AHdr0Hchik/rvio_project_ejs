'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Questions extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
        // define association here
            Questions.belongsTo(models.Tests, { foreignKey: 'test_id' });
            Questions.hasMany(models.Answers, { foreignKey: 'question_id' });
        }
    }
    Questions.init({
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        question_text: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('single', 'multiple', 'text'),  // single - одиночный выбор, multiple - множественный, text - открытый ответ
            allowNull: false,
            defaultValue: 'single'  // По умолчанию одиночный выбор
        }
    }, {
        sequelize,
        modelName: 'Questions',
        timestamps: false
    });
    return Questions;
    };