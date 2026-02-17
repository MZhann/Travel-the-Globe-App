/**
 * Optional: get headers with auth token for protected API calls.
 * Usage: fetch(url, { ...authHeaders() })
 */
export function authHeaders(getToken: () => string | null): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}
