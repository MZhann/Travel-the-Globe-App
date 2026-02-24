/**
 * Visited-countries API — all operations go through the backend.
 */

import { API_BASE } from './config';

export interface VisitedResponse {
  visitedCountries: string[];
  wishlistCountries?: string[];  // returned when lists cross-update
}

export async function getVisitedCountries(token: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/visited`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch visited countries');
  const data = await res.json();
  return data.visitedCountries as string[];
}

export async function markVisited(token: string, iso2: string): Promise<VisitedResponse> {
  const res = await fetch(`${API_BASE}/visited/${iso2}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to mark country as visited');
  return res.json() as Promise<VisitedResponse>;
}

export async function unmarkVisited(token: string, iso2: string): Promise<VisitedResponse> {
  const res = await fetch(`${API_BASE}/visited/${iso2}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to unmark country');
  return res.json() as Promise<VisitedResponse>;
}
