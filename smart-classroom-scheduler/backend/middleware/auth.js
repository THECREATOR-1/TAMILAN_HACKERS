const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware to authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'User account is inactive' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user has admin role
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin role required' });
  }
};

// Middleware to check if user has HOD role
const isHOD = (req, res, next) => {
  if (req.user && req.user.role === 'hod') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. HOD role required' });
  }
};

// Middleware to check if user has admin or HOD role
const isAdminOrHOD = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'hod')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin or HOD role required' });
  }
};

// Middleware to check if user belongs to the same department
const isSameDepartment = (req, res, next) => {
  const departmentParam = req.params.department || req.body.department;
  
  if (!departmentParam) {
    return res.status(400).json({ message: 'Department parameter is required' });
  }

  if (req.user && (req.user.role === 'admin' || req.user.department === departmentParam)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. You can only access your department resources' });
  }
};

module.exports = {
  authenticate,
  isAdmin,
  isHOD,
  isAdminOrHOD,
  isSameDepartment
};