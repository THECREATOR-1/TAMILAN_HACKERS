const express = require('express');
const router = express.Router();
const { Substitution, Faculty, User, TimetableEntry, LeaveRequest, Timetable, Subject, Batch, Classroom } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const nodemailer = require('nodemailer');

// Configure nodemailer
let transporter;
if (process.env.NODE_ENV === 'production') {
  // Production email configuration
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
} else {
  // Development email configuration using ethereal.email
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_EMAIL || 'ethereal.user@ethereal.email',
      pass: process.env.ETHEREAL_PASSWORD || 'ethereal_password'
    }
  });
}

// @route   GET /api/substitutions
// @desc    Get all substitution requests
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by date if provided
    if (req.query.date) {
      const date = new Date(req.query.date);
      if (!isNaN(date.getTime())) {
        query.date = {
          [Op.gte]: new Date(date.setHours(0, 0, 0, 0)),
          [Op.lte]: new Date(date.setHours(23, 59, 59, 999))
        };
      }
    }
    
    // If user is faculty, only show substitutions where they are involved
    if (req.user.role === 'faculty') {
      const faculty = await Faculty.findOne({ where: { userId: req.user.id } });
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty record not found' });
      }
      
      query[Op.or] = [
        { originalFacultyId: faculty.id },
        { substituteFacultyId: faculty.id }
      ];
    }
    // If user is HOD, only show substitutions from their department
    else if (req.user.role === 'hod') {
      const facultyIds = await Faculty.findAll({
        include: [{
          model: User,
          where: { department: req.user.department }
        }],
        attributes: ['id']
      }).then(faculty => faculty.map(f => f.id));
      
      query[Op.or] = [
        { originalFacultyId: { [Op.in]: facultyIds } },
        { substituteFacultyId: { [Op.in]: facultyIds } }
      ];
    }
    
    const substitutions = await Substitution.findAll({
      where: query,
      include: [
        {
          model: Faculty,
          as: 'OriginalFaculty',
          include: [{
            model: User,
            attributes: ['id', 'name', 'email', 'department']
          }]
        },
        {
          model: Faculty,
          as: 'SubstituteFaculty',
          include: [{
            model: User,
            attributes: ['id', 'name', 'email', 'department']
          }],
          required: false
        },
        {
          model: TimetableEntry,
          include: [
            { model: Subject },
            { model: Batch },
            { model: Classroom },
            { model: Timetable }
          ]
        },
        { model: LeaveRequest }
      ],
      order: [['date', 'ASC'], ['createdAt', 'DESC']]
    });
    
    res.json(substitutions);
  } catch (error) {
    console.error('Get substitutions error:', error);
    res.status(500).json({ message: 'Server error while fetching substitutions' });
  }
});

// @route   GET /api/substitutions/:id
// @desc    Get substitution by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const substitution = await Substitution.findByPk(req.params.id, {
      include: [
        {
          model: Faculty,
          as: 'OriginalFaculty',
          include: [{
            model: User,
            attributes: ['id', 'name', 'email', 'department']
          }]
        },
        {
          model: Faculty,
          as: 'SubstituteFaculty',
          include: [{
            model: User,
            attributes: ['id', 'name', 'email', 'department']
          }],
          required: false
        },
        {
          model: TimetableEntry,
          include: [
            { model: Subject },
            { model: Batch },
            { model: Classroom },
            { model: Timetable }
          ]
        },
        { model: LeaveRequest }
      ]
    });
    
    if (!substitution) {
      return res.status(404).json({ message: 'Substitution not found' });
    }
    
    // If user is faculty, only allow viewing substitutions where they are involved
    if (req.user.role === 'faculty') {
      const faculty = await Faculty.findOne({ where: { userId: req.user.id } });
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty record not found' });
      }
      
      if (substitution.originalFacultyId !== faculty.id && substitution.substituteFacultyId !== faculty.id) {
        return res.status(403).json({
          message: 'Access denied. You can only view substitutions where you are involved'
        });
      }
    }
    // If user is HOD, only allow viewing substitutions from their department
    else if (req.user.role === 'hod') {
      const originalFacultyDept = substitution.OriginalFaculty.User.department;
      const substituteFacultyDept = substitution.SubstituteFaculty ? substitution.SubstituteFaculty.User.department : null;
      
      if (originalFacultyDept !== req.user.department && substituteFacultyDept !== req.user.department) {
        return res.status(403).json({
          message: 'Access denied. You can only view substitutions from your department'
        });
      }
    }
    
    res.json(substitution);
  } catch (error) {
    console.error('Get substitution error:', error);
    res.status(500).json({ message: 'Server error while fetching substitution' });
  }
});

