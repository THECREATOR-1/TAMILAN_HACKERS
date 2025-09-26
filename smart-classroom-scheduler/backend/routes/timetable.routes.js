const express = require('express');
const router = express.Router();
const { Timetable, TimetableEntry, Batch, Subject, Faculty, User, Classroom } = require('../models');
const { authenticate, isAdminOrHOD, isSameDepartment } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// @route   GET /api/timetables
// @desc    Get all timetables
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};
    
    // Filter by department if provided
    if (req.query.department) {
      query.department = req.query.department;
    }
    // Filter by semester if provided
    if (req.query.semester) {
      query.semester = req.query.semester;
    }
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // If user is not admin, only show timetables from their department
    if (req.user.role !== 'admin') {
      query.department = req.user.department;
    }
    
    const timetables = await Timetable.findAll({
      where: query,
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(timetables);
  } catch (error) {
    console.error('Get timetables error:', error);
    res.status(500).json({ message: 'Server error while fetching timetables' });
  }
});

// @route   GET /api/timetables/:id
// @desc    Get timetable by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: TimetableEntry,
          include: [
            { model: Subject },
            { 
              model: Faculty,
              include: [{
                model: User,
                attributes: ['id', 'name', 'email']
              }]
            },
            { model: Batch },
            { model: Classroom }
          ]
        }
      ]
    });
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is not admin and timetable is not from their department
    if (req.user.role !== 'admin' && timetable.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view timetables from your department' });
    }
    
    res.json(timetable);
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ message: 'Server error while fetching timetable' });
  }
});

// @route   POST /api/timetables
// @desc    Create a new timetable
// @access  Private (Admin/HOD)
router.post('/', authenticate, isAdminOrHOD, isSameDepartment, async (req, res) => {
  try {
    const { name, semester, academicYear, department, startDate, endDate } = req.body;
    
    // Validate required fields
    if (!name || !semester || !academicYear || !department || !startDate || !endDate) {
      return res.status(400).json({
        message: 'Please provide name, semester, academicYear, department, startDate, and endDate'
      });
    }
    
    // Create timetable
    const timetable = await Timetable.create({
      name,
      semester,
      academicYear,
      department,
      startDate,
      endDate,
      status: 'draft',
      createdBy: req.user.id
    });
    
    res.status(201).json({
      message: 'Timetable created successfully',
      timetable
    });
  } catch (error) {
    console.error('Create timetable error:', error);
    res.status(500).json({ message: 'Server error while creating timetable' });
  }
});

// @route   PUT /api/timetables/:id
// @desc    Update timetable
// @access  Private (Admin/HOD)
router.put('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is HOD, only allow updating timetables from their department
    if (req.user.role === 'hod' && timetable.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only update timetables from your department' });
    }
    
    // Don't allow updating if timetable is already approved or published
    if (timetable.status === 'approved' || timetable.status === 'published') {
      return res.status(400).json({ message: 'Cannot update approved or published timetable' });
    }
    
    const { name, semester, academicYear, department, startDate, endDate } = req.body;
    
    // Update timetable
    await timetable.update({
      name: name || timetable.name,
      semester: semester !== undefined ? semester : timetable.semester,
      academicYear: academicYear || timetable.academicYear,
      department: department || timetable.department,
      startDate: startDate || timetable.startDate,
      endDate: endDate || timetable.endDate
    });
    
    res.json({
      message: 'Timetable updated successfully',
      timetable
    });
  } catch (error) {
    console.error('Update timetable error:', error);
    res.status(500).json({ message: 'Server error while updating timetable' });
  }
});

// @route   DELETE /api/timetables/:id
// @desc    Delete timetable
// @access  Private (Admin/HOD)
router.delete('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is HOD, only allow deleting timetables from their department
    if (req.user.role === 'hod' && timetable.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only delete timetables from your department' });
    }
    
    // Don't allow deleting if timetable is published
    if (timetable.status === 'published') {
      return res.status(400).json({ message: 'Cannot delete published timetable' });
    }
    
    // Instead of hard delete, set isActive to false
    await timetable.update({ isActive: false });
    
    res.json({ message: 'Timetable deactivated successfully' });
  } catch (error) {
    console.error('Delete timetable error:', error);
    res.status(500).json({ message: 'Server error while deactivating timetable' });
  }
});

