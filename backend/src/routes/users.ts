import { Request, Response, Router, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import TravelMemory from '../models/TravelMemory';
import { optionalAuth } from '../middleware/auth';
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
 * GET /api/users/search
 * Search for users by displayName or email
 * Query: ?q=searchTerm&limit=20
 */
router.get('/search', ensureDb, async (req: Request, res: Response) => {
  const query = req.query.q as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  if (!query || query.trim().length < 2) {
    res.status(400).json({ error: 'Search query must be at least 2 characters' });
    return;
  }

  try {
    const searchTerm = query.trim();
    const regex = new RegExp(searchTerm, 'i');

    const users = await User.find({
      $or: [
        { displayName: { $regex: regex } },
        { email: { $regex: regex } },
      ],
    })
      .select('_id email displayName visitedCountries wishlistCountries albumsPublic createdAt')
      .limit(limit)
      .lean();

    res.json({
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        displayName: u.displayName,
        visitedCount: u.visitedCountries?.length ?? 0,
        wishlistCount: u.wishlistCountries?.length ?? 0,
        albumsPublic: u.albumsPublic ?? false,
        joinedAt: (u as { createdAt?: Date }).createdAt || new Date(),
      })),
    });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * GET /api/users/:userId/profile
 * Get public profile data for a user
 * Returns: visited countries, wishlist, stats, and public albums
 */
router.get('/:userId/profile', ensureDb, optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const targetUserId = req.params.userId;
  const currentUserId = authReq.user?._id?.toString();
  const isOwnProfile = currentUserId === targetUserId;

  try {
    const user = await User.findById(targetUserId)
      .select('_id email displayName visitedCountries wishlistCountries albumsPublic createdAt')
      .lean();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get public memories if albums are public or viewing own profile
    let memories: unknown[] = [];
    if (isOwnProfile || user.albumsPublic) {
      const filter: Record<string, unknown> = { userId: targetUserId };
      if (!isOwnProfile) {
        filter.isPublic = true;
      }

      const userMemories = await TravelMemory.find(filter)
        .select('_id countryCode dateTaken notes isPublic createdAt')
        .sort({ dateTaken: -1 })
        .limit(50)
        .lean();

      memories = userMemories.map((m) => ({
        id: m._id,
        countryCode: m.countryCode,
        dateTaken: m.dateTaken,
        notes: m.notes,
        isPublic: m.isPublic,
        createdAt: m.createdAt,
      }));
    }

    // Calculate stats
    const totalCountries = 195;
    const visitedCount = user.visitedCountries?.length ?? 0;
    const wishlistCount = user.wishlistCountries?.length ?? 0;
    const percentage = totalCountries > 0 ? Math.round((visitedCount / totalCountries) * 100) : 0;

    res.json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        visitedCountries: user.visitedCountries ?? [],
        wishlistCountries: user.wishlistCountries ?? [],
        albumsPublic: user.albumsPublic ?? false,
        joinedAt: (user as { createdAt?: Date }).createdAt || new Date(),
      },
      stats: {
        visitedCount,
        wishlistCount,
        photoCount: memories.length,
        percentage,
        totalCountries,
      },
      memories,
      isOwnProfile,
      canViewAlbums: isOwnProfile || user.albumsPublic,
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * GET /api/users/explore
 * Get featured users (users with most visited countries)
 * Query: ?limit=10
 */
router.get('/explore', ensureDb, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

  try {
    const users = await User.find({
      'visitedCountries.0': { $exists: true }, // Has at least one visited country
    })
      .select('_id email displayName visitedCountries wishlistCountries albumsPublic createdAt')
      .lean()
      .then((users) => {
        // Sort by visited countries array length (descending)
        return users.sort((a, b) => {
          const aCount = a.visitedCountries?.length ?? 0;
          const bCount = b.visitedCountries?.length ?? 0;
          return bCount - aCount;
        });
      })
      .then((users) => users.slice(0, limit));

    res.json({
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        displayName: u.displayName,
        visitedCount: u.visitedCountries?.length ?? 0,
        wishlistCount: u.wishlistCountries?.length ?? 0,
        albumsPublic: u.albumsPublic ?? false,
        joinedAt: (u as { createdAt?: Date }).createdAt || new Date(),
      })),
    });
  } catch (err) {
    console.error('Explore users error:', err);
    res.status(500).json({ error: 'Failed to fetch featured users' });
  }
});

export default router;

