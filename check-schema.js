import { initializeDatabase, getDb } from './server/services/database.js';

async function checkSchema() {
  try {
    await initializeDatabase();
    const db = getDb();
    
    console.log('Checking database schema...');
    
    // Check migrations table
    const migrations = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'");
    console.log('Migrations table exists:', migrations.length > 0);
    
    // Check executions table schema
    const executionsSchema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='executions'");
    console.log('Executions table schema:');
    console.log(executionsSchema ? executionsSchema.sql : 'Executions table not found');
    
    // List all tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('\nAll tables:');
    console.log(tables.map(t => t.name).join('\n'));
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();
