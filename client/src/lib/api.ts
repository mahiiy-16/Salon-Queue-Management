/**
 * Centralized API & Socket URL resolution
 * In production (e.g. Vercel), VITE_API_URL and VITE_SOCKET_URL point to the deployed backend (e.g. on Render).
 * In local development, defaults to relative /api or http://localhost:5000.
 */

// If VITE_API_URL is set (e.g., "https://salon-queue-server.onrender.com/api" or "https://salon-queue-server.onrender.com"), normalize it.
const rawApiUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');

/**
 * Helper to build an absolute or relative API endpoint URL.
 * Example: apiEndpoint('/api/queue/all') -> "https://salon-server.onrender.com/api/queue/all" or "/api/queue/all"
 */
export function apiEndpoint(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return cleanPath;
  }
  return `${API_BASE_URL}${cleanPath}`;
}

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL || 'http://localhost:5000';
