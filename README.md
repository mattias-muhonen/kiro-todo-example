This is a project entirely created with Kiro (Claude Sonnet 4). It was given a task to do a "todo app where tasks can be assigned to users".
- Look into .kiro/specs/todo-app-with-assignments to see the spec it created
- tasks are partially completed

---

# Todo App with Assignments

A collaborative todo application that allows users to create, manage, and assign tasks to other users.

## Project Structure

```
├── backend/          # Node.js/Express API server
│   ├── src/          # TypeScript source code
│   ├── dist/         # Compiled JavaScript (generated)
│   └── package.json  # Backend dependencies
├── frontend/         # React application
│   ├── src/          # TypeScript/React source code
│   ├── dist/         # Built frontend (generated)
│   └── package.json  # Frontend dependencies
└── package.json      # Root package with scripts
```

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Install dependencies for all projects:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Development Scripts

```bash
# Start both frontend and backend in development mode
npm run dev

# Start only backend
npm run dev:server

# Start only frontend  
npm run dev:client

# Run tests for both projects
npm test

# Run linting for both projects
npm run lint

# Build both projects for production
npm run build
```

### Backend (Port 3001)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM (to be configured)
- **Authentication**: JWT tokens
- **Testing**: Jest with Supertest

### Frontend (Port 5173)
- **Framework**: React 18 with TypeScript
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Testing**: Vitest with React Testing Library

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/todo_app"
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"
```

## Next Steps

This project structure is ready for development. The next tasks involve:
1. Setting up the database and models
2. Implementing authentication
3. Building the task management API
4. Creating the React components
5. Adding real-time notifications

See `.kiro/specs/todo-app-with-assignments/tasks.md` for the detailed implementation plan.