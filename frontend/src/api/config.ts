/**
 * Shared API configuration.
 *
 * In DEVELOPMENT: VITE_API_URL is empty → API_BASE = "/api"
 *   (Vite dev-server proxy forwards /api/* to http://localhost:5000)
 *
 * In PRODUCTION (Vercel): VITE_API_URL = "https://your-backend.up.railway.app"
 *   → API_BASE = "https://your-backend.up.railway.app/api"
 */
const backendUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

export const API_BASE = backendUrl ? `${backendUrl}/api` : '/api';

