/**
 * Auth API — all operations go through the backend.
 * The JWT token is stored in localStorage to persist sessions across page reloads.
 */

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  visitedCountries: string[];
  wishlistCountries: string[];
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

import { API_BASE } from './config';

// ---------- Helpers ----------

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const status = `${res.status} ${res.statusText}`;
    const preview = text.length > 200 ? `${text.slice(0, 200)}…` : text;
    console.error('[auth]', `Invalid JSON (${status}):`, preview || '(empty)');
    throw new Error(`Invalid response from server (${status})`);
  }
}

function buildError(res: Response, data: Record<string, unknown>, fallback: string): string {
  if (res.status === 502 || res.status === 503) {
    return 'Backend not reachable. Make sure the server is running.';
  }
  const serverMsg = (data.error as string) || fallback;
  return `${serverMsg} (${res.status})`;
}

// ---------- Public API ----------

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(buildError(res, data, 'Registration failed'));
    return data as unknown as AuthResponse;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Cannot reach the server. Please try again later.');
    }
    throw err;
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(buildError(res, data, 'Login failed'));
    return data as unknown as AuthResponse;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Cannot reach the server. Please try again later.');
    }
    throw err;
  }
}

export async function getMe(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(buildError(res, data, 'Not authenticated'));
  return data as unknown as { user: AuthUser };
}

