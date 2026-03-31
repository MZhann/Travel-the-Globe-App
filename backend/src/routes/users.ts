import { Request, Response, Router, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import TravelMemory from '../models/TravelMemory';
import { optionalAuth, requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

function ensureDb(_req: Request, res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: 'Database not connected' });
    return;
  }
  next();
}

const CONTINENT_MAP: Record<string, string[]> = {
  Africa: ['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'],
  Asia: ['AF','AM','AZ','BH','BD','BT','BN','KH','CN','CY','GE','IN','ID','IR','IQ','IL','JP','JO','KZ','KW','KG','LA','LB','MY','MV','MN','MM','NP','KP','OM','PK','PS','PH','QA','SA','SG','KR','LK','SY','TJ','TH','TL','TR','TM','AE','UZ','VN','YE'],
  Europe: ['AL','AD','AT','BY','BE','BA','BG','HR','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','VA'],
  'North America': ['AG','BS','BB','BZ','CA','CR','CU','DM','DO','SV','GD','GT','HT','HN','JM','MX','NI','PA','KN','LC','VC','TT','US'],
  'South America': ['AR','BO','BR','CL','CO','EC','GY','PY','PE','SR','UY','VE'],
  Oceania: ['AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS','SB','TO','TV','VU'],
};

function getVisitedContinents(visitedCountries: string[]): string[] {
  const visited = new Set(visitedCountries);
  const continents: string[] = [];
  for (const [continent, countries] of Object.entries(CONTINENT_MAP)) {
    if (countries.some((c) => visited.has(c))) {
      continents.push(continent);
    }
  }
  return continents;
}

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

