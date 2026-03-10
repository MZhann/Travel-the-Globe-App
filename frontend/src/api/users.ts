/**
 * Users API — search and view other users' profiles
 */

import { API_BASE } from './config';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  visitedCountries: string[];
  wishlistCountries: string[];
  albumsPublic: boolean;
  joinedAt: string;
}

export interface UserSearchResult {
  id: string;
  email: string;
  displayName?: string;
  visitedCount: number;
  wishlistCount: number;
  albumsPublic: boolean;
  joinedAt: string;
}

export interface UserProfileData {
  user: UserProfile;
  stats: {
    visitedCount: number;
    wishlistCount: number;
    photoCount: number;
    percentage: number;
    totalCountries: number;
  };
  memories: Array<{
    id: string;
    countryCode: string;
    dateTaken: string;
    notes: string;
    isPublic: boolean;
    createdAt: string;
  }>;
  isOwnProfile: boolean;
  canViewAlbums: boolean;
}

// ---------- Helpers ----------

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

// ---------- Public API ----------

/**
 * Search for users by name or email
 */
export async function searchUsers(
  query: string,
  limit = 20
): Promise<{ users: UserSearchResult[] }> {
  if (query.length < 2) {
    return { users: [] };
  }

  const res = await fetch(
    `${API_BASE}/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to search users'));
  return json as unknown as { users: UserSearchResult[] };
}

/**
 * Get featured/explore users (most traveled)
 */
export async function getFeaturedUsers(
  limit = 10
): Promise<{ users: UserSearchResult[] }> {
  const res = await fetch(`${API_BASE}/users/explore?limit=${limit}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch featured users'));
  return json as unknown as { users: UserSearchResult[] };
}

/**
 * Get a user's public profile
 */
export async function getUserProfile(
  userId: string,
  token?: string
): Promise<UserProfileData> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/users/${userId}/profile`, { headers });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch user profile'));
  return json as unknown as UserProfileData;
}

