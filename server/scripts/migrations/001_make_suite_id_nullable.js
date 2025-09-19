import { getDb } from '../../services/database.js';

export const description = 'Make suite_id nullable in executions table';

export async function up() {
  const db = await getDb();
  
  // Create a new table with the updated schema
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
      FOREIGN KEY(suite_id) REFERENCES test_suites(id)
    );
  `);
  
  // Copy data from old table to new table
  await db.exec(`
    INSERT INTO executions_new 
    SELECT * FROM executions;
  `);
  
  // Drop the old table
  await db.exec(`DROP TABLE executions;`);
  
  // Rename new table to original name
  await db.exec(`ALTER TABLE executions_new RENAME TO executions;`);
  
  console.log('✅ Made suite_id nullable in executions table');
}

export async function down() {
  // This migration is not easily reversible
  console.log('⚠️ This migration cannot be automatically reverted');
}
