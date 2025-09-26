import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';

// User Management Pages
import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';

// Classroom Management Pages
import ClassroomList from './pages/classrooms/ClassroomList';
import ClassroomForm from './pages/classrooms/ClassroomForm';

// Subject Management Pages
import SubjectList from './pages/subjects/SubjectList';
import SubjectForm from './pages/subjects/SubjectForm';

// Faculty Management Pages
import FacultyList from './pages/faculty/FacultyList';
import FacultyForm from './pages/faculty/FacultyForm';
import FacultyAvailability from './pages/faculty/FacultyAvailability';

// Batch Management Pages
import BatchList from './pages/batches/BatchList';
import BatchForm from './pages/batches/BatchForm';

// Timetable Management Pages
import TimetableList from './pages/timetables/TimetableList';
import TimetableForm from './pages/timetables/TimetableForm';
import TimetableView from './pages/timetables/TimetableView';
import TimetableGenerate from './pages/timetables/TimetableGenerate';

// Leave Management Pages
import LeaveRequestList from './pages/leaves/LeaveRequestList';
import LeaveRequestForm from './pages/leaves/LeaveRequestForm';

// Substitution Management Pages
import SubstitutionList from './pages/substitutions/SubstitutionList';

// Error Pages
import NotFound from './pages/errors/NotFound';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Main App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* User Management Routes */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <UserList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <UserForm />
            </ProtectedRoute>
          }
        />

        {/* Classroom Management Routes */}
        <Route path="/classrooms" element={<ClassroomList />} />
        <Route
          path="/classrooms/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <ClassroomForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classrooms/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <ClassroomForm />
            </ProtectedRoute>
          }
        />

        {/* Subject Management Routes */}
        <Route path="/subjects" element={<SubjectList />} />
        <Route
          path="/subjects/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <SubjectForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <SubjectForm />
            </ProtectedRoute>
          }
        />

        {/* Faculty Management Routes */}
        <Route path="/faculty" element={<FacultyList />} />
        <Route
          path="/faculty/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <FacultyForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/:id/availability"
          element={
            <ProtectedRoute>
              <FacultyAvailability />
            </ProtectedRoute>
          }
        />

        {/* Batch Management Routes */}
        <Route path="/batches" element={<BatchList />} />
        <Route
          path="/batches/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <BatchForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <BatchForm />
            </ProtectedRoute>
          }
        />

        {/* Timetable Management Routes */}
        <Route path="/timetables" element={<TimetableList />} />
        <Route
          path="/timetables/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <TimetableForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetables/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <TimetableForm />
            </ProtectedRoute>
          }
        />
        <Route path="/timetables/:id/view" element={<TimetableView />} />
        <Route
          path="/timetables/:id/generate"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <TimetableGenerate />
            </ProtectedRoute>
          }
        />

        {/* Leave Management Routes */}
        <Route path="/leave-requests" element={<LeaveRequestList />} />
        <Route path="/leave-requests/new" element={<LeaveRequestForm />} />
        <Route path="/leave-requests/:id" element={<LeaveRequestForm />} />

        {/* Substitution Management Routes */}
        <Route path="/substitutions" element={<SubstitutionList />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;