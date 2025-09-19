/**
 * Migration to make suite_id nullable in the executions table
 */

export async function up(db) {
  console.log('Running migration: Make suite_id nullable in executions table');
  
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
      FOREIGN KEY(suite_id) REFERENCES test_suites(id) ON DELETE SET NULL
    )
  `);

  // Copy data from the old table to the new one
  await db.exec(`
    INSERT INTO executions_new 
    SELECT * FROM executions
  `);

  // Drop the old table
  await db.exec('DROP TABLE IF EXISTS executions_old');
  
  // Rename the new table to the original name
  await db.exec('ALTER TABLE executions RENAME TO executions_old');
  await db.exec('ALTER TABLE executions_new RENAME TO executions');
  
  console.log('Successfully updated executions table schema');
}

export async function down(db) {
  // Revert the changes if needed
  console.log('Reverting migration: Make suite_id non-nullable in executions table');
  
  await db.exec('DROP TABLE IF EXISTS executions_new');
  
  // If we need to rollback, we would need to restore the original schema
  // This is a simplified version - in a real scenario, you'd want to preserve data
  await db.exec(`
    CREATE TABLE IF NOT EXISTS executions_new (
      id TEXT PRIMARY KEY,
      suite_id TEXT NOT NULL,
      status TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT,
      duration INTEGER,
      summary TEXT,
      reportUrl TEXT,
      FOREIGN KEY(suite_id) REFERENCES test_suites(id)
    )
  `);
  
  // Copy data back, filtering out any null suite_ids
  await db.exec(`
    INSERT INTO executions_new 
    SELECT * FROM executions WHERE suite_id IS NOT NULL
  `);
  
  await db.exec('DROP TABLE IF EXISTS executions');
  await db.exec('ALTER TABLE executions_new RENAME TO executions');
  
  console.log('Successfully reverted executions table schema');
}