// @route   POST /api/timetables/:id/generate
// @desc    Generate timetable entries
// @access  Private (Admin/HOD)
router.post('/:id/generate', authenticate, isAdminOrHOD, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is HOD, only allow generating timetables for their department
    if (req.user.role === 'hod' && timetable.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only generate timetables for your department' });
    }
    
    // Don't allow generating if timetable is already approved or published
    if (timetable.status === 'approved' || timetable.status === 'published') {
      return res.status(400).json({ message: 'Cannot generate approved or published timetable' });
    }
    
    // Get batches for this department and semester
    const batches = await Batch.findAll({
      where: {
        department: timetable.department,
        semester: timetable.semester,
        isActive: true
      }
    });
    
    if (batches.length === 0) {
      return res.status(400).json({ message: 'No active batches found for this department and semester' });
    }
    
    // Get subjects for this department and semester
    const subjects = await Subject.findAll({
      where: {
        department: timetable.department,
        semester: timetable.semester,
        isActive: true
      }
    });
    
    if (subjects.length === 0) {
      return res.status(400).json({ message: 'No active subjects found for this department and semester' });
    }
    
    // Get faculty for this department
    const faculty = await Faculty.findAll({
      include: [{
        model: User,
        where: {
          department: timetable.department,
          isActive: true
        }
      }],
      where: {
        isActive: true
      }
    });
    
    if (faculty.length === 0) {
      return res.status(400).json({ message: 'No active faculty found for this department' });
    }
    
    // Get classrooms
    const classrooms = await Classroom.findAll({
      where: {
        isActive: true
      }
    });
    
    if (classrooms.length === 0) {
      return res.status(400).json({ message: 'No active classrooms found' });
    }
    
    // Get faculty subject preferences
    const facultySubjects = await sequelize.query(
      `SELECT "FacultySubjects"."facultyId", "FacultySubjects"."subjectId", "FacultySubjects"."preference"
       FROM "FacultySubjects"
       JOIN "Faculty" ON "FacultySubjects"."facultyId" = "Faculty"."id"
       JOIN "Users" ON "Faculty"."userId" = "Users"."id"
       WHERE "Users"."department" = :department AND "FacultySubjects"."isActive" = true`,
      {
        replacements: { department: timetable.department },
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );
    
    // Delete existing timetable entries
    await TimetableEntry.destroy({
      where: { timetableId: timetable.id },
      transaction
    });
    
    // Generate timetable entries using optimization algorithm
    const timetableEntries = generateTimetableEntries(
      timetable,
      batches,
      subjects,
      faculty,
      classrooms,
      facultySubjects
    );
    
    // Create timetable entries
    await TimetableEntry.bulkCreate(timetableEntries, { transaction });
    
    // Update timetable status
    await timetable.update({ status: 'pending_approval' }, { transaction });
    
    await transaction.commit();
    
    res.json({
      message: 'Timetable generated successfully',
      entriesCount: timetableEntries.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Generate timetable error:', error);
    res.status(500).json({ message: 'Server error while generating timetable' });
  }
});

// @route   POST /api/timetables/:id/approve
// @desc    Approve timetable
// @access  Private (Admin/HOD)
router.post('/:id/approve', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is HOD, only allow approving timetables for their department
    if (req.user.role === 'hod' && timetable.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only approve timetables for your department' });
    }
    
    // Don't allow approving if timetable is not in pending_approval status
    if (timetable.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Only timetables in pending_approval status can be approved' });
    }
    
    // Update timetable status
    await timetable.update({
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });
    
    res.json({
      message: 'Timetable approved successfully',
      timetable
    });
  } catch (error) {
    console.error('Approve timetable error:', error);
    res.status(500).json({ message: 'Server error while approving timetable' });
  }
});

// @route   POST /api/timetables/:id/publish
// @desc    Publish timetable
// @access  Private (Admin/HOD)
router.post('/:id/publish', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is HOD, only allow publishing timetables for their department
    if (req.user.role === 'hod' && timetable.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only publish timetables for your department' });
    }
    
    // Don't allow publishing if timetable is not approved
    if (timetable.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved timetables can be published' });
    }
    
    // Update timetable status
    await timetable.update({
      status: 'published',
      publishedAt: new Date()
    });
    
    res.json({
      message: 'Timetable published successfully',
      timetable
    });
  } catch (error) {
    console.error('Publish timetable error:', error);
    res.status(500).json({ message: 'Server error while publishing timetable' });
  }
});

