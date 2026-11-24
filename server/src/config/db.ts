import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ENV } from './env.js';

// Ensure data directory exists
const dbDir = path.dirname(ENV.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database instance
export const db = new Database(ENV.DB_PATH);

// Enable Write-Ahead Logging (WAL) and foreign keys for high-performance concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Database Tables
export function initDatabase(): void {
  // Services Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_gu TEXT NOT NULL,
      duration INTEGER NOT NULL,
      price REAL NOT NULL,
      description_en TEXT,
      description_gu TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // Barbers Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS barbers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      chair TEXT NOT NULL,
      specialization TEXT,
      is_on_duty INTEGER DEFAULT 1,
      is_on_break INTEGER DEFAULT 0
    );
  `);

  // Queue Tickets Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue_tickets (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      preferred_barber TEXT NOT NULL,
      assigned_barber TEXT,
      service_ids TEXT NOT NULL,
      total_duration INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Waiting', 'Called', 'In Chair', 'Done', 'Cancelled', 'No-show')) DEFAULT 'Waiting',
      created_at TEXT NOT NULL,
      called_at TEXT,
      started_at TEXT,
      completed_at TEXT
    );
  `);

  // Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default services if empty
  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
  if (serviceCount.count === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (name_en, name_gu, duration, price, description_en, description_gu, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    insertService.run(
      'Executive Haircut',
      'એક્ઝિક્યુટિવ હેરકટ',
      30,
      300,
      'Precision haircut, wash & scalp massage',
      'સચોટ હેરકટ, શેમ્પૂ અને માલિશ'
    );
    insertService.run(
      'Royal Beard Grooming',
      'રોયલ દાઢી ગ્રૂમિંગ',
      20,
      200,
      'Hot towel steam, razor shaping & herbal oiling',
      'ગરમ ટુવાલ સ્ટીમ, શેપિંગ અને ઓઇલિંગ'
    );
    insertService.run(
      'Deep Conditioning Hair Wash',
      'ડીપ કન્ડિશનિંગ હેર વૉશ',
      15,
      150,
      'Herbal shampoo & deep conditioning treatment',
      'હર્બલ શેમ્પૂ અને કન્ડિશનિંગ ટ્રીટમેન્ટ'
    );
    insertService.run(
      'Revitalizing Facial',
      'રિવાઇટલાઇઝિંગ ફેશિયલ',
      35,
      450,
      'Charcoal scrub, detox mask & face massage',
      'ચારકોલ સ્ક્રબ, ડિટોક્સ માસ્ક અને મસાજ'
    );
  }

  // Seed default barbers if empty
  const barberCount = db.prepare('SELECT COUNT(*) as count FROM barbers').get() as { count: number };
  if (barberCount.count === 0) {
    const insertBarber = db.prepare(`
      INSERT INTO barbers (id, name, chair, specialization, is_on_duty, is_on_break)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertBarber.run('vikram', 'Vikram Singh', 'Chair 1', 'Master Stylist', 1, 0);
    insertBarber.run('amit', 'Amit Shah', 'Chair 2', 'Beard Artisan', 1, 0);
    insertBarber.run('priya', 'Priya Joshi', 'Chair 3', 'Hair & Color Specialist', 1, 0);
    insertBarber.run('sameer', 'Sameer Khan', 'Chair 4', 'Classic Grooming', 1, 1); // on break as per spec
  }

  // Seed default settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('queue_open', 'true');
    insertSetting.run('closing_time', '21:00');
  }
}

// Automatically initialize schema and seed data on startup
initDatabase();

export function checkDatabaseHealth(): boolean {
  try {
    const result = db.prepare('SELECT 1 as healthy').get() as { healthy: number };
    return result.healthy === 1;
  } catch {
    return false;
  }
}
