const express = require('express');
const router = express.Router();
const { Batch } = require('../models');
const { authenticate, isAdminOrHOD, isSameDepartment } = require('../middleware/auth');

// @route   GET /api/batches
// @desc    Get all batches
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};
    
    // Filter by department if provided
    if (req.query.department) {
      query.department = req.query.department;
    }
    // Filter by year if provided
    if (req.query.year) {
      query.year = req.query.year;
    }
    // Filter by semester if provided
    if (req.query.semester) {
      query.semester = req.query.semester;
    }
    // Filter by shift if provided
    if (req.query.shift) {
      query.shift = req.query.shift;
    }
    
    // If user is not admin, only show batches from their department
    if (req.user.role !== 'admin') {
      query.department = req.user.department;
    }
    
    const batches = await Batch.findAll({
      where: query,
      order: [['department', 'ASC'], ['year', 'ASC'], ['semester', 'ASC'], ['name', 'ASC']]
    });
    
    res.json(batches);
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ message: 'Server error while fetching batches' });
  }
});

// @route   GET /api/batches/:id
// @desc    Get batch by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // If user is not admin and batch is not from their department
    if (req.user.role !== 'admin' && batch.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view batches from your department' });
    }
    
    res.json(batch);
  } catch (error) {
    console.error('Get batch error:', error);
    res.status(500).json({ message: 'Server error while fetching batch' });
  }
});

// @route   POST /api/batches
// @desc    Create a new batch
// @access  Private (Admin/HOD)
router.post('/', authenticate, isAdminOrHOD, isSameDepartment, async (req, res) => {
  try {
    const { name, department, year, semester, strength, shift } = req.body;
    
    // Validate required fields
    if (!name || !department || !year || !semester || !strength) {
      return res.status(400).json({
        message: 'Please provide name, department, year, semester, and strength'
      });
    }
    
    // Check if batch with same name already exists
    const existingBatch = await Batch.findOne({ where: { name } });
    if (existingBatch) {
      return res.status(400).json({ message: 'Batch with this name already exists' });
    }
    
    // Create batch
    const batch = await Batch.create({
      name,
      department,
      year,
      semester,
      strength,
      shift: shift || 'morning'
    });
    
    res.status(201).json({
      message: 'Batch created successfully',
      batch
    });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ message: 'Server error while creating batch' });
  }
});

// @route   PUT /api/batches/:id
// @desc    Update batch
// @access  Private (Admin/HOD)
router.put('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // If user is HOD, only allow updating batches from their department
    if (req.user.role === 'hod' && batch.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only update batches from your department' });
    }
    
    const { name, department, year, semester, strength, shift, isActive } = req.body;
    
    // If name is being changed, check if it already exists
    if (name && name !== batch.name) {
      const existingBatch = await Batch.findOne({ where: { name } });
      if (existingBatch) {
        return res.status(400).json({ message: 'Batch with this name already exists' });
      }
    }
    
    // Update batch
    await batch.update({
      name: name || batch.name,
      department: department || batch.department,
      year: year !== undefined ? year : batch.year,
      semester: semester !== undefined ? semester : batch.semester,
      strength: strength !== undefined ? strength : batch.strength,
      shift: shift || batch.shift,
      isActive: isActive !== undefined ? isActive : batch.isActive
    });
    
    res.json({
      message: 'Batch updated successfully',
      batch
    });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({ message: 'Server error while updating batch' });
  }
});

// @route   DELETE /api/batches/:id
// @desc    Delete batch
// @access  Private (Admin/HOD)
router.delete('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // If user is HOD, only allow deleting batches from their department
    if (req.user.role === 'hod' && batch.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only delete batches from your department' });
    }
    
    // Instead of hard delete, set isActive to false
    await batch.update({ isActive: false });
    
    res.json({ message: 'Batch deactivated successfully' });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ message: 'Server error while deactivating batch' });
  }
});

module.exports = router;