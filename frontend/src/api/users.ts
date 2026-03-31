import { API_BASE } from './config';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  visitedCountries: string[];
  wishlistCountries: string[];
  albumsPublic: boolean;
  followersCount: number;
  followingCount: number;
  joinedAt: string;
}

export interface UserSearchResult {
  id: string;
  email: string;
  displayName?: string;
  visitedCount: number;
  wishlistCount: number;
  albumsPublic: boolean;
  followersCount: number;
  followingCount: number;
  joinedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

export interface UserProfileData {
  user: UserProfile;
  stats: {
    visitedCount: number;
    wishlistCount: number;
    photoCount: number;
    percentage: number;
    totalCountries: number;
    followersCount: number;
    followingCount: number;
    visitedContinents: string[];
    continentCounts: Record<string, number>;
  };
  badges: Badge[];
  memories: Array<{
    id: string;
    countryCode: string;
    dateTaken: string;
    notes: string;
    isPublic: boolean;
    createdAt: string;
  }>;
  isOwnProfile: boolean;
  isFollowing: boolean;
  canViewAlbums: boolean;
}

export interface FollowUser {
  id: string;
  email: string;
  displayName?: string;
  visitedCount: number;
  followersCount: number;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error('[users] Invalid JSON:', text.slice(0, 200));
    throw new Error('Invalid response from server');
  }
}

function buildError(res: Response, data: Record<string, unknown>, fallback: string): string {
  if (res.status === 502 || res.status === 503) {
    return 'Backend not reachable. Make sure the server is running.';
  }
  return (data.error as string) || `${fallback} (${res.status})`;
}

export async function searchUsers(
  query: string,
  limit = 20
): Promise<{ users: UserSearchResult[] }> {
  if (query.length < 2) return { users: [] };
  const res = await fetch(
    `${API_BASE}/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to search users'));
  return json as unknown as { users: UserSearchResult[] };
}

export async function getFeaturedUsers(
  limit = 10
): Promise<{ users: UserSearchResult[] }> {
  const res = await fetch(`${API_BASE}/users/explore?limit=${limit}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch featured users'));
  return json as unknown as { users: UserSearchResult[] };
}

export async function getLeaderboard(
  sort: 'visited' | 'followers' = 'visited',
  limit = 20
): Promise<{ users: UserSearchResult[] }> {
  const res = await fetch(`${API_BASE}/users/leaderboard?sort=${sort}&limit=${limit}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch leaderboard'));
  return json as unknown as { users: UserSearchResult[] };
}

export async function getUserProfile(
  userId: string,
  token?: string
): Promise<UserProfileData> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/users/${userId}/profile`, { headers });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch user profile'));
  return json as unknown as UserProfileData;
}

export async function followUser(
  token: string,
  userId: string
): Promise<{ following: boolean; yourFollowingCount: number; targetFollowersCount: number }> {
  const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to follow user'));
  return json as unknown as { following: boolean; yourFollowingCount: number; targetFollowersCount: number };
}

export async function unfollowUser(
  token: string,
  userId: string
): Promise<{ following: boolean; yourFollowingCount: number; targetFollowersCount: number }> {
  const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to unfollow user'));
  return json as unknown as { following: boolean; yourFollowingCount: number; targetFollowersCount: number };
}

export async function getFollowers(
  userId: string,
  limit = 50
): Promise<{ users: FollowUser[] }> {
  const res = await fetch(`${API_BASE}/users/${userId}/followers?limit=${limit}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch followers'));
  return json as unknown as { users: FollowUser[] };
}

export async function getFollowing(
  userId: string,
  limit = 50
): Promise<{ users: FollowUser[] }> {
  const res = await fetch(`${API_BASE}/users/${userId}/following?limit=${limit}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch following'));
  return json as unknown as { users: FollowUser[] };
}