// @route   POST /api/timetables/:id/entries
// @desc    Add timetable entry
// @access  Private (Admin/HOD)
router.post('/:id/entries', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is HOD, only allow adding entries to timetables for their department
    if (req.user.role === 'hod' && timetable.department !== req.user.department) {
      return res.status(403).json({
        message: 'Access denied. You can only add entries to timetables for your department'
      });
    }
    
    // Don't allow adding entries if timetable is published
    if (timetable.status === 'published') {
      return res.status(400).json({ message: 'Cannot add entries to published timetable' });
    }
    
    const {
      day,
      startTime,
      endTime,
      subjectId,
      facultyId,
      batchId,
      classroomId,
      type
    } = req.body;
    
    // Validate required fields
    if (!day || !startTime || !endTime || !subjectId || !facultyId || !batchId || !classroomId) {
      return res.status(400).json({
        message: 'Please provide day, startTime, endTime, subjectId, facultyId, batchId, and classroomId'
      });
    }
    
    // Check for conflicts
    const conflicts = await checkTimetableConflicts(
      timetable.id,
      day,
      startTime,
      endTime,
      facultyId,
      batchId,
      classroomId
    );
    
    if (conflicts.length > 0) {
      return res.status(400).json({
        message: 'Timetable entry conflicts with existing entries',
        conflicts
      });
    }
    
    // Create timetable entry
    const entry = await TimetableEntry.create({
      timetableId: timetable.id,
      day,
      startTime,
      endTime,
      subjectId,
      facultyId,
      batchId,
      classroomId,
      type: type || 'lecture'
    });
    
    res.status(201).json({
      message: 'Timetable entry added successfully',
      entry
    });
  } catch (error) {
    console.error('Add timetable entry error:', error);
    res.status(500).json({ message: 'Server error while adding timetable entry' });
  }
});

// @route   PUT /api/timetables/:id/entries/:entryId
// @desc    Update timetable entry
// @access  Private (Admin/HOD)
router.put('/:id/entries/:entryId', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is HOD, only allow updating entries in timetables for their department
    if (req.user.role === 'hod' && timetable.department !== req.user.department) {
      return res.status(403).json({
        message: 'Access denied. You can only update entries in timetables for your department'
      });
    }
    
    // Don't allow updating entries if timetable is published
    if (timetable.status === 'published') {
      return res.status(400).json({ message: 'Cannot update entries in published timetable' });
    }
    
    const entry = await TimetableEntry.findOne({
      where: {
        id: req.params.entryId,
        timetableId: timetable.id
      }
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Timetable entry not found' });
    }
    
    const {
      day,
      startTime,
      endTime,
      subjectId,
      facultyId,
      batchId,
      classroomId,
      type
    } = req.body;
    
    // Check for conflicts if time, faculty, batch, or classroom is being changed
    if (day || startTime || endTime || facultyId || batchId || classroomId) {
      const conflicts = await checkTimetableConflicts(
        timetable.id,
        day || entry.day,
        startTime || entry.startTime,
        endTime || entry.endTime,
        facultyId || entry.facultyId,
        batchId || entry.batchId,
        classroomId || entry.classroomId,
        entry.id
      );
      
      if (conflicts.length > 0) {
        return res.status(400).json({
          message: 'Timetable entry conflicts with existing entries',
          conflicts
        });
      }
    }
    
    // Update timetable entry
    await entry.update({
      day: day || entry.day,
      startTime: startTime || entry.startTime,
      endTime: endTime || entry.endTime,
      subjectId: subjectId || entry.subjectId,
      facultyId: facultyId || entry.facultyId,
      batchId: batchId || entry.batchId,
      classroomId: classroomId || entry.classroomId,
      type: type || entry.type
    });
    
    res.json({
      message: 'Timetable entry updated successfully',
      entry
    });
  } catch (error) {
    console.error('Update timetable entry error:', error);
    res.status(500).json({ message: 'Server error while updating timetable entry' });
  }
});

