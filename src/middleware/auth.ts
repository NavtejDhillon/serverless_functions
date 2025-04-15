import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Interface for decoded token
interface DecodedToken {
  username: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get token from header, query, or cookie
  const token = 
    req.headers.authorization?.split(' ')[1] || 
    req.query.token as string || 
    req.cookies?.token;
  
  // Check if a session exists (for session-based auth)
  if (req.session && (req.session as any).authenticated) {
    return next();
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    
    // Add user to request object
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}; 