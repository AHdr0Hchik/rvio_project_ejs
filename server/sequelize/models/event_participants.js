'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Event_participants extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Event_participants.belongsTo(models.Events, {
        foreignKey: 'event_id',
        as: 'event'
      });
    }
  }
  Event_participants.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    event_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    reg_date: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Event_participants',
    timestamps: false
  });
  return Event_participants;
};