// @route   DELETE /api/timetables/:id/entries/:entryId
// @desc    Delete timetable entry
// @access  Private (Admin/HOD)
router.delete('/:id/entries/:entryId', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // If user is HOD, only allow deleting entries from timetables for their department
    if (req.user.role === 'hod' && timetable.department !== req.user.department) {
      return res.status(403).json({
        message: 'Access denied. You can only delete entries from timetables for your department'
      });
    }
    
    // Don't allow deleting entries if timetable is published
    if (timetable.status === 'published') {
      return res.status(400).json({ message: 'Cannot delete entries from published timetable' });
    }
    
    const entry = await TimetableEntry.findOne({
      where: {
        id: req.params.entryId,
        timetableId: timetable.id
      }
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Timetable entry not found' });
    }
    
    // Delete timetable entry
    await entry.destroy();
    
    res.json({ message: 'Timetable entry deleted successfully' });
  } catch (error) {
    console.error('Delete timetable entry error:', error);
    res.status(500).json({ message: 'Server error while deleting timetable entry' });
  }
});

// Helper function to check for timetable conflicts
async function checkTimetableConflicts(timetableId, day, startTime, endTime, facultyId, batchId, classroomId, excludeEntryId = null) {
  const whereClause = {
    timetableId,
    day,
    [Op.or]: [
      {
        // New entry starts during an existing entry
        startTime: {
          [Op.lt]: endTime,
          [Op.gte]: startTime
        }
      },
      {
        // New entry ends during an existing entry
        endTime: {
          [Op.lte]: endTime,
          [Op.gt]: startTime
        }
      },
      {
        // New entry completely contains an existing entry
        startTime: {
          [Op.gte]: startTime
        },
        endTime: {
          [Op.lte]: endTime
        }
      },
      {
        // New entry is completely contained by an existing entry
        startTime: {
          [Op.lte]: startTime
        },
        endTime: {
          [Op.gte]: endTime
        }
      }
    ],
    [Op.or]: [
      { facultyId },
      { batchId },
      { classroomId }
    ]
  };
  
  // Exclude the entry being updated
  if (excludeEntryId) {
    whereClause.id = {
      [Op.ne]: excludeEntryId
    };
  }
  
  const conflicts = await TimetableEntry.findAll({
    where: whereClause,
    include: [
      { model: Subject },
      { 
        model: Faculty,
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }]
      },
      { model: Batch },
      { model: Classroom }
    ]
  });
  
  return conflicts;
}

