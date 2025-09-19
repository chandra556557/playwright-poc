import { initializeDatabase, getDb } from './server/services/database.js';

async function fixSchema() {
  try {
    await initializeDatabase();
    const db = getDb();
    
    console.log('Starting schema update...');
    
    // Disable foreign key constraints
    await db.run('PRAGMA foreign_keys = OFF');
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 1. Rename the old table
      await db.run('ALTER TABLE executions RENAME TO executions_old');
      
      // 2. Create the new table with the updated schema
      await db.run(`
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
      await db.run(`
        INSERT INTO executions 
        SELECT * FROM executions_old
      `);
      
      // 4. Drop the old table
      await db.run('DROP TABLE IF EXISTS executions_old');
      
      // Commit the transaction
      await db.run('COMMIT');
      
      console.log('✅ Successfully updated executions table schema');
      
    } catch (error) {
      // If anything fails, rollback the transaction
      await db.run('ROLLBACK');
      console.error('❌ Error updating schema:', error);
      throw error;
    } finally {
      // Re-enable foreign key constraints
      await db.run('PRAGMA foreign_keys = ON');
    }
    
  } catch (error) {
    console.error('❌ Failed to update schema:', error);
    process.exit(1);
  }
}

fixSchema();
