/**
 * Frontend-only auth (no backend). Users and tokens live in localStorage.
 * Use when running without the backend (e.g. only `npm run dev` in frontend).
 */
import type { AuthUser, AuthResponse } from './auth';

const USERS_KEY = 'travel_globe_users';
const TOKEN_PREFIX = 'local_';

async function hashPassword(password: string): Promise<string> {
  const buf = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName?: string;
}

function getUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function toAuthUser(u: StoredUser): AuthUser {
  return { id: u.id, email: u.email, displayName: u.displayName };
}

export async function registerLocal(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  const emailNorm = email.toLowerCase().trim();
  const users = getUsers();
  if (users.some((u) => u.email === emailNorm)) {
    throw new Error('Email already registered');
  }
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  const newUser: StoredUser = {
    id,
    email: emailNorm,
    passwordHash,
    displayName: displayName?.trim() || undefined,
  };
  saveUsers([...users, newUser]);
  const user = toAuthUser(newUser);
  const token = TOKEN_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({ id, email: emailNorm }))));
  return { user, token };
}

export async function loginLocal(email: string, password: string): Promise<AuthResponse> {
  const emailNorm = email.toLowerCase().trim();
  const users = getUsers();
  const user = users.find((u) => u.email === emailNorm);
  if (!user) throw new Error('Invalid email or password');
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error('Invalid email or password');
  const token = TOKEN_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({ id: user.id, email: user.email }))));
  return { user: toAuthUser(user), token };
}

export function getMeLocal(token: string): Promise<{ user: AuthUser }> {
  if (!token.startsWith(TOKEN_PREFIX)) {
    throw new Error('Not authenticated');
  }
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(token.slice(TOKEN_PREFIX.length))))) as {
      id: string;
      email: string;
    };
    const users = getUsers();
    const user = users.find((u) => u.id === payload.id);
    if (!user) throw new Error('User not found');
    return Promise.resolve({ user: toAuthUser(user) });
  } catch {
    throw new Error('Not authenticated');
  }
}