function computeBadges(stats: {
  visitedCount: number;
  wishlistCount: number;
  photoCount: number;
  followersCount: number;
  followingCount: number;
  visitedContinents: number;
}): BadgeDef[] {
  const earned: BadgeDef[] = [];
  const { visitedCount, wishlistCount, photoCount, followersCount, followingCount, visitedContinents } = stats;

  if (visitedCount >= 1)   earned.push({ id: 'first_step', name: 'First Step', icon: '👣', description: 'Visited your first country', tier: 'bronze' });
  if (visitedCount >= 5)   earned.push({ id: 'explorer', name: 'Explorer', icon: '🧭', description: 'Visited 5 countries', tier: 'bronze' });
  if (visitedCount >= 10)  earned.push({ id: 'adventurer', name: 'Adventurer', icon: '🏔️', description: 'Visited 10 countries', tier: 'silver' });
  if (visitedCount >= 25)  earned.push({ id: 'globetrotter', name: 'Globetrotter', icon: '✈️', description: 'Visited 25 countries', tier: 'silver' });
  if (visitedCount >= 50)  earned.push({ id: 'world_traveler', name: 'World Traveler', icon: '🌍', description: 'Visited 50 countries', tier: 'gold' });
  if (visitedCount >= 100) earned.push({ id: 'centurion', name: 'Centurion', icon: '🗺️', description: 'Visited 100 countries', tier: 'platinum' });
  if (visitedCount >= 150) earned.push({ id: 'legend', name: 'Legend', icon: '👑', description: 'Visited 150 countries', tier: 'diamond' });
  if (visitedCount >= 195) earned.push({ id: 'world_master', name: 'World Master', icon: '🏆', description: 'Visited every country on Earth', tier: 'diamond' });

  if (visitedContinents >= 1) earned.push({ id: 'continent_starter', name: 'Continent Starter', icon: '🌐', description: 'Visited countries on 1 continent', tier: 'bronze' });
  if (visitedContinents >= 3) earned.push({ id: 'multi_continental', name: 'Multi-Continental', icon: '🛫', description: 'Visited countries on 3 continents', tier: 'silver' });
  if (visitedContinents >= 6) earned.push({ id: 'all_continents', name: 'All Continents', icon: '🌏', description: 'Visited all 6 inhabited continents', tier: 'diamond' });

  if (photoCount >= 1)  earned.push({ id: 'photographer', name: 'Photographer', icon: '📸', description: 'Shared your first travel memory', tier: 'bronze' });
  if (photoCount >= 10) earned.push({ id: 'memory_keeper', name: 'Memory Keeper', icon: '📚', description: 'Shared 10 travel memories', tier: 'silver' });
  if (photoCount >= 50) earned.push({ id: 'storyteller', name: 'Storyteller', icon: '🎬', description: 'Shared 50 travel memories', tier: 'gold' });

  if (followersCount >= 1)  earned.push({ id: 'first_follower', name: 'First Follower', icon: '🤗', description: 'Got your first follower', tier: 'bronze' });
  if (followersCount >= 5)  earned.push({ id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', description: 'Have 5 followers', tier: 'silver' });
  if (followersCount >= 25) earned.push({ id: 'influencer', name: 'Influencer', icon: '⭐', description: 'Have 25 followers', tier: 'gold' });

  if (followingCount >= 5) earned.push({ id: 'friendly', name: 'Friendly', icon: '🤝', description: 'Following 5 travelers', tier: 'bronze' });
  if (wishlistCount >= 10)  earned.push({ id: 'dreamer', name: 'Dreamer', icon: '💭', description: 'Added 10 countries to your wishlist', tier: 'bronze' });
  if (wishlistCount >= 50)  earned.push({ id: 'big_dreamer', name: 'Big Dreamer', icon: '🌠', description: 'Added 50 countries to your wishlist', tier: 'silver' });

  return earned;
}

/**
 * GET /api/users/search
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
      .select('_id email displayName visitedCountries wishlistCountries albumsPublic followers following createdAt')
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
        followersCount: u.followers?.length ?? 0,
        followingCount: u.following?.length ?? 0,
        joinedAt: (u as { createdAt?: Date }).createdAt || new Date(),
      })),
    });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * GET /api/users/leaderboard
 * Returns top users sorted by visited countries count, with follower stats
 */
router.get('/leaderboard', ensureDb, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const sort = (req.query.sort as string) || 'visited';

  try {
    const users = await User.find({
      'visitedCountries.0': { $exists: true },
    })
      .select('_id email displayName visitedCountries wishlistCountries albumsPublic followers following createdAt')
      .lean();

    const ranked = users
      .map((u, _i) => ({
        id: u._id,
        email: u.email,
        displayName: u.displayName,
        visitedCount: u.visitedCountries?.length ?? 0,
        wishlistCount: u.wishlistCountries?.length ?? 0,
        albumsPublic: u.albumsPublic ?? false,
        followersCount: u.followers?.length ?? 0,
        followingCount: u.following?.length ?? 0,
        joinedAt: (u as { createdAt?: Date }).createdAt || new Date(),
      }))
      .sort((a, b) => {
        if (sort === 'followers') return b.followersCount - a.followersCount;
        return b.visitedCount - a.visitedCount;
      })
      .slice(0, limit);

    res.json({ users: ranked });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/users/explore
 */
router.get('/explore', ensureDb, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

  try {
    const users = await User.find({
      'visitedCountries.0': { $exists: true },
    })
      .select('_id email displayName visitedCountries wishlistCountries albumsPublic followers following createdAt')
      .lean()
      .then((users) =>
        users.sort((a, b) => {
          const aCount = a.visitedCountries?.length ?? 0;
          const bCount = b.visitedCountries?.length ?? 0;
          return bCount - aCount;
        })
      )
      .then((users) => users.slice(0, limit));

    res.json({
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        displayName: u.displayName,
        visitedCount: u.visitedCountries?.length ?? 0,
        wishlistCount: u.wishlistCountries?.length ?? 0,
        albumsPublic: u.albumsPublic ?? false,
        followersCount: u.followers?.length ?? 0,
        followingCount: u.following?.length ?? 0,
        joinedAt: (u as { createdAt?: Date }).createdAt || new Date(),
      })),
    });
  } catch (err) {
    console.error('Explore users error:', err);
    res.status(500).json({ error: 'Failed to fetch featured users' });
  }
});

/**
 * POST /api/users/:userId/follow — Follow a user
 */
