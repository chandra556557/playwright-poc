import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { initializeDatabase, getDb } from '../services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  // Initialize the database first
  await initializeDatabase();
  
  const migrationFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'run-migration.js')
    .sort();

  const db = getDb();
  
  // Create migrations table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const file of migrationFiles) {
    const migrationName = path.basename(file, '.js');
    
    // Check if migration has already been run
    const existing = await db.get('SELECT * FROM migrations WHERE name = ?', [migrationName]);
    if (existing) {
      console.log(`✓ ${migrationName} (already applied)`);
      continue;
    }

    console.log(`Running migration: ${migrationName}`);
    
    try {
      const migration = await import(`./${file}`);
      await migration.up(db);
      
      // Record successful migration
      await db.run('INSERT INTO migrations (name) VALUES (?)', [migrationName]);
      console.log(`✓ ${migrationName}`);
    } catch (error) {
      console.error(`❌ Error running migration ${migrationName}:`, error);
      process.exit(1);
    }
  }

  console.log('\nAll migrations completed successfully');
  process.exit(0);
}

runMigration().catch(console.error);
