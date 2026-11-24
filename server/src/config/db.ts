import pg from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ENV } from './env.js';

const { Pool } = pg;

// Export database mode: 'postgres' | 'sqlite'
export let dbMode: 'postgres' | 'sqlite' = 'sqlite';

let pgPool: pg.Pool | null = null;
let sqliteDb: Database.Database | null = null;

if (ENV.DATABASE_URL && ENV.DATABASE_URL.trim().length > 0) {
  dbMode = 'postgres';
  const isNeon = ENV.DATABASE_URL.includes('neon.tech') || ENV.DATABASE_URL.includes('sslmode=require');
  pgPool = new Pool({
    connectionString: ENV.DATABASE_URL,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  console.log('[Database] Configured PostgreSQL database connection pool');
} else {
  dbMode = 'sqlite';
  const dbDir = path.dirname(ENV.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  sqliteDb = new Database(ENV.DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  console.log('[Database] Configured SQLite database with WAL mode at', ENV.DB_PATH);
}

// Universal query runner that translates $1, $2 to ? when in SQLite mode
export async function query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  if (dbMode === 'postgres' && pgPool) {
    const res = await pgPool.query(sql, params);
    return { rows: res.rows as T[], rowCount: res.rowCount || 0 };
  } else if (sqliteDb) {
    // Convert PostgreSQL style $1, $2, $3 to SQLite ?
    // Also convert CURRENT_DATE or DATE('now')
    let sqliteSql = sql
      .replace(/\$(\d+)/g, '?')
      .replace(/CURRENT_DATE/gi, "DATE('now')")
      .replace(/TIMESTAMPTZ/gi, 'TEXT')
      .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/ON CONFLICT \(([^)]+)\) DO UPDATE SET/gi, 'ON CONFLICT ($1) DO UPDATE SET');

    // Handle SQLite INSERT OR REPLACE if needed or run standard statement
    const trimmed = sqliteSql.trim();
    if (trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('WITH')) {
      const rows = sqliteDb.prepare(sqliteSql).all(...params) as T[];
      return { rows, rowCount: rows.length };
    } else {
      const info = sqliteDb.prepare(sqliteSql).run(...params);
      return { rows: [], rowCount: info.changes };
    }
  } else {
    throw new Error('No database connection available');
  }
}

// Single row helper
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const result = await query<T>(sql, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Direct access to pool or sqlite for transactions / direct methods if needed
export { pgPool, sqliteDb };

// Database Schema Initialization
export async function initDatabase(): Promise<void> {
  if (dbMode === 'postgres' && pgPool) {
    console.log('[Database] Initializing PostgreSQL schema & seed data...');
    // Services table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_gu VARCHAR(255) NOT NULL,
        duration INTEGER NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        description_en TEXT,
        description_gu TEXT,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Barbers table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS barbers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        chair VARCHAR(50) NOT NULL,
        specialization VARCHAR(255),
        is_on_duty INTEGER DEFAULT 1,
        is_on_break INTEGER DEFAULT 0
      );
    `);

    // Queue tickets table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS queue_tickets (
        id VARCHAR(50) PRIMARY KEY,
        token VARCHAR(20) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        preferred_barber VARCHAR(50) NOT NULL,
        assigned_barber VARCHAR(50),
        service_ids TEXT NOT NULL,
        total_duration INTEGER NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK(status IN ('Waiting', 'Called', 'In Chair', 'Done', 'Cancelled', 'No-show')) DEFAULT 'Waiting',
        created_at TIMESTAMPTZ NOT NULL,
        called_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      );
    `);

    // Settings table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Seed default services if empty
    const sCount = await pgPool.query('SELECT COUNT(*) as count FROM services');
    if (parseInt(sCount.rows[0].count, 10) === 0) {
      await pgPool.query(`
        INSERT INTO services (name_en, name_gu, duration, price, description_en, description_gu, is_active)
        VALUES 
          ('Executive Haircut', 'એક્ઝિક્યુટિવ હેરકટ', 30, 300, 'Precision haircut, wash & scalp massage', 'સચોટ હેરકટ, શેમ્પૂ અને માલિશ', 1),
          ('Royal Beard Grooming', 'રોયલ દાઢી ગ્રૂમિંગ', 20, 200, 'Hot towel steam, razor shaping & herbal oiling', 'ગરમ ટુવાલ સ્ટીમ, શેપિંગ અને ઓઇલિંગ', 1),
          ('Deep Conditioning Hair Wash', 'ડીપ કન્ડિશનિંગ હેર વૉશ', 15, 150, 'Herbal shampoo & deep conditioning treatment', 'હર્બલ શેમ્પૂ અને કન્ડિશનિંગ ટ્રીટમેન્ટ', 1),
          ('Revitalizing Facial', 'રિવાઇટલાઇઝિંગ ફેશિયલ', 35, 450, 'Charcoal scrub, detox mask & face massage', 'ચારકોલ સ્ક્રબ, ડિટોક્સ માસ્ક અને મસાજ', 1);
      `);
      console.log('[Database] Seeded default services in PostgreSQL');
    }

    // Seed default barbers if empty
    const bCount = await pgPool.query('SELECT COUNT(*) as count FROM barbers');
    if (parseInt(bCount.rows[0].count, 10) === 0) {
      await pgPool.query(`
        INSERT INTO barbers (id, name, chair, specialization, is_on_duty, is_on_break)
        VALUES
          ('vikram', 'Vikram Singh', 'Chair 1', 'Master Stylist', 1, 0),
          ('amit', 'Amit Shah', 'Chair 2', 'Beard Artisan', 1, 0),
          ('priya', 'Priya Joshi', 'Chair 3', 'Hair & Color Specialist', 1, 0),
          ('sameer', 'Sameer Khan', 'Chair 4', 'Classic Grooming', 1, 1);
      `);
      console.log('[Database] Seeded default barbers in PostgreSQL');
    }

    // Seed default settings if empty
    const setCount = await pgPool.query('SELECT COUNT(*) as count FROM settings');
    if (parseInt(setCount.rows[0].count, 10) === 0) {
      await pgPool.query(`
        INSERT INTO settings (key, value)
        VALUES 
          ('queue_open', 'true'),
          ('closing_time', '21:00');
      `);
      console.log('[Database] Seeded default settings in PostgreSQL');
    }
  } else if (sqliteDb) {
    sqliteDb.exec(`
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

      CREATE TABLE IF NOT EXISTS barbers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        chair TEXT NOT NULL,
        specialization TEXT,
        is_on_duty INTEGER DEFAULT 1,
        is_on_break INTEGER DEFAULT 0
      );

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

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const serviceCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
    if (serviceCount.count === 0) {
      const insertService = sqliteDb.prepare(`
        INSERT INTO services (name_en, name_gu, duration, price, description_en, description_gu, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `);
      insertService.run('Executive Haircut', 'એક્ઝિક્યુટિવ હેરકટ', 30, 300, 'Precision haircut, wash & scalp massage', 'સચોટ હેરકટ, શેમ્પૂ અને માલિશ');
      insertService.run('Royal Beard Grooming', 'રોયલ દાઢી ગ્રૂમિંગ', 20, 200, 'Hot towel steam, razor shaping & herbal oiling', 'ગરમ ટુવાલ સ્ટીમ, શેપિંગ અને ઓઇલિંગ');
      insertService.run('Deep Conditioning Hair Wash', 'ડીપ કન્ડિશનિંગ હેર વૉશ', 15, 150, 'Herbal shampoo & deep conditioning treatment', 'હર્બલ શેમ્પૂ અને કન્ડિશનિંગ ટ્રીટમેન્ટ');
      insertService.run('Revitalizing Facial', 'રિવાઇટલાઇઝિંગ ફેશિયલ', 35, 450, 'Charcoal scrub, detox mask & face massage', 'ચારકોલ સ્ક્રબ, ડિટોક્સ માસ્ક અને મસાજ');
    }

    const barberCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM barbers').get() as { count: number };
    if (barberCount.count === 0) {
      const insertBarber = sqliteDb.prepare(`
        INSERT INTO barbers (id, name, chair, specialization, is_on_duty, is_on_break)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertBarber.run('vikram', 'Vikram Singh', 'Chair 1', 'Master Stylist', 1, 0);
      insertBarber.run('amit', 'Amit Shah', 'Chair 2', 'Beard Artisan', 1, 0);
      insertBarber.run('priya', 'Priya Joshi', 'Chair 3', 'Hair & Color Specialist', 1, 0);
      insertBarber.run('sameer', 'Sameer Khan', 'Chair 4', 'Classic Grooming', 1, 1);
    }

    const settingsCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    if (settingsCount.count === 0) {
      const insertSetting = sqliteDb.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
      insertSetting.run('queue_open', 'true');
      insertSetting.run('closing_time', '21:00');
    }
  }
}

// Initialize database
initDatabase().catch((err) => {
  console.error('[Database] Initialization error:', err);
});

export async function checkDatabaseHealth(): Promise<{ healthy: boolean; type: string }> {
  try {
    if (dbMode === 'postgres' && pgPool) {
      const res = await pgPool.query('SELECT 1 as healthy');
      return { healthy: res.rows.length > 0, type: 'PostgreSQL (Neon)' };
    } else if (sqliteDb) {
      const res = sqliteDb.prepare('SELECT 1 as healthy').get() as { healthy: number };
      return { healthy: res.healthy === 1, type: 'SQLite (WAL)' };
    }
    return { healthy: false, type: 'None' };
  } catch (err) {
    return { healthy: false, type: dbMode };
  }
}
