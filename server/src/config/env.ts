import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

// Helper to parse allowed CORS origins from CLIENT_URL (supports comma-separated list of domains)
function getAllowedOrigins(): string[] {
  const envOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const merged = Array.from(new Set([...defaults, ...envOrigins]));
  return merged;
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS: getAllowedOrigins(),
  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../../data/salon_queue.sqlite'),
};