// @route   PUT /api/substitutions/:id/accept
// @desc    Accept substitution request
// @access  Private (Faculty)
router.put('/:id/accept', authenticate, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'faculty') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only faculty can accept substitution requests' });
    }
    
    const faculty = await Faculty.findOne({
      where: { userId: req.user.id },
      transaction
    });
    
    if (!faculty) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Faculty record not found' });
    }
    
    const substitution = await Substitution.findByPk(req.params.id, {
      include: [
        {
          model: Faculty,
          as: 'OriginalFaculty',
          include: [{
            model: User,
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: TimetableEntry,
          include: [
            { model: Subject },
            { model: Batch },
            { model: Classroom }
          ]
        }
      ],
      transaction
    });
    
    if (!substitution) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Substitution not found' });
    }
    
    // Check if this faculty is the requested substitute or if no substitute is assigned yet
    if (substitution.substituteFacultyId !== faculty.id && substitution.substituteFacultyId !== null) {
      await transaction.rollback();
      return res.status(403).json({
        message: 'Access denied. You are not the requested substitute for this class'
      });
    }
    
    // Don't allow accepting if substitution is not pending
    if (substitution.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Only pending substitution requests can be accepted' });
    }
    
    // Check for conflicts with faculty's existing schedule
    const conflicts = await TimetableEntry.findAll({
      where: {
        facultyId: faculty.id,
        day: sequelize.literal(`EXTRACT(DOW FROM TIMESTAMP '${substitution.date.toISOString()}')`),
        [Op.or]: [
          {
            // New entry starts during an existing entry
            startTime: {
              [Op.lt]: substitution.TimetableEntry.endTime,
              [Op.gte]: substitution.TimetableEntry.startTime
            }
          },
          {
            // New entry ends during an existing entry
            endTime: {
              [Op.lte]: substitution.TimetableEntry.endTime,
              [Op.gt]: substitution.TimetableEntry.startTime
            }
          },
          {
            // New entry completely contains an existing entry
            startTime: {
              [Op.gte]: substitution.TimetableEntry.startTime
            },
            endTime: {
              [Op.lte]: substitution.TimetableEntry.endTime
            }
          },
          {
            // New entry is completely contained by an existing entry
            startTime: {
              [Op.lte]: substitution.TimetableEntry.startTime
            },
            endTime: {
              [Op.gte]: substitution.TimetableEntry.endTime
            }
          }
        ]
      },
      include: [
        { model: Subject },
        { model: Batch },
        { model: Classroom }
      ],
      transaction
    });
    
    if (conflicts.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'You have a scheduling conflict with this substitution',
        conflicts
      });
    }
    
    // Update substitution status
    await substitution.update({
      substituteFacultyId: faculty.id,
      status: 'accepted',
      notificationSent: true
    }, { transaction });
    
    // Send email notification to original faculty
    await sendSubstitutionStatusEmail(
      substitution.OriginalFaculty.User.email,
      substitution.OriginalFaculty.User.name,
      req.user.name,
      substitution.date,
      substitution.TimetableEntry.startTime,
      substitution.TimetableEntry.endTime,
      'accepted'
    );
    
    await transaction.commit();
    
    res.json({
      message: 'Substitution request accepted successfully',
      substitution
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Accept substitution error:', error);
    res.status(500).json({ message: 'Server error while accepting substitution' });
  }
});

