const express = require('express');
const router = express.Router();
const { Classroom } = require('../models');
const { authenticate, isAdminOrHOD } = require('../middleware/auth');

// @route   GET /api/classrooms
// @desc    Get all classrooms
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const classrooms = await Classroom.findAll({
      order: [['building', 'ASC'], ['floor', 'ASC'], ['name', 'ASC']]
    });
    res.json(classrooms);
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ message: 'Server error while fetching classrooms' });
  }
});

// @route   GET /api/classrooms/:id
// @desc    Get classroom by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }
    
    res.json(classroom);
  } catch (error) {
    console.error('Get classroom error:', error);
    res.status(500).json({ message: 'Server error while fetching classroom' });
  }
});

// @route   POST /api/classrooms
// @desc    Create a new classroom
// @access  Private (Admin/HOD)
router.post('/', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const { name, building, floor, capacity, hasProjector, hasAC, isLab, labType } = req.body;
    
    // Validate required fields
    if (!name || !building || floor === undefined || !capacity) {
      return res.status(400).json({ message: 'Please provide name, building, floor, and capacity' });
    }
    
    // Check if classroom with same name already exists
    const existingClassroom = await Classroom.findOne({ where: { name } });
    if (existingClassroom) {
      return res.status(400).json({ message: 'Classroom with this name already exists' });
    }
    
    // Create classroom
    const classroom = await Classroom.create({
      name,
      building,
      floor,
      capacity,
      hasProjector: hasProjector || false,
      hasAC: hasAC || false,
      isLab: isLab || false,
      labType: isLab ? labType : null
    });
    
    res.status(201).json({
      message: 'Classroom created successfully',
      classroom
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ message: 'Server error while creating classroom' });
  }
});

// @route   PUT /api/classrooms/:id
// @desc    Update classroom
// @access  Private (Admin/HOD)
router.put('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }
    
    const { name, building, floor, capacity, hasProjector, hasAC, isLab, labType, isActive } = req.body;
    
    // If name is being changed, check if it already exists
    if (name && name !== classroom.name) {
      const existingClassroom = await Classroom.findOne({ where: { name } });
      if (existingClassroom) {
        return res.status(400).json({ message: 'Classroom with this name already exists' });
      }
    }
    
    // Update classroom
    await classroom.update({
      name: name || classroom.name,
      building: building || classroom.building,
      floor: floor !== undefined ? floor : classroom.floor,
      capacity: capacity || classroom.capacity,
      hasProjector: hasProjector !== undefined ? hasProjector : classroom.hasProjector,
      hasAC: hasAC !== undefined ? hasAC : classroom.hasAC,
      isLab: isLab !== undefined ? isLab : classroom.isLab,
      labType: isLab ? (labType || classroom.labType) : null,
      isActive: isActive !== undefined ? isActive : classroom.isActive
    });
    
    res.json({
      message: 'Classroom updated successfully',
      classroom
    });
  } catch (error) {
    console.error('Update classroom error:', error);
    res.status(500).json({ message: 'Server error while updating classroom' });
  }
});

// @route   DELETE /api/classrooms/:id
// @desc    Delete classroom
// @access  Private (Admin only)
router.delete('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }
    
    // Instead of hard delete, set isActive to false
    await classroom.update({ isActive: false });
    
    res.json({ message: 'Classroom deactivated successfully' });
  } catch (error) {
    console.error('Delete classroom error:', error);
    res.status(500).json({ message: 'Server error while deactivating classroom' });
  }
});

module.exports = router;