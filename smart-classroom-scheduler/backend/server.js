const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/database');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Smart Classroom & Timetable Scheduler API' });
});

// Import routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/classrooms', require('./routes/classroom.routes'));
app.use('/api/subjects', require('./routes/subject.routes'));
app.use('/api/faculty', require('./routes/faculty.routes'));
app.use('/api/batches', require('./routes/batch.routes'));
app.use('/api/timetables', require('./routes/timetable.routes'));
app.use('/api/leave-requests', require('./routes/leave.routes'));
app.use('/api/substitutions', require('./routes/substitution.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message
  });
});

// Set port and start server
const PORT = process.env.PORT || 5000;

// Connect to database and start server
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
    
    // Sync database models
    return sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  })
  .then(() => {
    console.log('Database models synchronized.');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });