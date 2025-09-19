import { fileURLToPath } from 'url';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixDatabaseSchema() {
  const dbPath = path.join(__dirname, 'database.sqlite');
  console.log(`Fixing database schema at: ${dbPath}`);
  
  let db;
  let backupDb;
  
  try {
    // Create a backup of the database
    const backupPath = path.join(__dirname, 'database.backup.sqlite');
    console.log(`Creating backup at: ${backupPath}`);
    
    // Open the source database
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Create a backup database
    backupDb = await open({
      filename: backupPath,
      driver: sqlite3.Database
    });
    
    // Get all table names
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    
    // Copy all tables to backup
    for (const table of tables) {
      console.log(`Backing up table: ${table.name}`);
      
      // Create the table in the backup database
      const createTable = await db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [table.name]);
      await backupDb.exec(createTable.sql);
      
      // Copy data
      const rows = await db.all(`SELECT * FROM ${table.name}`);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(',');
        const insert = `INSERT INTO ${table.name} (${columns.join(',')}) VALUES (${placeholders})`;
        
        for (const row of rows) {
          await backupDb.run(insert, Object.values(row));
        }
      }
    }
    
    console.log('✅ Database backup created successfully');
    
    // Now fix the schema in the main database
    console.log('\nFixing schema in the main database...');
    
    // Start a transaction
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // 1. Rename the old executions table
      await db.exec('ALTER TABLE executions RENAME TO executions_old');
      
      // 2. Create the new table with the updated schema
      await db.exec(`
        CREATE TABLE IF NOT EXISTS executions (
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
      
      // 3. Copy data from the old table to the new one
      await db.exec(`
        INSERT INTO executions (id, suite_id, status, startTime, endTime, duration, summary, reportUrl)
        SELECT id, suite_id, status, startTime, endTime, duration, summary, reportUrl 
        FROM executions_old
      `);
      
      // 4. Drop the old table
      await db.exec('DROP TABLE IF EXISTS executions_old');
      
      // Commit the transaction
      await db.exec('COMMIT');
      
      console.log('✅ Successfully updated executions table schema');
      
      // Verify the changes
      const schema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='executions'");
      console.log('\n📋 Updated executions table schema:');
      console.log(schema.sql);
      
    } catch (error) {
      // If anything fails, rollback the transaction
      await db.exec('ROLLBACK');
      console.error('❌ Error updating schema:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error during database operation:', error.message);
    process.exit(1);
  } finally {
    // Close database connections
    if (db) await db.close();
    if (backupDb) await backupDb.close();
  }
}

fixDatabaseSchema();
