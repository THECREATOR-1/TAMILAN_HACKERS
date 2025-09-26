import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Schedule as ScheduleIcon,
  EventBusy as EventBusyIcon,
  SwapHoriz as SwapHorizIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../utils/constants';

// Mock data - in a real app, this would come from API calls
const mockData = {
  stats: {
    timetables: 5,
    pendingLeaves: 3,
    pendingSubstitutions: 2,
    upcomingClasses: 4,
  },
  recentTimetables: [
    { id: 1, name: 'CS Department - Fall 2023', status: 'published' },
    { id: 2, name: 'IT Department - Fall 2023', status: 'approved' },
    { id: 3, name: 'ECE Department - Fall 2023', status: 'pending_approval' },
  ],
  pendingLeaves: [
    { id: 1, faculty: 'John Doe', from: '2023-10-15', to: '2023-10-17', reason: 'Personal' },
    { id: 2, faculty: 'Jane Smith', from: '2023-10-20', to: '2023-10-22', reason: 'Medical' },
  ],
  pendingSubstitutions: [
    { id: 1, original: 'John Doe', date: '2023-10-16', slot: '10:00-11:00', subject: 'Data Structures' },
    { id: 2, original: 'Jane Smith', date: '2023-10-21', slot: '14:00-15:00', subject: 'Database Systems' },
  ],
  todayClasses: [
    { id: 1, subject: 'Data Structures', batch: 'CS-2A', time: '10:00-11:00', room: 'L201' },
    { id: 2, subject: 'Database Systems', batch: 'CS-3B', time: '14:00-15:00', room: 'L301' },
  ],
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // In a real app, this would be an API call
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ pb: 5 }}>
        <Typography variant="h4">Dashboard</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'primary.light',
              color: 'white',
            }}
          >
            <Box display="flex" alignItems="center">
              <ScheduleIcon fontSize="large" />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Timetables
              </Typography>
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 2 }}>
              {data.stats.timetables}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'secondary.light',
              color: 'white',
            }}
          >
            <Box display="flex" alignItems="center">
              <EventBusyIcon fontSize="large" />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Pending Leaves
              </Typography>
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 2 }}>
              {data.stats.pendingLeaves}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'warning.light',
              color: 'white',
            }}
          >
            <Box display="flex" alignItems="center">
              <SwapHorizIcon fontSize="large" />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Substitutions
              </Typography>
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 2 }}>
              {data.stats.pendingSubstitutions}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'success.light',
              color: 'white',
            }}
          >
            <Box display="flex" alignItems="center">
              <DashboardIcon fontSize="large" />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Today's Classes
              </Typography>
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 2 }}>
              {data.stats.upcomingClasses}
            </Typography>
          </Paper>
        </Grid>

        {/* Recent Timetables */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Timetables
              </Typography>
              <Divider />
              <List>
                {data.recentTimetables.map((timetable) => (
                  <ListItem key={timetable.id}>
                    <ListItemText
                      primary={timetable.name}
                      secondary={`Status: ${timetable.status}`}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      component={RouterLink}
                      to={`/timetables/${timetable.id}/view`}
                    >
                      View
                    </Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                component={RouterLink}
                to="/timetables"
              >
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Today's Classes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Classes
              </Typography>
              <Divider />
              <List>
                {data.todayClasses.map((cls) => (
                  <ListItem key={cls.id}>
                    <ListItemText
                      primary={`${cls.subject} (${cls.batch})`}
                      secondary={`${cls.time} | Room: ${cls.room}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Leave Requests - Only visible to Admin/HOD */}
        {(user?.role === ROLES.ADMIN || user?.role === ROLES.HOD) && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pending Leave Requests
                </Typography>
                <Divider />
                <List>
                  {data.pendingLeaves.map((leave) => (
                    <ListItem key={leave.id}>
                      <ListItemText
                        primary={leave.faculty}
                        secondary={`${leave.from} to ${leave.to} | Reason: ${leave.reason}`}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        component={RouterLink}
                        to={`/leave-requests/${leave.id}`}
                      >
                        Review
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  component={RouterLink}
                  to="/leave-requests"
                >
                  View All
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}

        {/* Pending Substitution Requests */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Substitution Requests
              </Typography>
              <Divider />
              <List>
                {data.pendingSubstitutions.map((sub) => (
                  <ListItem key={sub.id}>
                    <ListItemText
                      primary={`${sub.subject}`}
                      secondary={`${sub.date} | ${sub.slot} | Original: ${sub.original}`}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      component={RouterLink}
                      to={`/substitutions/${sub.id}`}
                    >
                      {user?.role === ROLES.FACULTY ? 'Respond' : 'Review'}
                    </Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                component={RouterLink}
                to="/substitutions"
              >
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;