const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimetableEntry = sequelize.define('TimetableEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  timetableId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Timetables',
      key: 'id'
    }
  },
  day: {
    type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  subjectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Subjects',
      key: 'id'
    }
  },
  facultyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Faculty',
      key: 'id'
    }
  },
  batchId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Batches',
      key: 'id'
    }
  },
  classroomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Classrooms',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('lecture', 'tutorial', 'practical'),
    defaultValue: 'lecture'
  },
  isSubstitution: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  originalFacultyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Faculty',
      key: 'id'
    }
  }
}, {
  timestamps: true
});

module.exports = TimetableEntry;