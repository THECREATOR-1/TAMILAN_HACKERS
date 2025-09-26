const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  lectureHoursPerWeek: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tutorialHoursPerWeek: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  practicalHoursPerWeek: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isElective: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  requiresLab: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

module.exports = Subject;