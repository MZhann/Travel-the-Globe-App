import { Request, Response, Router, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

function ensureDb(_req: Request, res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: 'Database not connected' });
    return;
  }
  next();
}

/**
 * POST /api/auth/register
 * Body: { email, password, displayName? }
 */
router.post('/register', ensureDb, async (req: Request, res: Response) => {
  const email = req.body?.email != null ? String(req.body.email).toLowerCase().trim() : '';
  const password = req.body?.password != null ? String(req.body.password) : '';
  const displayName = req.body?.displayName != null ? String(req.body.displayName).trim() : undefined;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const { salt, hash } = hashPassword(password);
    const user = await User.create({
      email,
      salt,
      hash,
      displayName: displayName || undefined,
    });

    const token = signToken(String(user._id), user.email);
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
      token,
    });
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: number }).code : null;
    if (code === 11000) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', ensureDb, async (req: Request, res: Response) => {
  const email = req.body?.email != null ? String(req.body.email).toLowerCase().trim() : '';
  const password = req.body?.password != null ? String(req.body.password) : '';

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const ok = verifyPassword(password, user.salt, user.hash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(String(user._id), user.email);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me — requires Authorization: Bearer <token>
 */
router.get('/me', ensureDb, requireAuth, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const u = authReq.user!;
  res.json({
    user: {
      id: u._id,
      email: u.email,
      displayName: u.displayName,
    },
  });
});

export default router;
