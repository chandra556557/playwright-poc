import { fileURLToPath } from 'url';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixSchema() {
  const dbPath = path.join(__dirname, 'database.sqlite');
  console.log(`Fixing schema for: ${dbPath}`);
  
  // Open the database with a longer timeout
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
    timeout: 10000 // 10 seconds
  });
  
  try {
    // Disable foreign keys temporarily
    await db.exec('PRAGMA foreign_keys = OFF');
    
    // Create a new table with the correct schema
    console.log('Creating new executions table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS executions_new (
        id TEXT PRIMARY KEY,
        suite_id TEXT,
        status TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        duration INTEGER,
        summary TEXT,
        reportUrl TEXT,
        FOREIGN KEY(suite_id) REFERENCES test_suites(id) ON DELETE SET NULL
      )
    `);
    
    // Copy data from old table to new one
    console.log('Copying data to new table...');
    await db.exec(`
      INSERT OR IGNORE INTO executions_new 
      (id, suite_id, status, startTime, endTime, duration, summary, reportUrl)
      SELECT id, suite_id, status, startTime, endTime, duration, summary, reportUrl 
      FROM executions
    `);
    
    // Drop the old table
    console.log('Dropping old table...');
    await db.exec('DROP TABLE IF EXISTS executions');
    
    // Rename new table
    console.log('Renaming table...');
    await db.exec('ALTER TABLE executions_new RENAME TO executions');
    
    // Re-enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');
    
    console.log('✅ Schema updated successfully!');
    
    // Verify the changes
    const schema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='executions'");
    console.log('\n📋 Updated schema:');
    console.log(schema.sql);
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
  } finally {
    await db.close();
  }
}

fixSchema().catch(console.error);
