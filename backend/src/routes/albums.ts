import { Request, Response, Router, NextFunction } from 'express';
import mongoose from 'mongoose';
import TravelMemory from '../models/TravelMemory';
import User from '../models/User';
import { requireAuth, optionalAuth } from '../middleware/auth';
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
 * POST /api/albums
 * Create a new travel memory (photo)
 * Body: { countryCode, imageData, dateTaken, notes?, isPublic? }
 */
router.post('/', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!._id;

  const { countryCode, imageData, dateTaken, notes, isPublic } = req.body;

  if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
    res.status(400).json({ error: 'Valid country code (ISO-2) is required' });
    return;
  }

  if (!imageData || typeof imageData !== 'string') {
    res.status(400).json({ error: 'Image data is required' });
    return;
  }

  // Limit image size to ~5MB (base64 encoded)
  if (imageData.length > 7_000_000) {
    res.status(400).json({ error: 'Image is too large. Maximum size is 5MB.' });
    return;
  }

  if (!dateTaken) {
    res.status(400).json({ error: 'Date is required' });
    return;
  }

  try {
    const memory = await TravelMemory.create({
      userId,
      countryCode: countryCode.toUpperCase(),
      imageData,
      dateTaken: new Date(dateTaken),
      notes: notes || '',
      isPublic: Boolean(isPublic),
    });

    res.status(201).json({
      memory: {
        id: memory._id,
        countryCode: memory.countryCode,
        imageData: memory.imageData,
        dateTaken: memory.dateTaken,
        notes: memory.notes,
        isPublic: memory.isPublic,
        createdAt: memory.createdAt,
      },
    });
  } catch (err) {
    console.error('Create album error:', err);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

/**
 * GET /api/albums
 * Get all memories for the current user
 * Query: ?countryCode=XX (optional)
 */
router.get('/', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!._id;
  const { countryCode } = req.query;

  try {
    const filter: Record<string, unknown> = { userId };
    if (countryCode && typeof countryCode === 'string') {
      filter.countryCode = countryCode.toUpperCase();
    }

    const memories = await TravelMemory.find(filter)
      .sort({ dateTaken: -1 })
      .lean();

    res.json({
      memories: memories.map((m) => ({
        id: m._id,
        countryCode: m.countryCode,
        imageData: m.imageData,
        dateTaken: m.dateTaken,
        notes: m.notes,
        isPublic: m.isPublic,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error('Get albums error:', err);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

/**
 * GET /api/albums/user/:userId
 * Get public memories for a specific user (for profile viewing by others)
 */
router.get('/user/:userId', ensureDb, optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const targetUserId = req.params.userId;
  const currentUserId = authReq.user?._id?.toString();

  try {
    // Check if target user exists and has public albums
    const targetUser = await User.findById(targetUserId).lean();
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // If viewing own profile, return all memories
    const isOwnProfile = currentUserId === targetUserId;

    // If not own profile and albums are private, deny access
    if (!isOwnProfile && !targetUser.albumsPublic) {
      res.json({
        memories: [],
        isPrivate: true,
        user: {
          id: targetUser._id,
          displayName: targetUser.displayName,
          visitedCount: targetUser.visitedCountries?.length ?? 0,
        },
      });
      return;
    }

    // Get memories (all for own profile, only public for others)
    const filter: Record<string, unknown> = { userId: targetUserId };
    if (!isOwnProfile) {
      filter.isPublic = true;
    }

    const memories = await TravelMemory.find(filter)
      .sort({ dateTaken: -1 })
      .lean();

    res.json({
      memories: memories.map((m) => ({
        id: m._id,
        countryCode: m.countryCode,
        imageData: m.imageData,
        dateTaken: m.dateTaken,
        notes: m.notes,
        isPublic: m.isPublic,
        createdAt: m.createdAt,
      })),
      isPrivate: false,
      user: {
        id: targetUser._id,
        displayName: targetUser.displayName,
        visitedCount: targetUser.visitedCountries?.length ?? 0,
        albumsPublic: targetUser.albumsPublic,
      },
    });
  } catch (err) {
    console.error('Get user albums error:', err);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

/**
 * PUT /api/albums/:id
 * Update a memory (notes, date, privacy)
 */
router.put('/:id', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!._id;
  const memoryId = req.params.id;

  const { dateTaken, notes, isPublic } = req.body;

  try {
    const memory = await TravelMemory.findOne({ _id: memoryId, userId });
    if (!memory) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    if (dateTaken !== undefined) {
      memory.dateTaken = new Date(dateTaken);
    }
    if (notes !== undefined) {
      memory.notes = String(notes).slice(0, 1000);
    }
    if (isPublic !== undefined) {
      memory.isPublic = Boolean(isPublic);
    }

    await memory.save();

    res.json({
      memory: {
        id: memory._id,
        countryCode: memory.countryCode,
        imageData: memory.imageData,
        dateTaken: memory.dateTaken,
        notes: memory.notes,
        isPublic: memory.isPublic,
        createdAt: memory.createdAt,
      },
    });
  } catch (err) {
    console.error('Update album error:', err);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

/**
 * DELETE /api/albums/:id
 * Delete a memory
 */
router.delete('/:id', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!._id;
  const memoryId = req.params.id;

  try {
    const memory = await TravelMemory.findOneAndDelete({ _id: memoryId, userId });
    if (!memory) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete album error:', err);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

/**
 * PUT /api/albums/settings/privacy
 * Update user's album privacy setting
 */
router.put('/settings/privacy', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!._id;
  const { albumsPublic } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { albumsPublic: Boolean(albumsPublic) },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ albumsPublic: user.albumsPublic });
  } catch (err) {
    console.error('Update privacy error:', err);
    res.status(500).json({ error: 'Failed to update privacy setting' });
  }
});

export default router;

