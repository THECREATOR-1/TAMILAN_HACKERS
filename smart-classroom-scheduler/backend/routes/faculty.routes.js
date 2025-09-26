const express = require('express');
const router = express.Router();
const { Faculty, User, FacultyAvailability, FacultySubject, Subject } = require('../models');
const { authenticate, isAdminOrHOD, isSameDepartment } = require('../middleware/auth');

// @route   GET /api/faculty
// @desc    Get all faculty
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    let departmentFilter = {};
    
    // If user is not admin, only show faculty from their department
    if (req.user.role !== 'admin') {
      departmentFilter = { department: req.user.department };
    } else if (req.query.department) {
      departmentFilter = { department: req.query.department };
    }
    
    const faculty = await Faculty.findAll({
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'department', 'role', 'isActive'],
        where: departmentFilter
      }],
      order: [[User, 'name', 'ASC']]
    });
    
    res.json(faculty);
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({ message: 'Server error while fetching faculty' });
  }
});

// @route   GET /api/faculty/:id
// @desc    Get faculty by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'department', 'role', 'isActive']
        },
        {
          model: Subject,
          through: { attributes: ['preference'] }
        },
        {
          model: FacultyAvailability
        }
      ]
    });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // If user is not admin and faculty is not from their department
    if (req.user.role !== 'admin' && faculty.User.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view faculty from your department' });
    }
    
    res.json(faculty);
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({ message: 'Server error while fetching faculty' });
  }
});

// @route   PUT /api/faculty/:id
// @desc    Update faculty
// @access  Private (Admin/HOD)
router.put('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id, {
      include: [{ model: User }]
    });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // If user is HOD, only allow updating faculty from their department
    if (req.user.role === 'hod' && faculty.User.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only update faculty from your department' });
    }
    
    const { designation, specialization, maxHoursPerDay, maxHoursPerWeek, preferredStartTime, preferredEndTime } = req.body;
    
    // Update faculty
    await faculty.update({
      designation: designation || faculty.designation,
      specialization: specialization !== undefined ? specialization : faculty.specialization,
      maxHoursPerDay: maxHoursPerDay !== undefined ? maxHoursPerDay : faculty.maxHoursPerDay,
      maxHoursPerWeek: maxHoursPerWeek !== undefined ? maxHoursPerWeek : faculty.maxHoursPerWeek,
      preferredStartTime: preferredStartTime !== undefined ? preferredStartTime : faculty.preferredStartTime,
      preferredEndTime: preferredEndTime !== undefined ? preferredEndTime : faculty.preferredEndTime
    });
    
    res.json({
      message: 'Faculty updated successfully',
      faculty
    });
  } catch (error) {
    console.error('Update faculty error:', error);
    res.status(500).json({ message: 'Server error while updating faculty' });
  }
});

// @route   POST /api/faculty/:id/availability
// @desc    Set faculty availability
// @access  Private (Admin/HOD/Faculty)
router.post('/:id/availability', authenticate, async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id, {
      include: [{ model: User }]
    });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // Check if user has permission to update this faculty's availability
    if (req.user.role !== 'admin' && 
        req.user.role !== 'hod' && 
        req.user.id !== faculty.User.id) {
      return res.status(403).json({ message: 'Access denied. You can only update your own availability' });
    }
    
    // If user is HOD, only allow updating faculty from their department
    if (req.user.role === 'hod' && faculty.User.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only update faculty from your department' });
    }
    
    const { day, startTime, endTime, isAvailable, reason } = req.body;
    
    // Validate required fields
    if (!day || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide day, startTime, and endTime' });
    }
    
    // Check if availability already exists for this day
    let availability = await FacultyAvailability.findOne({
      where: {
        facultyId: faculty.id,
        day
      }
    });
    
    if (availability) {
      // Update existing availability
      await availability.update({
        startTime,
        endTime,
        isAvailable: isAvailable !== undefined ? isAvailable : availability.isAvailable,
        reason: reason !== undefined ? reason : availability.reason
      });
    } else {
      // Create new availability
      availability = await FacultyAvailability.create({
        facultyId: faculty.id,
        day,
        startTime,
        endTime,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        reason
      });
    }
    
    res.json({
      message: 'Faculty availability updated successfully',
      availability
    });
  } catch (error) {
    console.error('Update faculty availability error:', error);
    res.status(500).json({ message: 'Server error while updating faculty availability' });
  }
});

// @route   GET /api/faculty/:id/subjects
// @desc    Get subjects taught by faculty
// @access  Private
router.get('/:id/subjects', authenticate, async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id, {
      include: [{ model: User }]
    });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // If user is not admin and faculty is not from their department
    if (req.user.role !== 'admin' && faculty.User.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view faculty from your department' });
    }
    
    const facultySubjects = await FacultySubject.findAll({
      where: {
        facultyId: faculty.id,
        isActive: true
      },
      include: [{ model: Subject }],
      order: [[Subject, 'name', 'ASC']]
    });
    
    res.json(facultySubjects);
  } catch (error) {
    console.error('Get faculty subjects error:', error);
    res.status(500).json({ message: 'Server error while fetching faculty subjects' });
  }
});

// @route   GET /api/faculty/:id/availability
// @desc    Get faculty availability
// @access  Private
router.get('/:id/availability', authenticate, async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id, {
      include: [{ model: User }]
    });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // If user is not admin and faculty is not from their department
    if (req.user.role !== 'admin' && faculty.User.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view faculty from your department' });
    }
    
    const availability = await FacultyAvailability.findAll({
      where: { facultyId: faculty.id },
      order: [['day', 'ASC'], ['startTime', 'ASC']]
    });
    
    res.json(availability);
  } catch (error) {
    console.error('Get faculty availability error:', error);
    res.status(500).json({ message: 'Server error while fetching faculty availability' });
  }
});

module.exports = router;