import { initializeDatabase, getDb } from './server/services/database.js';

async function checkTables() {
  try {
    await initializeDatabase();
    const db = getDb();
    
    // Check if the executions table exists
    const tableInfo = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='executions'"
    );
    
    if (!tableInfo) {
      console.log('Executions table does not exist. Creating it now...');
      await createExecutionsTable();
    } else {
      console.log('Executions table exists. Checking schema...');
      const schema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='executions'");
      console.log('Executions table schema:');
      console.log(schema.sql);
      
      // Check if there are any records
      const count = await db.get('SELECT COUNT(*) as count FROM executions');
      console.log(`Number of records in executions table: ${count.count}`);
    }
    
    // List all tables in the database
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('\nAll tables in the database:');
    console.log(tables.map(t => t.name).join('\n'));
    
  } catch (error) {
    console.error('Error checking database tables:', error);
  }
}

async function createExecutionsTable() {
  try {
    const db = getDb();
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
    console.log('Executions table created successfully');
  } catch (error) {
    console.error('Error creating executions table:', error);
  }
}

checkTables().catch(console.error);
