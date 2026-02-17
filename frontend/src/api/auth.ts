/**
 * Auth API. By default uses frontend-only (localStorage) so the app works without the backend.
 * Set VITE_USE_BACKEND_AUTH=true in .env to use the real backend.
 */
import * as authLocal from './authLocal';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND_AUTH === 'true';

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  if (USE_BACKEND) return registerBackend(email, password, displayName);
  return authLocal.registerLocal(email, password, displayName);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (USE_BACKEND) return loginBackend(email, password);
  return authLocal.loginLocal(email, password);
}

export async function getMe(token: string): Promise<{ user: AuthUser }> {
  if (token.startsWith('local_')) return authLocal.getMeLocal(token);
  return getMeBackend(token);
}

// ---------- Backend (only when VITE_USE_BACKEND_AUTH=true) ----------

const API_BASE = '/api';
const BACKEND_UNREACHABLE =
  'Backend not reachable. Start it in another terminal: cd backend && npm run dev';

function responseError(res: Response, data: Record<string, unknown>, fallback: string): string {
  if (res.status === 502 || res.status === 503) return BACKEND_UNREACHABLE;
  const status = `${res.status} ${res.statusText}`;
  const serverMessage = (data.error as string) || fallback;
  return `${serverMessage} (${status})`;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const status = `${res.status} ${res.statusText}`;
    const preview = text.length > 200 ? `${text.slice(0, 200)}…` : text;
    console.error('[auth]', `Invalid JSON (${status}):`, preview || '(empty)');
    throw new Error(`Invalid response (${status})`);
  }
}

async function registerBackend(
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
    if (!res.ok) throw new Error(responseError(res, data, 'Registration failed'));
    return data as unknown as AuthResponse;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) throw new Error(BACKEND_UNREACHABLE);
    throw err;
  }
}

async function loginBackend(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(responseError(res, data, 'Login failed'));
    return data as unknown as AuthResponse;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) throw new Error(BACKEND_UNREACHABLE);
    throw err;
  }
}

async function getMeBackend(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(responseError(res, data, 'Not authenticated'));
  return data as unknown as { user: AuthUser };
}
