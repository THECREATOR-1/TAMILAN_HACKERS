const express = require('express');
const router = express.Router();
const { LeaveRequest, Faculty, User, TimetableEntry, Substitution, Timetable } = require('../models');
const { authenticate, isAdminOrHOD, isSameDepartment } = require('../middleware/auth');
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

// @route   GET /api/leaves
// @desc    Get all leave requests
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query[Op.or] = [
        {
          startDate: {
            [Op.between]: [req.query.startDate, req.query.endDate]
          }
        },
        {
          endDate: {
            [Op.between]: [req.query.startDate, req.query.endDate]
          }
        },
        {
          [Op.and]: [
            { startDate: { [Op.lte]: req.query.startDate } },
            { endDate: { [Op.gte]: req.query.endDate } }
          ]
        }
      ];
    }
    
    // If user is faculty, only show their leave requests
    if (req.user.role === 'faculty') {
      const faculty = await Faculty.findOne({ where: { userId: req.user.id } });
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty record not found' });
      }
      query.facultyId = faculty.id;
    }
    // If user is HOD, only show leave requests from their department
    else if (req.user.role === 'hod') {
      const facultyIds = await Faculty.findAll({
        include: [{
          model: User,
          where: { department: req.user.department }
        }],
        attributes: ['id']
      }).then(faculty => faculty.map(f => f.id));
      
      query.facultyId = { [Op.in]: facultyIds };
    }
    
    const leaveRequests = await LeaveRequest.findAll({
      where: query,
      include: [
        {
          model: Faculty,
          include: [{
            model: User,
            attributes: ['id', 'name', 'email', 'department']
          }]
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
    
    res.json(leaveRequests);
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ message: 'Server error while fetching leave requests' });
  }
});

// @route   GET /api/leaves/:id
// @desc    Get leave request by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [
        {
          model: Faculty,
          include: [{
            model: User,
            attributes: ['id', 'name', 'email', 'department']
          }]
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: Substitution,
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
              model: Faculty,
              as: 'SubstituteFaculty',
              include: [{
                model: User,
                attributes: ['id', 'name', 'email']
              }]
            },
            {
              model: TimetableEntry,
              include: [
                { model: Timetable },
                { model: Classroom },
                { model: Subject },
                { model: Batch }
              ]
            }
          ]
        }
      ]
    });
    
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    // Check if user has permission to view this leave request
    const faculty = await Faculty.findByPk(leaveRequest.facultyId, {
      include: [{
        model: User,
        attributes: ['id', 'department']
      }]
    });
    
    // If user is faculty, only allow viewing their own leave requests
    if (req.user.role === 'faculty') {
      const userFaculty = await Faculty.findOne({ where: { userId: req.user.id } });
      if (!userFaculty || userFaculty.id !== leaveRequest.facultyId) {
        return res.status(403).json({ message: 'Access denied. You can only view your own leave requests' });
      }
    }
    // If user is HOD, only allow viewing leave requests from their department
    else if (req.user.role === 'hod' && faculty.User.department !== req.user.department) {
      return res.status(403).json({
        message: 'Access denied. You can only view leave requests from your department'
      });
    }
    
    res.json(leaveRequest);
  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({ message: 'Server error while fetching leave request' });
  }
});

