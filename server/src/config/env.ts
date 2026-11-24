import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../../data/salon_queue.sqlite'),
};
