# Smart Classroom & Timetable Scheduler

A comprehensive web-based application for optimizing classroom scheduling and timetable management in higher education institutions.

## Overview

This application helps educational institutions efficiently manage their classroom scheduling, faculty assignments, and timetable generation. It provides an intelligent optimization engine that considers multiple variables such as classrooms, student batches, subjects, faculty availability, and workloads to generate optimal timetables.

## Key Features

- **User Authentication**: Secure login system for administrators, HODs, and faculty members
- **Resource Management**: Input forms for classrooms, student batches, subjects, and faculty
- **Timetable Generation**: Automatic generation of optimized timetables based on multiple constraints
- **Leave Management**: Faculty leave request system with automatic substitution suggestions
- **Approval Workflow**: Review and approval process for generated timetables
- **Multi-department Support**: Support for multiple departments and shifts
- **Publishing System**: Option to publish finalized timetables

## Tech Stack

- **Frontend**: React.js with modern responsive UI
- **Backend**: Node.js with Express.js (RESTful API)
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based authentication
- **Notifications**: Email notifications using Nodemailer

## Project Structure

The project is organized into two main directories:

- `frontend/`: Contains the React.js frontend application
- `backend/`: Contains the Node.js/Express.js backend API

Each directory has its own README with specific setup instructions.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup Instructions

1. Clone the repository

```bash
git clone <repository-url>
cd smart-classroom-scheduler
```

2. Set up the backend

Follow the instructions in the [backend README](./backend/README.md).

3. Set up the frontend

Follow the instructions in the [frontend README](./frontend/README.md).

## Deployment

### Local Deployment

Follow the setup instructions above to run the application locally.

### Cloud Deployment

The application can be deployed to cloud platforms like Render, Railway, or Vercel:

- **Backend**: Deploy the Node.js application to Render or Railway
- **Frontend**: Deploy the React application to Vercel or Netlify
- **Database**: Use a managed PostgreSQL service like Render Database, Railway PostgreSQL, or AWS RDS

Detailed deployment instructions for each platform are available in the respective READMEs.

## License

This project is licensed under the MIT License.