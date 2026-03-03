/**
 * Albums API — CRUD operations for travel memories
 */

import { API_BASE } from './config';

export interface TravelMemory {
  id: string;
  countryCode: string;
  imageData: string;
  dateTaken: string;
  notes: string;
  isPublic: boolean;
  createdAt: string;
}

export interface AlbumUser {
  id: string;
  displayName?: string;
  visitedCount: number;
  albumsPublic?: boolean;
}

// ---------- Helpers ----------

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error('[albums] Invalid JSON:', text.slice(0, 200));
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
 * Create a new travel memory
 */
export async function createMemory(
  token: string,
  data: {
    countryCode: string;
    imageData: string;
    dateTaken: string;
    notes?: string;
    isPublic?: boolean;
  }
): Promise<{ memory: TravelMemory }> {
  const res = await fetch(`${API_BASE}/albums`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to create memory'));
  return json as unknown as { memory: TravelMemory };
}

/**
 * Get all memories for the current user
 */
export async function getMyMemories(
  token: string,
  countryCode?: string
): Promise<{ memories: TravelMemory[] }> {
  const url = countryCode
    ? `${API_BASE}/albums?countryCode=${encodeURIComponent(countryCode)}`
    : `${API_BASE}/albums`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch memories'));
  return json as unknown as { memories: TravelMemory[] };
}

/**
 * Get memories for a specific user (for profile viewing)
 */
export async function getUserMemories(
  userId: string,
  token?: string
): Promise<{ memories: TravelMemory[]; isPrivate: boolean; user: AlbumUser }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/albums/user/${userId}`, { headers });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to fetch user memories'));
  return json as unknown as { memories: TravelMemory[]; isPrivate: boolean; user: AlbumUser };
}

/**
 * Update a memory
 */
export async function updateMemory(
  token: string,
  memoryId: string,
  data: {
    dateTaken?: string;
    notes?: string;
    isPublic?: boolean;
  }
): Promise<{ memory: TravelMemory }> {
  const res = await fetch(`${API_BASE}/albums/${memoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to update memory'));
  return json as unknown as { memory: TravelMemory };
}

/**
 * Delete a memory
 */
export async function deleteMemory(
  token: string,
  memoryId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/albums/${memoryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to delete memory'));
  return json as unknown as { success: boolean };
}

/**
 * Update album privacy setting
 */
export async function updateAlbumPrivacy(
  token: string,
  albumsPublic: boolean
): Promise<{ albumsPublic: boolean }> {
  const res = await fetch(`${API_BASE}/albums/settings/privacy`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ albumsPublic }),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, json, 'Failed to update privacy'));
  return json as unknown as { albumsPublic: boolean };
}

/**
 * Helper to convert file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

