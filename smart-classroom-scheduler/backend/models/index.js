const User = require('./User');
const Faculty = require('./Faculty');
const Classroom = require('./Classroom');
const Subject = require('./Subject');
const Batch = require('./Batch');
const FacultySubject = require('./FacultySubject');
const Timetable = require('./Timetable');
const TimetableEntry = require('./TimetableEntry');
const LeaveRequest = require('./LeaveRequest');
const Substitution = require('./Substitution');
const FacultyAvailability = require('./FacultyAvailability');

// Define relationships

// User - Faculty (One-to-One)
User.hasOne(Faculty, { foreignKey: 'userId' });
Faculty.belongsTo(User, { foreignKey: 'userId' });

// Faculty - Subject (Many-to-Many)
Faculty.belongsToMany(Subject, { through: FacultySubject, foreignKey: 'facultyId' });
Subject.belongsToMany(Faculty, { through: FacultySubject, foreignKey: 'subjectId' });

// Timetable - TimetableEntry (One-to-Many)
Timetable.hasMany(TimetableEntry, { foreignKey: 'timetableId' });
TimetableEntry.belongsTo(Timetable, { foreignKey: 'timetableId' });

// Subject - TimetableEntry (One-to-Many)
Subject.hasMany(TimetableEntry, { foreignKey: 'subjectId' });
TimetableEntry.belongsTo(Subject, { foreignKey: 'subjectId' });

// Faculty - TimetableEntry (One-to-Many)
Faculty.hasMany(TimetableEntry, { foreignKey: 'facultyId' });
TimetableEntry.belongsTo(Faculty, { foreignKey: 'facultyId' });

// Batch - TimetableEntry (One-to-Many)
Batch.hasMany(TimetableEntry, { foreignKey: 'batchId' });
TimetableEntry.belongsTo(Batch, { foreignKey: 'batchId' });

// Classroom - TimetableEntry (One-to-Many)
Classroom.hasMany(TimetableEntry, { foreignKey: 'classroomId' });
TimetableEntry.belongsTo(Classroom, { foreignKey: 'classroomId' });

// Faculty - LeaveRequest (One-to-Many)
Faculty.hasMany(LeaveRequest, { foreignKey: 'facultyId' });
LeaveRequest.belongsTo(Faculty, { foreignKey: 'facultyId' });

// User - LeaveRequest (One-to-Many) for approval
User.hasMany(LeaveRequest, { foreignKey: 'approvedBy', as: 'ApprovedLeaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'approvedBy', as: 'Approver' });

// TimetableEntry - Substitution (One-to-Many)
TimetableEntry.hasMany(Substitution, { foreignKey: 'timetableEntryId' });
Substitution.belongsTo(TimetableEntry, { foreignKey: 'timetableEntryId' });

// Faculty - Substitution (One-to-Many) for original faculty
Faculty.hasMany(Substitution, { foreignKey: 'originalFacultyId', as: 'OriginalFacultySubstitutions' });
Substitution.belongsTo(Faculty, { foreignKey: 'originalFacultyId', as: 'OriginalFaculty' });

// Faculty - Substitution (One-to-Many) for substitute faculty
Faculty.hasMany(Substitution, { foreignKey: 'substituteFacultyId', as: 'SubstituteFacultySubstitutions' });
Substitution.belongsTo(Faculty, { foreignKey: 'substituteFacultyId', as: 'SubstituteFaculty' });

// LeaveRequest - Substitution (One-to-Many)
LeaveRequest.hasMany(Substitution, { foreignKey: 'leaveRequestId' });
Substitution.belongsTo(LeaveRequest, { foreignKey: 'leaveRequestId' });

// Faculty - FacultyAvailability (One-to-Many)
Faculty.hasMany(FacultyAvailability, { foreignKey: 'facultyId' });
FacultyAvailability.belongsTo(Faculty, { foreignKey: 'facultyId' });

// User - Timetable (One-to-Many) for creation
User.hasMany(Timetable, { foreignKey: 'createdBy', as: 'CreatedTimetables' });
Timetable.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

// User - Timetable (One-to-Many) for approval
User.hasMany(Timetable, { foreignKey: 'approvedBy', as: 'ApprovedTimetables' });
Timetable.belongsTo(User, { foreignKey: 'approvedBy', as: 'Approver' });

module.exports = {
  User,
  Faculty,
  Classroom,
  Subject,
  Batch,
  FacultySubject,
  Timetable,
  TimetableEntry,
  LeaveRequest,
  Substitution,
  FacultyAvailability
};