/**
 * Wishlist API — all operations go through the backend.
 */

import { API_BASE } from './config';

export interface WishlistResponse {
  wishlistCountries: string[];
  visitedCountries?: string[];  // returned when lists cross-update
}

export async function getWishlistCountries(token: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch wishlist');
  const data = await res.json();
  return data.wishlistCountries as string[];
}

export async function addToWishlist(token: string, iso2: string): Promise<WishlistResponse> {
  const res = await fetch(`${API_BASE}/wishlist/${iso2}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to add to wishlist');
  return res.json() as Promise<WishlistResponse>;
}

export async function removeFromWishlist(token: string, iso2: string): Promise<WishlistResponse> {
  const res = await fetch(`${API_BASE}/wishlist/${iso2}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to remove from wishlist');
  return res.json() as Promise<WishlistResponse>;
}

