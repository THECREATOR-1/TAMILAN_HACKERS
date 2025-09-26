const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Substitution = sequelize.define('Substitution', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  timetableEntryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'TimetableEntries',
      key: 'id'
    }
  },
  originalFacultyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Faculty',
      key: 'id'
    }
  },
  substituteFacultyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Faculty',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  leaveRequestId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'LeaveRequests',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending'
  },
  notificationSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notificationSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  responseReceivedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Substitution;