// Helper function to generate timetable entries
function generateTimetableEntries(timetable, batches, subjects, faculty, classrooms, facultySubjects) {
  // This is a simplified version of the timetable generation algorithm
  // In a real implementation, this would be a more complex optimization algorithm
  
  const entries = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    { start: '09:00:00', end: '10:00:00' },
    { start: '10:00:00', end: '11:00:00' },
    { start: '11:00:00', end: '12:00:00' },
    { start: '12:00:00', end: '13:00:00' },
    { start: '14:00:00', end: '15:00:00' },
    { start: '15:00:00', end: '16:00:00' },
    { start: '16:00:00', end: '17:00:00' }
  ];
  
  // Create a map of faculty preferences for subjects
  const facultyPreferences = {};
  facultySubjects.forEach(fs => {
    if (!facultyPreferences[fs.subjectId]) {
      facultyPreferences[fs.subjectId] = [];
    }
    facultyPreferences[fs.subjectId].push({
      facultyId: fs.facultyId,
      preference: fs.preference
    });
  });
  
  // Sort faculty preferences by preference value (higher is better)
  Object.keys(facultyPreferences).forEach(subjectId => {
    facultyPreferences[subjectId].sort((a, b) => b.preference - a.preference);
  });
  
  // Track assignments to avoid conflicts
  const assignedSlots = {
    faculty: {},   // facultyId -> day -> timeSlot -> true
    batch: {},     // batchId -> day -> timeSlot -> true
    classroom: {}  // classroomId -> day -> timeSlot -> true
  };
  
  // Initialize assignment tracking
  faculty.forEach(f => {
    assignedSlots.faculty[f.id] = {};
    days.forEach(day => {
      assignedSlots.faculty[f.id][day] = {};
    });
  });
  
  batches.forEach(b => {
    assignedSlots.batch[b.id] = {};
    days.forEach(day => {
      assignedSlots.batch[b.id][day] = {};
    });
  });
  
  classrooms.forEach(c => {
    assignedSlots.classroom[c.id] = {};
    days.forEach(day => {
      assignedSlots.classroom[c.id][day] = {};
    });
  });
  
  // Assign subjects to batches
  batches.forEach(batch => {
    subjects.forEach(subject => {
      // Determine how many sessions per week for this subject
      const lectureSessionsPerWeek = subject.lectureHoursPerWeek;
      const tutorialSessionsPerWeek = subject.tutorialHoursPerWeek;
      const practicalSessionsPerWeek = subject.practicalHoursPerWeek;
      
      // Assign lecture sessions
      assignSessions('lecture', lectureSessionsPerWeek, subject, batch, false);
      
      // Assign tutorial sessions
      assignSessions('tutorial', tutorialSessionsPerWeek, subject, batch, false);
      
      // Assign practical sessions
      assignSessions('practical', practicalSessionsPerWeek, subject, batch, true);
    });
  });
  
  function assignSessions(type, sessionsPerWeek, subject, batch, requiresLab) {
    let assignedSessions = 0;
    
    while (assignedSessions < sessionsPerWeek) {
      // Try to find an available slot
      let assigned = false;
      
      for (const day of days) {
        if (assigned) break;
        
        for (const timeSlot of timeSlots) {
          if (assigned) break;
          
          // Get preferred faculty for this subject
          const preferredFaculty = facultyPreferences[subject.id] || [];
          
          // Try to assign to preferred faculty first
          for (const fp of preferredFaculty) {
            const facultyId = fp.facultyId;
            
            // Check if faculty is available in this slot
            if (isSlotAssigned(assignedSlots.faculty[facultyId], day, timeSlot)) {
              continue;
            }
            
            // Check if batch is available in this slot
            if (isSlotAssigned(assignedSlots.batch[batch.id], day, timeSlot)) {
              continue;
            }
            
            // Find an available classroom
            let assignedClassroom = null;
            
            for (const classroom of classrooms) {
              // For practical sessions, require a lab
              if (type === 'practical' && !classroom.isLab) {
                continue;
              }
              
              // For non-practical sessions, prefer regular classrooms
              if (type !== 'practical' && classroom.isLab) {
                continue;
              }
              
              // Check if classroom is available in this slot
              if (isSlotAssigned(assignedSlots.classroom[classroom.id], day, timeSlot)) {
                continue;
              }
              
              // Check if classroom capacity is sufficient
              if (classroom.capacity < batch.strength) {
                continue;
              }
              
              assignedClassroom = classroom;
              break;
            }
            
            if (!assignedClassroom) {
              continue;
            }
            
            // Create timetable entry
            entries.push({
              timetableId: timetable.id,
              day,
              startTime: timeSlot.start,
              endTime: timeSlot.end,
              subjectId: subject.id,
              facultyId,
              batchId: batch.id,
              classroomId: assignedClassroom.id,
              type
            });
            
            // Mark slot as assigned
            markSlotAsAssigned(assignedSlots.faculty[facultyId], day, timeSlot);
            markSlotAsAssigned(assignedSlots.batch[batch.id], day, timeSlot);
            markSlotAsAssigned(assignedSlots.classroom[assignedClassroom.id], day, timeSlot);
            
            assigned = true;
            assignedSessions++;
            break;
          }
        }
      }
      
      // If we couldn't assign a session, break to avoid infinite loop
      if (!assigned) {
        break;
      }
    }
  }
  
  function isSlotAssigned(dayMap, day, timeSlot) {
    return dayMap[day] && dayMap[day][`${timeSlot.start}-${timeSlot.end}`];
  }
  
  function markSlotAsAssigned(dayMap, day, timeSlot) {
    if (!dayMap[day]) {
      dayMap[day] = {};
    }
    dayMap[day][`${timeSlot.start}-${timeSlot.end}`] = true;
  }
  
  return entries;
}

module.exports = router;