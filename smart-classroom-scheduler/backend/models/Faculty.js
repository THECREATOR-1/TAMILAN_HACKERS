const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Faculty = sequelize.define('Faculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: true
  },
  maxHoursPerDay: {
    type: DataTypes.INTEGER,
    defaultValue: 6
  },
  maxHoursPerWeek: {
    type: DataTypes.INTEGER,
    defaultValue: 24
  },
  preferredStartTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  preferredEndTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

module.exports = Faculty;