// @route   PUT /api/substitutions/:id/decline
// @desc    Decline substitution request
// @access  Private (Faculty)
router.put('/:id/decline', authenticate, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'faculty') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only faculty can decline substitution requests' });
    }
    
    const faculty = await Faculty.findOne({
      where: { userId: req.user.id },
      transaction
    });
    
    if (!faculty) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Faculty record not found' });
    }
    
    const substitution = await Substitution.findByPk(req.params.id, {
      include: [
        {
          model: Faculty,
          as: 'OriginalFaculty',
          include: [{
            model: User,
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: TimetableEntry,
          include: [
            { model: Subject },
            { model: Batch },
            { model: Classroom }
          ]
        }
      ],
      transaction
    });
    
    if (!substitution) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Substitution not found' });
    }
    
    // Check if this faculty is the requested substitute
    if (substitution.substituteFacultyId !== faculty.id) {
      await transaction.rollback();
      return res.status(403).json({
        message: 'Access denied. You are not the requested substitute for this class'
      });
    }
    
    // Don't allow declining if substitution is not pending
    if (substitution.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Only pending substitution requests can be declined' });
    }
    
    // Update substitution status
    await substitution.update({
      status: 'declined',
      notificationSent: true
    }, { transaction });
    
    // Send email notification to original faculty
    await sendSubstitutionStatusEmail(
      substitution.OriginalFaculty.User.email,
      substitution.OriginalFaculty.User.name,
      req.user.name,
      substitution.date,
      substitution.TimetableEntry.startTime,
      substitution.TimetableEntry.endTime,
      'declined'
    );
    
    // Find another potential substitute
    const subject = await Subject.findByPk(substitution.TimetableEntry.subjectId, { transaction });
    
    if (subject) {
      const originalFaculty = await Faculty.findByPk(substitution.originalFacultyId, {
        include: [{
          model: User,
          attributes: ['department']
        }],
        transaction
      });
      
      const department = originalFaculty.User.department;
      
      // Find potential substitutes
      const potentialSubstitutes = await sequelize.query(
        `SELECT "Faculty"."id" as "facultyId", "Users"."name", "Users"."email", "FacultySubjects"."preference"
         FROM "Faculty"
         JOIN "Users" ON "Faculty"."userId" = "Users"."id"
         JOIN "FacultySubjects" ON "Faculty"."id" = "FacultySubjects"."facultyId"
         WHERE "Users"."department" = :department
         AND "FacultySubjects"."subjectId" = :subjectId
         AND "FacultySubjects"."isActive" = true
         AND "Faculty"."id" != :originalFacultyId
         AND "Faculty"."id" != :currentFacultyId
         ORDER BY "FacultySubjects"."preference" DESC
         LIMIT 1`,
        {
          replacements: {
            department,
            subjectId: subject.id,
            originalFacultyId: substitution.originalFacultyId,
            currentFacultyId: faculty.id
          },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      
      if (potentialSubstitutes.length > 0) {
        const newSubstitute = potentialSubstitutes[0];
        
        // Update substitution with new substitute
        await substitution.update({
          substituteFacultyId: newSubstitute.facultyId,
          status: 'pending',
          notificationSent: false
        }, { transaction });
        
        // Send email notification to new substitute
        await sendSubstitutionRequestEmail(
          newSubstitute.email,
          newSubstitute.name,
          substitution.OriginalFaculty.User.name,
          substitution.date,
          substitution.TimetableEntry.startTime,
          substitution.TimetableEntry.endTime
        );
      }
    }
    
    await transaction.commit();
    
    res.json({
      message: 'Substitution request declined successfully',
      substitution
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Decline substitution error:', error);
    res.status(500).json({ message: 'Server error while declining substitution' });
  }
});

// @route   PUT /api/substitutions/:id/assign
// @desc    Assign faculty to substitution
// @access  Private (Admin/HOD)
router.put('/:id/assign', authenticate, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only admin or HOD can assign substitutions' });
    }
    
    const { facultyId } = req.body;
    
    if (!facultyId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Faculty ID is required' });
    }
    
    const substitution = await Substitution.findByPk(req.params.id, {
      include: [
        {
          model: Faculty,
          as: 'OriginalFaculty',
          include: [{
            model: User,
            attributes: ['id', 'name', 'email', 'department']
          }]
        },
        {
          model: TimetableEntry,
          include: [
            { model: Subject },
            { model: Batch },
            { model: Classroom }
          ]
        }
      ],
      transaction
    });
    
    if (!substitution) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Substitution not found' });
    }
    
    // If user is HOD, only allow assigning substitutions from their department
    if (req.user.role === 'hod' && substitution.OriginalFaculty.User.department !== req.user.department) {
      await transaction.rollback();
      return res.status(403).json({
        message: 'Access denied. You can only assign substitutions from your department'
      });
    }
    
    // Check if faculty exists
    const faculty = await Faculty.findByPk(facultyId, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'department']
      }],
      transaction
    });
    
    if (!faculty) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // If user is HOD, only allow assigning faculty from their department
    if (req.user.role === 'hod' && faculty.User.department !== req.user.department) {
      await transaction.rollback();
      return res.status(403).json({
        message: 'Access denied. You can only assign faculty from your department'
      });
    }
    
    // Check for conflicts with faculty's existing schedule
    const conflicts = await TimetableEntry.findAll({
      where: {
        facultyId,
        day: sequelize.literal(`EXTRACT(DOW FROM TIMESTAMP '${substitution.date.toISOString()}')`),
        [Op.or]: [
          {
            // New entry starts during an existing entry
            startTime: {
              [Op.lt]: substitution.TimetableEntry.endTime,
              [Op.gte]: substitution.TimetableEntry.startTime
            }
          },
          {
            // New entry ends during an existing entry
            endTime: {
              [Op.lte]: substitution.TimetableEntry.endTime,
              [Op.gt]: substitution.TimetableEntry.startTime
            }
          },
          {
            // New entry completely contains an existing entry
            startTime: {
              [Op.gte]: substitution.TimetableEntry.startTime
            },
            endTime: {
              [Op.lte]: substitution.TimetableEntry.endTime
            }
          },
          {
            // New entry is completely contained by an existing entry
            startTime: {
              [Op.lte]: substitution.TimetableEntry.startTime
            },
            endTime: {
              [Op.gte]: substitution.TimetableEntry.endTime
            }
          }
        ]
      },
      include: [
        { model: Subject },
        { model: Batch },
        { model: Classroom }
      ],
      transaction
    });
    
    if (conflicts.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Faculty has a scheduling conflict with this substitution',
        conflicts
      });
    }
    
    // Update substitution status
    await substitution.update({
      substituteFacultyId: facultyId,
      status: 'assigned',
      notificationSent: true
    }, { transaction });
    
    // Send email notification to assigned faculty
    await sendSubstitutionAssignmentEmail(
      faculty.User.email,
      faculty.User.name,
      substitution.OriginalFaculty.User.name,
      substitution.date,
      substitution.TimetableEntry.startTime,
      substitution.TimetableEntry.endTime
    );
    
    // Send email notification to original faculty
    await sendSubstitutionStatusEmail(
      substitution.OriginalFaculty.User.email,
      substitution.OriginalFaculty.User.name,
      faculty.User.name,
      substitution.date,
      substitution.TimetableEntry.startTime,
      substitution.TimetableEntry.endTime,
      'assigned'
    );
    
    await transaction.commit();
    
    res.json({
      message: 'Faculty assigned to substitution successfully',
      substitution
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Assign substitution error:', error);
    res.status(500).json({ message: 'Server error while assigning substitution' });
  }
});

