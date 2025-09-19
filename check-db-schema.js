import { fileURLToPath } from 'url';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDatabase() {
  const dbPath = path.join(__dirname, 'database.sqlite');
  console.log(`Checking database at: ${dbPath}`);
  
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Check if the database is accessible
    console.log('✅ Successfully connected to the database');
    
    // Get the schema of the executions table
    const schema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='executions'");
    
    if (schema) {
      console.log('\n📋 Executions table schema:');
      console.log(schema.sql);
      
      // Check if suite_id is nullable
      const isNullable = schema.sql.includes('suite_id TEXT,');
      console.log('\n🔍 Is suite_id nullable?', isNullable ? '✅ Yes' : '❌ No');
      
      // Check foreign key constraint
      const hasForeignKey = schema.sql.includes('FOREIGN KEY(suite_id)');
      console.log('🔍 Has foreign key constraint on suite_id?', hasForeignKey ? '✅ Yes' : '❌ No');
      
      // Check if the foreign key has ON DELETE SET NULL
      const hasOnDeleteSetNull = schema.sql.includes('ON DELETE SET NULL');
      console.log('🔍 Has ON DELETE SET NULL?', hasOnDeleteSetNull ? '✅ Yes' : '❌ No');
    } else {
      console.error('❌ Executions table not found in the database!');
    }
    
    // Check for any existing data in the executions table
    try {
      const count = await db.get('SELECT COUNT(*) as count FROM executions');
      console.log(`\n📊 Number of records in executions table: ${count.count}`);
      
      if (count.count > 0) {
        const sample = await db.get('SELECT id, suite_id, status FROM executions LIMIT 1');
        console.log('📝 Sample execution record:');
        console.log(sample);
      }
    } catch (err) {
      console.error('❌ Error querying executions table:', err.message);
    }
    
    // List all tables in the database
    console.log('\n📋 All tables in the database:');
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log(tables.map(t => t.name).join('\n'));
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    if (error.code === 'SQLITE_CANTOPEN') {
      console.error('Could not open the database file. Make sure the path is correct and the file exists.');
    }
  }
}

checkDatabase();
