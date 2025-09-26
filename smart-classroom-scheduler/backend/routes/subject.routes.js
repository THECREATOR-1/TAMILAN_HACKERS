const express = require('express');
const router = express.Router();
const { Subject, FacultySubject, Faculty, User } = require('../models');
const { authenticate, isAdminOrHOD, isSameDepartment } = require('../middleware/auth');

// @route   GET /api/subjects
// @desc    Get all subjects
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
    // Filter by isElective if provided
    if (req.query.isElective !== undefined) {
      query.isElective = req.query.isElective === 'true';
    }
    
    // If user is not admin, only show subjects from their department
    if (req.user.role !== 'admin') {
      query.department = req.user.department;
    }
    
    const subjects = await Subject.findAll({
      where: query,
      order: [['department', 'ASC'], ['semester', 'ASC'], ['name', 'ASC']]
    });
    
    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Server error while fetching subjects' });
  }
});

// @route   GET /api/subjects/:id
// @desc    Get subject by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id, {
      include: [{
        model: Faculty,
        through: { attributes: ['preference'] },
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }]
      }]
    });
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // If user is not admin and subject is not from their department
    if (req.user.role !== 'admin' && subject.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view subjects from your department' });
    }
    
    res.json(subject);
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ message: 'Server error while fetching subject' });
  }
});

// @route   POST /api/subjects
// @desc    Create a new subject
// @access  Private (Admin/HOD)
router.post('/', authenticate, isAdminOrHOD, isSameDepartment, async (req, res) => {
  try {
    const {
      code,
      name,
      department,
      semester,
      credits,
      lectureHoursPerWeek,
      tutorialHoursPerWeek,
      practicalHoursPerWeek,
      isElective,
      requiresLab
    } = req.body;
    
    // Validate required fields
    if (!code || !name || !department || !semester || !credits || !lectureHoursPerWeek) {
      return res.status(400).json({
        message: 'Please provide code, name, department, semester, credits, and lectureHoursPerWeek'
      });
    }
    
    // Check if subject with same code already exists
    const existingSubject = await Subject.findOne({ where: { code } });
    if (existingSubject) {
      return res.status(400).json({ message: 'Subject with this code already exists' });
    }
    
    // Create subject
    const subject = await Subject.create({
      code,
      name,
      department,
      semester,
      credits,
      lectureHoursPerWeek,
      tutorialHoursPerWeek: tutorialHoursPerWeek || 0,
      practicalHoursPerWeek: practicalHoursPerWeek || 0,
      isElective: isElective || false,
      requiresLab: requiresLab || false
    });
    
    res.status(201).json({
      message: 'Subject created successfully',
      subject
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ message: 'Server error while creating subject' });
  }
});

// @route   PUT /api/subjects/:id
// @desc    Update subject
// @access  Private (Admin/HOD)
router.put('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // If user is HOD, only allow updating subjects from their department
    if (req.user.role === 'hod' && subject.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only update subjects from your department' });
    }
    
    const {
      code,
      name,
      department,
      semester,
      credits,
      lectureHoursPerWeek,
      tutorialHoursPerWeek,
      practicalHoursPerWeek,
      isElective,
      requiresLab,
      isActive
    } = req.body;
    
    // If code is being changed, check if it already exists
    if (code && code !== subject.code) {
      const existingSubject = await Subject.findOne({ where: { code } });
      if (existingSubject) {
        return res.status(400).json({ message: 'Subject with this code already exists' });
      }
    }
    
    // Update subject
    await subject.update({
      code: code || subject.code,
      name: name || subject.name,
      department: department || subject.department,
      semester: semester !== undefined ? semester : subject.semester,
      credits: credits !== undefined ? credits : subject.credits,
      lectureHoursPerWeek: lectureHoursPerWeek !== undefined ? lectureHoursPerWeek : subject.lectureHoursPerWeek,
      tutorialHoursPerWeek: tutorialHoursPerWeek !== undefined ? tutorialHoursPerWeek : subject.tutorialHoursPerWeek,
      practicalHoursPerWeek: practicalHoursPerWeek !== undefined ? practicalHoursPerWeek : subject.practicalHoursPerWeek,
      isElective: isElective !== undefined ? isElective : subject.isElective,
      requiresLab: requiresLab !== undefined ? requiresLab : subject.requiresLab,
      isActive: isActive !== undefined ? isActive : subject.isActive
    });
    
    res.json({
      message: 'Subject updated successfully',
      subject
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ message: 'Server error while updating subject' });
  }
});

// @route   DELETE /api/subjects/:id
// @desc    Delete subject
// @access  Private (Admin/HOD)
router.delete('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // If user is HOD, only allow deleting subjects from their department
    if (req.user.role === 'hod' && subject.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only delete subjects from your department' });
    }
    
    // Instead of hard delete, set isActive to false
    await subject.update({ isActive: false });
    
    res.json({ message: 'Subject deactivated successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ message: 'Server error while deactivating subject' });
  }
});

// @route   POST /api/subjects/:id/assign-faculty
// @desc    Assign faculty to subject
// @access  Private (Admin/HOD)
router.post('/:id/assign-faculty', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // If user is HOD, only allow assigning faculty to subjects from their department
    if (req.user.role === 'hod' && subject.department !== req.user.department) {
      return res.status(403).json({
        message: 'Access denied. You can only assign faculty to subjects from your department'
      });
    }
    
    const { facultyId, preference } = req.body;
    
    if (!facultyId) {
      return res.status(400).json({ message: 'Faculty ID is required' });
    }
    
    // Check if faculty exists
    const faculty = await Faculty.findByPk(facultyId, {
      include: [{ model: User }]
    });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // If user is HOD, only allow assigning faculty from their department
    if (req.user.role === 'hod' && faculty.User.department !== req.user.department) {
      return res.status(403).json({
        message: 'Access denied. You can only assign faculty from your department'
      });
    }
    
    // Check if assignment already exists
    const existingAssignment = await FacultySubject.findOne({
      where: {
        facultyId,
        subjectId: subject.id
      }
    });
    
    if (existingAssignment) {
      // Update preference if assignment exists
      await existingAssignment.update({
        preference: preference || 5,
        isActive: true
      });
      
      return res.json({
        message: 'Faculty assignment updated successfully',
        assignment: existingAssignment
      });
    }
    
    // Create new assignment
    const assignment = await FacultySubject.create({
      facultyId,
      subjectId: subject.id,
      preference: preference || 5
    });
    
    res.status(201).json({
      message: 'Faculty assigned to subject successfully',
      assignment
    });
  } catch (error) {
    console.error('Assign faculty error:', error);
    res.status(500).json({ message: 'Server error while assigning faculty to subject' });
  }
});

// @route   DELETE /api/subjects/:id/remove-faculty/:facultyId
// @desc    Remove faculty from subject
// @access  Private (Admin/HOD)
router.delete('/:id/remove-faculty/:facultyId', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // If user is HOD, only allow removing faculty from subjects in their department
    if (req.user.role === 'hod' && subject.department !== req.user.department) {
      return res.status(403).json({
        message: 'Access denied. You can only remove faculty from subjects in your department'
      });
    }
    
    const assignment = await FacultySubject.findOne({
      where: {
        facultyId: req.params.facultyId,
        subjectId: subject.id
      }
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'Faculty assignment not found' });
    }
    
    // Instead of hard delete, set isActive to false
    await assignment.update({ isActive: false });
    
    res.json({ message: 'Faculty removed from subject successfully' });
  } catch (error) {
    console.error('Remove faculty error:', error);
    res.status(500).json({ message: 'Server error while removing faculty from subject' });
  }
});

module.exports = router;