// Helper function to send substitution request email
async function sendSubstitutionRequestEmail(email, name, originalFacultyName, date, startTime, endTime) {
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@smartscheduler.com',
      to: email,
      subject: 'Substitution Request',
      html: `
        <h2>Substitution Request</h2>
        <p>Dear ${name},</p>
        <p>You have been requested to substitute for ${originalFacultyName} on ${formattedDate} from ${startTime} to ${endTime}.</p>
        <p>Please log in to the Smart Classroom & Timetable Scheduler to accept or decline this request.</p>
        <p>Thank you for your cooperation.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Substitution request email sent:', info.messageId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Send substitution request email error:', error);
    return false;
  }
}

// Helper function to send substitution status email
async function sendSubstitutionStatusEmail(email, name, substituteName, date, startTime, endTime, status) {
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let subject, html;
    
    if (status === 'accepted') {
      subject = 'Substitution Request Accepted';
      html = `
        <h2>Substitution Request Accepted</h2>
        <p>Dear ${name},</p>
        <p>${substituteName} has accepted your substitution request for ${formattedDate} from ${startTime} to ${endTime}.</p>
        <p>Thank you for using the Smart Classroom & Timetable Scheduler.</p>
      `;
    } else if (status === 'declined') {
      subject = 'Substitution Request Declined';
      html = `
        <h2>Substitution Request Declined</h2>
        <p>Dear ${name},</p>
        <p>${substituteName} has declined your substitution request for ${formattedDate} from ${startTime} to ${endTime}.</p>
        <p>The system will attempt to find another substitute or you may contact your department head for assistance.</p>
        <p>Thank you for using the Smart Classroom & Timetable Scheduler.</p>
      `;
    } else if (status === 'assigned') {
      subject = 'Substitution Assigned';
      html = `
        <h2>Substitution Assigned</h2>
        <p>Dear ${name},</p>
        <p>${substituteName} has been assigned as your substitute for ${formattedDate} from ${startTime} to ${endTime}.</p>
        <p>Thank you for using the Smart Classroom & Timetable Scheduler.</p>
      `;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@smartscheduler.com',
      to: email,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Substitution status email sent:', info.messageId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Send substitution status email error:', error);
    return false;
  }
}

// Helper function to send substitution assignment email
async function sendSubstitutionAssignmentEmail(email, name, originalFacultyName, date, startTime, endTime) {
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@smartscheduler.com',
      to: email,
      subject: 'Substitution Assignment',
      html: `
        <h2>Substitution Assignment</h2>
        <p>Dear ${name},</p>
        <p>You have been assigned to substitute for ${originalFacultyName} on ${formattedDate} from ${startTime} to ${endTime}.</p>
        <p>Please log in to the Smart Classroom & Timetable Scheduler to view the details.</p>
        <p>Thank you for your cooperation.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Substitution assignment email sent:', info.messageId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Send substitution assignment email error:', error);
    return false;
  }
}

module.exports = router;