// Force reload of TypeScript server
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { initScheduler } from './services/scheduler';
import { ensureFunctionDirectories } from './services/fileSystem';
import authRoutes from './routes/auth';
import functionRoutes from './routes/functions';
import schedulesRoutes from './routes/schedules';
import { authMiddleware } from './middleware/auth';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max file size
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '..', 'tmp')
}));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/functions', authMiddleware, functionRoutes);
app.use('/api/schedules', authMiddleware, schedulesRoutes);

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Initialize the directories
ensureFunctionDirectories();

// Start the scheduler
initScheduler();

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app; 