// @route   POST /api/leaves
// @desc    Create a new leave request
// @access  Private (Faculty/HOD/Admin)
router.post('/', authenticate, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { startDate, endDate, reason } = req.body;
    
    // Validate required fields
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({
        message: 'Please provide startDate, endDate, and reason'
      });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (start > end) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }
    
    if (start < new Date()) {
      return res.status(400).json({ message: 'Cannot create leave request for past dates' });
    }
    
    // Get faculty ID
    let facultyId;
    
    if (req.user.role === 'faculty' || req.user.role === 'hod') {
      const faculty = await Faculty.findOne({
        where: { userId: req.user.id },
        transaction
      });
      
      if (!faculty) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Faculty record not found' });
      }
      
      facultyId = faculty.id;
    } else if (req.user.role === 'admin' && req.body.facultyId) {
      // Admin can create leave requests for any faculty
      const faculty = await Faculty.findByPk(req.body.facultyId, { transaction });
      
      if (!faculty) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Faculty not found' });
      }
      
      facultyId = faculty.id;
    } else {
      await transaction.rollback();
      return res.status(400).json({ message: 'Faculty ID is required for admin users' });
    }
    
    // Check for overlapping leave requests
    const overlappingLeaves = await LeaveRequest.findOne({
      where: {
        facultyId,
        status: { [Op.ne]: 'rejected' },
        [Op.or]: [
          {
            startDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            endDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      },
      transaction
    });
    
    if (overlappingLeaves) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Overlapping leave request already exists for this period'
      });
    }
    
    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      facultyId,
      startDate,
      endDate,
      reason,
      status: 'pending'
    }, { transaction });
    
    // Find affected timetable entries
    const affectedEntries = await TimetableEntry.findAll({
      include: [
        {
          model: Timetable,
          where: {
            startDate: { [Op.lte]: endDate },
            endDate: { [Op.gte]: startDate },
            status: 'published',
            isActive: true
          }
        }
      ],
      where: {
        facultyId,
        day: {
          [Op.in]: getDaysOfWeekBetweenDates(start, end)
        }
      },
      transaction
    });
    
    // Create substitution requests for affected entries
    if (affectedEntries.length > 0) {
      // Get faculty from the same department who can teach the subjects
      const facultyUser = await Faculty.findByPk(facultyId, {
        include: [{
          model: User,
          attributes: ['department']
        }],
        transaction
      });
      
      const department = facultyUser.User.department;
      
      // Group entries by subject
      const entriesBySubject = {};
      affectedEntries.forEach(entry => {
        if (!entriesBySubject[entry.subjectId]) {
          entriesBySubject[entry.subjectId] = [];
        }
        entriesBySubject[entry.subjectId].push(entry);
      });
      
      // For each subject, find potential substitute faculty
      for (const subjectId in entriesBySubject) {
        const potentialSubstitutes = await sequelize.query(
          `SELECT "Faculty"."id" as "facultyId", "Users"."name", "Users"."email", "FacultySubjects"."preference"
           FROM "Faculty"
           JOIN "Users" ON "Faculty"."userId" = "Users"."id"
           JOIN "FacultySubjects" ON "Faculty"."id" = "FacultySubjects"."facultyId"
           WHERE "Users"."department" = :department
           AND "FacultySubjects"."subjectId" = :subjectId
           AND "FacultySubjects"."isActive" = true
           AND "Faculty"."id" != :facultyId
           ORDER BY "FacultySubjects"."preference" DESC`,
          {
            replacements: { department, subjectId, facultyId },
            type: sequelize.QueryTypes.SELECT,
            transaction
          }
        );
        
        // Create substitution requests for each entry
        for (const entry of entriesBySubject[subjectId]) {
          // Get the date for this entry based on the day of week
          const entryDates = getDatesByDayOfWeek(
            entry.day,
            new Date(startDate),
            new Date(endDate)
          );
          
          for (const date of entryDates) {
            // Create a substitution request for each date
            await Substitution.create({
              timetableEntryId: entry.id,
              originalFacultyId: facultyId,
              substituteFacultyId: potentialSubstitutes.length > 0 ? potentialSubstitutes[0].facultyId : null,
              date,
              leaveRequestId: leaveRequest.id,
              status: 'pending',
              notificationSent: false
            }, { transaction });
            
            // Send email notifications to potential substitutes
            if (potentialSubstitutes.length > 0) {
              for (const substitute of potentialSubstitutes) {
                await sendSubstitutionRequestEmail(
                  substitute.email,
                  substitute.name,
                  facultyUser.User.name,
                  date,
                  entry.startTime,
                  entry.endTime
                );
              }
            }
          }
        }
      }
    }
    
    await transaction.commit();
    
    res.status(201).json({
      message: 'Leave request created successfully',
      leaveRequest,
      affectedEntriesCount: affectedEntries.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create leave request error:', error);
    res.status(500).json({ message: 'Server error while creating leave request' });
  }
});

// @route   PUT /api/leaves/:id/approve
// @desc    Approve leave request
// @access  Private (Admin/HOD)
router.put('/:id/approve', authenticate, isAdminOrHOD, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [{
        model: Faculty,
        include: [{
          model: User,
          attributes: ['id', 'name', 'email', 'department']
        }]
      }],
      transaction
    });
    
    if (!leaveRequest) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    // If user is HOD, only allow approving leave requests from their department
    if (req.user.role === 'hod' && leaveRequest.Faculty.User.department !== req.user.department) {
      await transaction.rollback();
      return res.status(403).json({
        message: 'Access denied. You can only approve leave requests from your department'
      });
    }
    
    // Don't allow approving if leave request is not pending
    if (leaveRequest.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Only pending leave requests can be approved' });
    }
    
    // Update leave request status
    await leaveRequest.update({
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date()
    }, { transaction });
    
    // Update substitution requests
    await Substitution.update(
      { status: 'pending' },
      {
        where: { leaveRequestId: leaveRequest.id },
        transaction
      }
    );
    
    // Send email notification to faculty
    await sendLeaveApprovalEmail(
      leaveRequest.Faculty.User.email,
      leaveRequest.Faculty.User.name,
      leaveRequest.startDate,
      leaveRequest.endDate,
      'approved'
    );
    
    await transaction.commit();
    
    res.json({
      message: 'Leave request approved successfully',
      leaveRequest
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Approve leave request error:', error);
    res.status(500).json({ message: 'Server error while approving leave request' });
  }
});

