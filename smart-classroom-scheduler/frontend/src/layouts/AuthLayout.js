import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Container, Box, Paper, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            Smart Classroom
          </Typography>
          <Typography component="h2" variant="h6" color="textSecondary" gutterBottom>
            Timetable Scheduler
          </Typography>
          <Outlet />
        </Paper>
      </Box>
    </Container>
  );
};

export default AuthLayout;