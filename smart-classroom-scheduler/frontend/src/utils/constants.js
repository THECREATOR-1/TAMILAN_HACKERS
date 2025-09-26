// API URL
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// User Roles
export const ROLES = {
  ADMIN: 'admin',
  HOD: 'hod',
  FACULTY: 'faculty',
};

// Days of Week
export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Time Slots
export const TIME_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
];

// Timetable Status
export const TIMETABLE_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PUBLISHED: 'published',
};

// Leave Request Status
export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Substitution Status
export const SUBSTITUTION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  ASSIGNED: 'assigned',
  CANCELLED: 'cancelled',
};

// Classroom Types
export const CLASSROOM_TYPES = {
  LECTURE: 'lecture',
  LAB: 'lab',
  SEMINAR: 'seminar',
};