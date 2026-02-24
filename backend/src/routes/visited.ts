import { Request, Response, NextFunction, Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

function ensureDb(_req: Request, res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: 'Database not connected' });
    return;
  }
  next();
}

/**
 * GET /api/visited
 * Returns the list of visited country ISO-2 codes for the authenticated user.
 */
router.get('/', ensureDb, requireAuth, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({ visitedCountries: authReq.user!.visitedCountries ?? [] });
});

/**
 * POST /api/visited/:iso2
 * Marks a country as visited. Idempotent (won't duplicate).
 */
router.post('/:iso2', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const iso2 = req.params.iso2.toUpperCase();

  if (!/^[A-Z]{2}$/.test(iso2)) {
    res.status(400).json({ error: 'Invalid ISO-2 code' });
    return;
  }

  try {
    const user = authReq.user!;
    if (!user.visitedCountries.includes(iso2)) {
      user.visitedCountries.push(iso2);
    }
    // Auto-remove from wishlist when marking as visited
    user.wishlistCountries = user.wishlistCountries.filter((c) => c !== iso2);
    await user.save();
    res.json({
      visitedCountries: user.visitedCountries,
      wishlistCountries: user.wishlistCountries,
    });
  } catch (err) {
    console.error('Mark visited error:', err);
    res.status(500).json({ error: 'Failed to mark country as visited' });
  }
});

/**
 * DELETE /api/visited/:iso2
 * Unmarks a country as visited.
 */
router.delete('/:iso2', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const iso2 = req.params.iso2.toUpperCase();

  if (!/^[A-Z]{2}$/.test(iso2)) {
    res.status(400).json({ error: 'Invalid ISO-2 code' });
    return;
  }

  try {
    const user = authReq.user!;
    user.visitedCountries = user.visitedCountries.filter((c) => c !== iso2);
    await user.save();
    res.json({ visitedCountries: user.visitedCountries });
  } catch (err) {
    console.error('Unmark visited error:', err);
    res.status(500).json({ error: 'Failed to unmark country' });
  }
});

export default router;

