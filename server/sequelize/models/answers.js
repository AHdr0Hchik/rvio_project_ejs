'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Answers extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
        // define association here
            Answers.belongsTo(models.Questions, { foreignKey: 'question_id' });
        }
    }
    Answers.init({
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        answer_text: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        is_correct: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        sequelize,
        modelName: 'Answers',
        timestamps: false
    });
    return Answers;
    };