// @route   PUT /api/leaves/:id/reject
// @desc    Reject leave request
// @access  Private (Admin/HOD)
router.put('/:id/reject', authenticate, isAdminOrHOD, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [{
        model: Faculty,
        include: [{
          model: User,
          attributes: ['id', 'name', 'email', 'department']
        }]
      }],
      transaction
    });
    
    if (!leaveRequest) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    // If user is HOD, only allow rejecting leave requests from their department
    if (req.user.role === 'hod' && leaveRequest.Faculty.User.department !== req.user.department) {
      await transaction.rollback();
      return res.status(403).json({
        message: 'Access denied. You can only reject leave requests from your department'
      });
    }
    
    // Don't allow rejecting if leave request is not pending
    if (leaveRequest.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Only pending leave requests can be rejected' });
    }
    
    // Update leave request status
    await leaveRequest.update({
      status: 'rejected',
      rejectionReason,
      approvedBy: req.user.id,
      approvedAt: new Date()
    }, { transaction });
    
    // Delete substitution requests
    await Substitution.destroy({
      where: { leaveRequestId: leaveRequest.id },
      transaction
    });
    
    // Send email notification to faculty
    await sendLeaveApprovalEmail(
      leaveRequest.Faculty.User.email,
      leaveRequest.Faculty.User.name,
      leaveRequest.startDate,
      leaveRequest.endDate,
      'rejected',
      rejectionReason
    );
    
    await transaction.commit();
    
    res.json({
      message: 'Leave request rejected successfully',
      leaveRequest
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Reject leave request error:', error);
    res.status(500).json({ message: 'Server error while rejecting leave request' });
  }
});

// @route   PUT /api/leaves/:id/cancel
// @desc    Cancel leave request
// @access  Private
router.put('/:id/cancel', authenticate, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [{
        model: Faculty,
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }]
      }],
      transaction
    });
    
    if (!leaveRequest) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    // Check if user has permission to cancel this leave request
    if (req.user.role === 'faculty') {
      const faculty = await Faculty.findOne({
        where: { userId: req.user.id },
        transaction
      });
      
      if (!faculty || faculty.id !== leaveRequest.facultyId) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Access denied. You can only cancel your own leave requests' });
      }
    } else if (req.user.role === 'hod') {
      const faculty = await Faculty.findByPk(leaveRequest.facultyId, {
        include: [{
          model: User,
          attributes: ['department']
        }],
        transaction
      });
      
      if (faculty.User.department !== req.user.department) {
        await transaction.rollback();
        return res.status(403).json({
          message: 'Access denied. You can only cancel leave requests from your department'
        });
      }
    }
    
    // Don't allow canceling if leave request is already completed or rejected
    if (leaveRequest.status === 'completed' || leaveRequest.status === 'rejected') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Cannot cancel completed or rejected leave requests' });
    }
    
    // Update leave request status
    await leaveRequest.update({
      status: 'cancelled'
    }, { transaction });
    
    // Delete substitution requests
    await Substitution.destroy({
      where: { leaveRequestId: leaveRequest.id },
      transaction
    });
    
    await transaction.commit();
    
    res.json({
      message: 'Leave request cancelled successfully',
      leaveRequest
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Cancel leave request error:', error);
    res.status(500).json({ message: 'Server error while cancelling leave request' });
  }
});

// Helper function to get days of week between two dates
function getDaysOfWeekBetweenDates(startDate, endDate) {
  const days = [];
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);
  
  while (currentDate <= lastDate) {
    const dayOfWeek = daysOfWeek[currentDate.getDay()];
    if (!days.includes(dayOfWeek)) {
      days.push(dayOfWeek);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
}

// Helper function to get dates for a specific day of week between two dates
function getDatesByDayOfWeek(dayOfWeek, startDate, endDate) {
  const dates = [];
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = daysOfWeek.indexOf(dayOfWeek);
  
  if (dayIndex === -1) {
    return dates;
  }
  
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);
  
  while (currentDate <= lastDate) {
    if (currentDate.getDay() === dayIndex) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

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

// Helper function to send leave approval/rejection email
async function sendLeaveApprovalEmail(email, name, startDate, endDate, status, rejectionReason = null) {
  try {
    const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let subject, html;
    
    if (status === 'approved') {
      subject = 'Leave Request Approved';
      html = `
        <h2>Leave Request Approved</h2>
        <p>Dear ${name},</p>
        <p>Your leave request from ${formattedStartDate} to ${formattedEndDate} has been approved.</p>
        <p>Substitution arrangements will be made for your classes during this period.</p>
        <p>Thank you for using the Smart Classroom & Timetable Scheduler.</p>
      `;
    } else {
      subject = 'Leave Request Rejected';
      html = `
        <h2>Leave Request Rejected</h2>
        <p>Dear ${name},</p>
        <p>Your leave request from ${formattedStartDate} to ${formattedEndDate} has been rejected.</p>
        <p>Reason: ${rejectionReason}</p>
        <p>If you have any questions, please contact your department head.</p>
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
    console.log('Leave approval/rejection email sent:', info.messageId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Send leave approval/rejection email error:', error);
    return false;
  }
}

module.exports = router;