router.post('/:userId/follow', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const currentUserId = String(authReq.user!._id);
  const targetUserId = req.params.userId;

  if (currentUserId === targetUserId) {
    res.status(400).json({ error: 'Cannot follow yourself' });
    return;
  }

  try {
    const target = await User.findById(targetUserId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetUserId },
    });
    await User.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: currentUserId },
    });

    const updatedCurrent = await User.findById(currentUserId).select('following').lean();
    const updatedTarget = await User.findById(targetUserId).select('followers').lean();

    res.json({
      following: true,
      yourFollowingCount: updatedCurrent?.following?.length ?? 0,
      targetFollowersCount: updatedTarget?.followers?.length ?? 0,
    });
  } catch (err) {
    console.error('Follow user error:', err);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

/**
 * DELETE /api/users/:userId/follow — Unfollow a user
 */
router.delete('/:userId/follow', ensureDb, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const currentUserId = String(authReq.user!._id);
  const targetUserId = req.params.userId;

  try {
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetUserId },
    });
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentUserId },
    });

    const updatedCurrent = await User.findById(currentUserId).select('following').lean();
    const updatedTarget = await User.findById(targetUserId).select('followers').lean();

    res.json({
      following: false,
      yourFollowingCount: updatedCurrent?.following?.length ?? 0,
      targetFollowersCount: updatedTarget?.followers?.length ?? 0,
    });
  } catch (err) {
    console.error('Unfollow user error:', err);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

/**
 * GET /api/users/:userId/followers
 */
router.get('/:userId/followers', ensureDb, async (req: Request, res: Response) => {
  const targetUserId = req.params.userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  try {
    const user = await User.findById(targetUserId).select('followers').lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const followerIds = (user.followers ?? []).slice(0, limit);
    const followers = await User.find({ _id: { $in: followerIds } })
      .select('_id email displayName visitedCountries followers')
      .lean();

    res.json({
      users: followers.map((u) => ({
        id: u._id,
        email: u.email,
        displayName: u.displayName,
        visitedCount: u.visitedCountries?.length ?? 0,
        followersCount: u.followers?.length ?? 0,
      })),
    });
  } catch (err) {
    console.error('Get followers error:', err);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

/**
 * GET /api/users/:userId/following
 */
router.get('/:userId/following', ensureDb, async (req: Request, res: Response) => {
  const targetUserId = req.params.userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  try {
    const user = await User.findById(targetUserId).select('following').lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const followingIds = (user.following ?? []).slice(0, limit);
    const followingUsers = await User.find({ _id: { $in: followingIds } })
      .select('_id email displayName visitedCountries followers')
      .lean();

    res.json({
      users: followingUsers.map((u) => ({
        id: u._id,
        email: u.email,
        displayName: u.displayName,
        visitedCount: u.visitedCountries?.length ?? 0,
        followersCount: u.followers?.length ?? 0,
      })),
    });
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

/**
 * GET /api/users/:userId/profile
 */
router.get('/:userId/profile', ensureDb, optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const targetUserId = req.params.userId;
  const currentUserId = authReq.user?._id?.toString();
  const isOwnProfile = currentUserId === targetUserId;

  try {
    const user = await User.findById(targetUserId)
      .select('_id email displayName visitedCountries wishlistCountries albumsPublic followers following createdAt')
      .lean();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let memories: unknown[] = [];
    let photoCount = 0;
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
      photoCount = userMemories.length;
    } else {
      photoCount = await TravelMemory.countDocuments({ userId: targetUserId, isPublic: true });
    }

    const totalCountries = 195;
    const visitedCount = user.visitedCountries?.length ?? 0;
    const wishlistCount = user.wishlistCountries?.length ?? 0;
    const followersCount = user.followers?.length ?? 0;
    const followingCount = user.following?.length ?? 0;
    const percentage = totalCountries > 0 ? Math.round((visitedCount / totalCountries) * 100) : 0;

    const visitedContinents = getVisitedContinents(user.visitedCountries ?? []);

    const isFollowing = currentUserId
      ? (user.followers ?? []).includes(currentUserId)
      : false;

    const badges = computeBadges({
      visitedCount,
      wishlistCount,
      photoCount,
      followersCount,
      followingCount,
      visitedContinents: visitedContinents.length,
    });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        visitedCountries: user.visitedCountries ?? [],
        wishlistCountries: user.wishlistCountries ?? [],
        albumsPublic: user.albumsPublic ?? false,
        followersCount,
        followingCount,
        joinedAt: (user as { createdAt?: Date }).createdAt || new Date(),
      },
      stats: {
        visitedCount,
        wishlistCount,
        photoCount,
        percentage,
        totalCountries,
        followersCount,
        followingCount,
        visitedContinents,
        continentCounts: Object.fromEntries(
          Object.entries(CONTINENT_MAP).map(([continent, countries]) => [
            continent,
            countries.filter((c) => (user.visitedCountries ?? []).includes(c)).length,
          ])
        ),
      },
      badges,
      memories,
      isOwnProfile,
      isFollowing,
      canViewAlbums: isOwnProfile || user.albumsPublic,
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
