# Smart Classroom & Timetable Scheduler - Backend

This is the backend API for the Smart Classroom & Timetable Scheduler application, built with Node.js, Express, and PostgreSQL.

## Features

- JWT-based authentication system
- Role-based access control (Admin, HOD, Faculty)
- Classroom management
- Subject management
- Faculty management with availability tracking
- Batch management
- Timetable generation with optimization
- Leave request system with substitution management
- Email notifications for leave requests and substitutions

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd smart-classroom-scheduler/backend
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure environment variables

Copy the example environment file and update it with your configuration:

```bash
cp .env.example .env
```

Update the `.env` file with your database credentials and other configuration options.

### 4. Set up the database

Create a PostgreSQL database with the name specified in your `.env` file.

### 5. Start the server

#### Development mode

```bash
npm run dev
# or
yarn dev
```

#### Production mode

```bash
npm start
# or
yarn start
```

The server will start on the port specified in your `.env` file (default: 5000).

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile

### Users

- `GET /api/users` - Get all users (Admin/HOD only)
- `GET /api/users/:id` - Get user by ID (Admin/HOD only)
- `PUT /api/users/:id` - Update user (Admin/HOD only)
- `DELETE /api/users/:id` - Deactivate user (Admin only)
- `POST /api/users/:id/reset-password` - Reset user password (Admin/HOD only)

### Classrooms

- `GET /api/classrooms` - Get all classrooms
- `GET /api/classrooms/:id` - Get classroom by ID
- `POST /api/classrooms` - Create a new classroom (Admin/HOD only)
- `PUT /api/classrooms/:id` - Update classroom (Admin/HOD only)
- `DELETE /api/classrooms/:id` - Deactivate classroom (Admin/HOD only)

### Subjects

- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get subject by ID
- `POST /api/subjects` - Create a new subject (Admin/HOD only)
- `PUT /api/subjects/:id` - Update subject (Admin/HOD only)
- `DELETE /api/subjects/:id` - Deactivate subject (Admin/HOD only)
- `POST /api/subjects/:id/faculty` - Assign faculty to subject (Admin/HOD only)
- `DELETE /api/subjects/:id/faculty/:facultyId` - Remove faculty from subject (Admin/HOD only)

### Faculty

- `GET /api/faculty` - Get all faculty
- `GET /api/faculty/:id` - Get faculty by ID
- `PUT /api/faculty/:id` - Update faculty details (Admin/HOD only)
- `POST /api/faculty/:id/availability` - Set faculty availability (Admin/HOD/Faculty themselves)
- `GET /api/faculty/:id/subjects` - Get subjects taught by faculty
- `GET /api/faculty/:id/availability` - Get faculty availability

### Batches

- `GET /api/batches` - Get all batches
- `GET /api/batches/:id` - Get batch by ID
- `POST /api/batches` - Create a new batch (Admin/HOD only)
- `PUT /api/batches/:id` - Update batch (Admin/HOD only)
- `DELETE /api/batches/:id` - Deactivate batch (Admin/HOD only)

### Timetables

- `GET /api/timetables` - Get all timetables
- `GET /api/timetables/:id` - Get timetable by ID
- `POST /api/timetables` - Create a new timetable (Admin/HOD only)
- `PUT /api/timetables/:id` - Update timetable (Admin/HOD only)
- `DELETE /api/timetables/:id` - Deactivate timetable (Admin/HOD only)
- `POST /api/timetables/:id/generate` - Generate timetable entries (Admin/HOD only)
- `PUT /api/timetables/:id/approve` - Approve timetable (Admin/HOD only)
- `PUT /api/timetables/:id/publish` - Publish timetable (Admin/HOD only)
- `POST /api/timetables/:id/entries` - Add timetable entry (Admin/HOD only)
- `PUT /api/timetables/:id/entries/:entryId` - Update timetable entry (Admin/HOD only)
- `DELETE /api/timetables/:id/entries/:entryId` - Delete timetable entry (Admin/HOD only)

### Leave Requests

- `GET /api/leave-requests` - Get all leave requests
- `GET /api/leave-requests/:id` - Get leave request by ID
- `POST /api/leave-requests` - Create a new leave request
- `PUT /api/leave-requests/:id/approve` - Approve leave request (Admin/HOD only)
- `PUT /api/leave-requests/:id/reject` - Reject leave request (Admin/HOD only)
- `DELETE /api/leave-requests/:id` - Cancel leave request

### Substitutions

- `GET /api/substitutions` - Get all substitution requests
- `GET /api/substitutions/:id` - Get substitution request by ID
- `PUT /api/substitutions/:id/accept` - Accept substitution request
- `PUT /api/substitutions/:id/decline` - Decline substitution request
- `PUT /api/substitutions/:id/assign` - Assign faculty to substitution (Admin/HOD only)

## License

This project is licensed under the MIT License.