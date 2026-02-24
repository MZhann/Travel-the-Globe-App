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
 * GET /api/wishlist
 * Returns the wishlist country ISO-2 codes for the authenticated user.
 */
router.get('/', ensureDb, requireAuth, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({ wishlistCountries: authReq.user!.wishlistCountries ?? [] });
});

/**
 * POST /api/wishlist/:iso2
 * Adds a country to the wishlist. Idempotent.
 * Also removes it from visited (can't be both visited and wishlisted).
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
    if (!user.wishlistCountries.includes(iso2)) {
      user.wishlistCountries.push(iso2);
    }
    // If it was visited, remove from visited (wishlist = "want to visit", not "already visited")
    user.visitedCountries = user.visitedCountries.filter((c) => c !== iso2);
    await user.save();
    res.json({
      wishlistCountries: user.wishlistCountries,
      visitedCountries: user.visitedCountries,
    });
  } catch (err) {
    console.error('Add to wishlist error:', err);
    res.status(500).json({ error: 'Failed to add country to wishlist' });
  }
});

/**
 * DELETE /api/wishlist/:iso2
 * Removes a country from the wishlist.
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
    user.wishlistCountries = user.wishlistCountries.filter((c) => c !== iso2);
    await user.save();
    res.json({ wishlistCountries: user.wishlistCountries });
  } catch (err) {
    console.error('Remove from wishlist error:', err);
    res.status(500).json({ error: 'Failed to remove country from wishlist' });
  }
});

export default router;

