const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Batch = sequelize.define('Batch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  strength: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  shift: {
    type: DataTypes.ENUM('morning', 'afternoon', 'evening'),
    defaultValue: 'morning'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

module.exports = Batch;