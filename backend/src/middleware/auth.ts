import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUserDoc } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: IUserDoc;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  User.findById(decoded.userId)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      console.error('requireAuth findUser:', err);
      res.status(500).json({ error: 'Server error' });
    });
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    User.findById(decoded.userId)
      .then((user) => {
        req.user = user ?? undefined;
        next();
      })
      .catch(() => next());
  } catch {
    next();
  }
}

export function signToken(userId: string, email: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as any;
  return jwt.sign({ userId, email } as JwtPayload, JWT_SECRET, { expiresIn });
}
