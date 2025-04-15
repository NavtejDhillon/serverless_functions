import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Get credentials from environment
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

/**
 * Login route
 * POST /api/auth/login
 */
router.route('/login').post(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    
    // Check if credentials match
    if (username !== ADMIN_USERNAME) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Compare password
    const isMatch = password === ADMIN_PASSWORD;
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Create JWT token
    const token = jwt.sign(
      { username },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Set session
    (req.session as any).authenticated = true;
    
    // Return token
    res.json({
      success: true,
      token,
      user: { username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Logout route
 * POST /api/auth/logout
 */
router.route('/logout').post((req: Request, res: Response, next: NextFunction) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Error logging out' });
      return;
    }
    res.json({ success: true });
  });
});

/**
 * Check authentication status
 * GET /api/auth/status
 */
router.route('/status').get((req: Request, res: Response, next: NextFunction) => {
  if (req.session && (req.session as any).authenticated) {
    res.json({ authenticated: true });
    return;
  }
  res.json({ authenticated: false });
});

export default router; 