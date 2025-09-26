const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FacultySubject = sequelize.define('FacultySubject', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  facultyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Faculty',
      key: 'id'
    }
  },
  subjectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Subjects',
      key: 'id'
    }
  },
  preference: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: 'Scale of 1-10, 10 being highest preference'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

module.exports = FacultySubject;