# Serverless Function Platform

A lightweight serverless function platform for Node.js, allowing you to upload, manage, and schedule JavaScript and TypeScript functions through a clean web interface.

## Features

- 📦 Upload JavaScript (.js) and TypeScript (.ts) functions through a web UI
- 🔄 Automatic TypeScript compilation
- 💻 Execute functions via HTTP POST requests
- ⏱️ Schedule functions using cron expressions
- 🔒 Simple authentication
- 🛡️ Sandboxed function execution environment

## Requirements

- Node.js (v14+ recommended)
- npm or yarn
- Git

## Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/serverless.git
cd serverless
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy the `.env.example` file to `.env` and adjust the values as needed:

```bash
cp .env.example .env
```

Or create a new `.env` file with the following variables:

```
PORT=3000
JWT_SECRET=your_jwt_secret_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
NODE_ENV=development
```

4. **Build the project**

```bash
npm run build
```

5. **Start the server**

```bash
npm start
```

The server will be available at http://localhost:3000 (or the port you specified in the `.env` file).

## Development

For development with hot reloading:

```bash
npm run dev
```

## Usage

### Authentication

1. Access the web interface at http://localhost:3000
2. Log in with the credentials set in your `.env` file (default: admin/admin)

### Working with Functions

#### Uploading Functions

1. Navigate to the "Upload" page
2. Upload a JavaScript (.js) or TypeScript (.ts) file
3. The function will be processed and compiled if needed

#### Function Format

Functions should export a function that takes an input object and returns a result:

```javascript
// example.js
module.exports = function(input) {
  // Process input
  console.log('Input received:', input);
  
  // Return result (can also return a Promise)
  return {
    message: 'Hello from serverless function!',
    timestamp: new Date().toISOString(),
    input: input
  };
};
```

Or using TypeScript:

```typescript
// example.ts
interface Input {
  name?: string;
  [key: string]: any;
}

interface Output {
  message: string;
  timestamp: string;
  input: Input;
}

export default function(input: Input): Output {
  return {
    message: `Hello, ${input.name || 'world'}!`,
    timestamp: new Date().toISOString(),
    input
  };
}
```

#### Running Functions

1. Navigate to the "Functions" page
2. Click "Execute" on the function you want to run
3. Enter the input JSON if needed and click "Execute Function"
4. View the output

### Working with Schedules

#### Creating Schedules

1. Navigate to the "Schedules" page
2. Click "New Schedule"
3. Select a function, enter a cron expression, and provide optional settings
4. Click "Create Schedule"

#### Managing Schedules

- Use the "Activate" or "Deactivate" buttons to toggle schedule status
- Delete schedules with the "Delete" button

## API Routes

The platform provides the following API endpoints:

- **Authentication**
  - `POST /api/auth/login` - Login with username and password
  - `POST /api/auth/logout` - Logout current user
  - `GET /api/auth/status` - Check authentication status

- **Functions**
  - `GET /api/functions` - List all functions
  - `POST /api/functions/upload` - Upload a new function
  - `DELETE /api/functions/:name` - Delete a function
  - `POST /api/functions/:name/execute` - Execute a function

- **Schedules**
  - `GET /api/schedules` - List all schedules
  - `POST /api/schedules` - Create a new schedule
  - `PATCH /api/schedules/:id` - Update a schedule
  - `DELETE /api/schedules/:id` - Delete a schedule
  - `POST /api/schedules/:id/activate` - Activate a schedule
  - `POST /api/schedules/:id/deactivate` - Deactivate a schedule

## License

MIT 