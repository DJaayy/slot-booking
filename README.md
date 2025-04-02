# Deployment Slot Booking System

A comprehensive web application for managing deployment slots and releases, built with React, TypeScript, and Express.

## Features

- **Weekly Slot Booking**: Book deployment slots with a user-friendly weekly calendar view
- **Dashboard**: Track upcoming releases and view deployment statistics
- **Status Updates**: Manage deployment lifecycle with status updates (released, reverted, skipped)
- **Email Templates**: Customize notification templates for different deployment events
- **Future Date Filtering**: Only shows upcoming slots for better planning

## Technology Stack

- **Frontend**: React, TypeScript, TanStack Query, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, In-memory storage (can be extended to use PostgreSQL)
- **State Management**: React Query for server state, React hooks for local state
- **Form Handling**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/deployment-slot-booking.git
cd deployment-slot-booking
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

The application will be available at http://localhost:5000

## Project Structure

- `/client`: React frontend application
  - `/src/components`: Reusable UI components
  - `/src/pages`: Main application pages
  - `/src/hooks`: Custom React hooks
  - `/src/lib`: Utility functions and configuration
- `/server`: Express backend
  - `/storage.ts`: In-memory data storage and CRUD operations
  - `/routes.ts`: API endpoint definitions
- `/shared`: Code shared between frontend and backend
  - `/schema.ts`: Data models and validation schemas

## Usage

1. **Booking a Slot**: Navigate to the home page, select an available slot and fill in the release details
2. **Viewing Bookings**: Check the dashboard to see all upcoming deployments
3. **Updating Status**: Release team can update the status of deployments after execution
4. **Managing Email Templates**: Customize notification templates in the Email Templates section

## License

This project is licensed under the MIT License - see the LICENSE file for details.