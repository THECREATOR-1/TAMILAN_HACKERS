# Smart Classroom & Timetable Scheduler - Frontend

This is the frontend application for the Smart Classroom & Timetable Scheduler, built with React.js.

## Features

- Modern responsive UI built with React
- JWT-based authentication
- Role-based access control (Admin, HOD, Faculty)
- Dashboard for different user roles
- Forms for managing classrooms, subjects, faculty, and batches
- Timetable visualization and management
- Leave request and substitution management
- Notifications for leave requests and substitutions

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd smart-classroom-scheduler/frontend
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure environment variables

Create a `.env` file in the frontend directory with the following content:

```
REACT_APP_API_URL=http://localhost:5000/api
```

Adjust the URL if your backend is running on a different host or port.

### 4. Start the development server

```bash
npm start
# or
yarn start
```

The application will be available at http://localhost:3000.

### 5. Build for production

```bash
npm run build
# or
yarn build
```

This will create a `build` directory with optimized production files.

## Folder Structure

```
src/
├── assets/         # Static assets like images, icons
├── components/     # Reusable UI components
├── contexts/       # React contexts for state management
├── hooks/          # Custom React hooks
├── layouts/        # Page layout components
├── pages/          # Page components
├── services/       # API service functions
├── utils/          # Utility functions
├── App.js          # Main application component
├── index.js        # Application entry point
└── routes.js       # Application routes
```

## Available Scripts

- `npm start` - Starts the development server
- `npm test` - Runs tests
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App

## License

This project is licensed under the MIT License.