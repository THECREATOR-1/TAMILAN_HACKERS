const express = require('express');
const router = express.Router();
const { User, Faculty } = require('../models');
const { authenticate, isAdmin, isAdminOrHOD } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin/HOD)
router.get('/', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    let query = {};
    
    // If HOD, only show users from their department
    if (req.user.role === 'hod') {
      query.department = req.user.department;
    }
    
    const users = await User.findAll({
      where: query,
      attributes: { exclude: ['password'] },
      include: [{ model: Faculty, required: false }],
      order: [['name', 'ASC']]
    });
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin/HOD)
router.get('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Faculty, required: false }]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If HOD, only allow access to users from their department
    if (req.user.role === 'hod' && user.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view users from your department' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin/HOD)
router.put('/:id', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If HOD, only allow updating users from their department
    if (req.user.role === 'hod' && user.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only update users from your department' });
    }
    
    // If HOD, don't allow changing role to admin
    if (req.user.role === 'hod' && req.body.role === 'admin') {
      return res.status(403).json({ message: 'Access denied. You cannot promote users to admin role' });
    }
    
    const { name, email, role, department, isActive } = req.body;
    
    // Update user
    await user.update({
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
      department: department || user.department,
      isActive: isActive !== undefined ? isActive : user.isActive
    });
    
    // If faculty data is provided and user is faculty/hod
    if ((user.role === 'faculty' || user.role === 'hod') && req.body.faculty) {
      const { designation, specialization, maxHoursPerDay, maxHoursPerWeek } = req.body.faculty;
      
      let faculty = await Faculty.findOne({ where: { userId: user.id } });
      
      if (faculty) {
        await faculty.update({
          designation: designation || faculty.designation,
          specialization: specialization || faculty.specialization,
          maxHoursPerDay: maxHoursPerDay || faculty.maxHoursPerDay,
          maxHoursPerWeek: maxHoursPerWeek || faculty.maxHoursPerWeek
        });
      } else {
        await Faculty.create({
          userId: user.id,
          designation: designation || 'Assistant Professor',
          specialization: specialization || null,
          maxHoursPerDay: maxHoursPerDay || 6,
          maxHoursPerWeek: maxHoursPerWeek || 24
        });
      }
    }
    
    // Get updated user with faculty data
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Faculty, required: false }]
    });
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Instead of hard delete, set isActive to false
    await user.update({ isActive: false });
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deactivating user' });
  }
});

// @route   POST /api/users/:id/reset-password
// @desc    Reset user password (Admin/HOD only)
// @access  Private
router.post('/:id/reset-password', authenticate, isAdminOrHOD, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If HOD, only allow resetting passwords for users from their department
    if (req.user.role === 'hod' && user.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only reset passwords for users from your department' });
    }
    
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error while resetting password' });
  }
});

module.exports = router;