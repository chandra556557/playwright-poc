import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export async function initializeDatabase() {
  if (db) {
    return db;
  }

  try {
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });

    console.log('Connected to the SQLite database.');

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS test_suites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS test_cases (
        id TEXT PRIMARY KEY,
        suite_id TEXT,
        name TEXT NOT NULL,
        url TEXT,
        browser TEXT,
        FOREIGN KEY(suite_id) REFERENCES test_suites(id)
      );

      CREATE TABLE IF NOT EXISTS test_steps (
        id TEXT PRIMARY KEY,
        case_id TEXT,
        type TEXT NOT NULL,
        target TEXT,
        value TEXT,
        description TEXT,
        FOREIGN KEY(case_id) REFERENCES test_cases(id)
      );

      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        suite_id TEXT NOT NULL,
        status TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        duration INTEGER,
        summary TEXT,
        reportUrl TEXT,
        FOREIGN KEY(suite_id) REFERENCES test_suites(id)
      );

      -- Persisted AI elements for self-healing
      CREATE TABLE IF NOT EXISTS ai_elements (
        id TEXT PRIMARY KEY,
        suite_id TEXT,
        url TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        locator TEXT,
        selectors TEXT, -- JSON array as TEXT
        aiSelectors TEXT, -- JSON array as TEXT (from AI)
        fallbackSelectors TEXT, -- JSON array as TEXT
        aiConfidence REAL,
        metadata TEXT, -- JSON as TEXT
        updatedAt TEXT NOT NULL,
        UNIQUE(suite_id, url, name)
      );
    `);

    console.log('Database tables are ready.');

    return db;
  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}
