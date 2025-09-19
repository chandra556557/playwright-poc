import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

async function checkSchema() {
  try {
    console.log(`Checking database at: ${dbPath}`);
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('✅ Successfully connected to the database');
    
    // Get all tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('\n📋 All tables in the database:');
    console.log(tables.map(t => t.name).join('\n'));
    
    // Check executions table schema
    console.log('\n🔍 Executions table schema:');
    const execSchema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='executions'");
    console.log(execSchema?.sql || 'Executions table not found');
    
    // Check if suite_id is nullable
    if (execSchema) {
      const isNullable = execSchema.sql.includes('suite_id TEXT,');
      console.log('\n🔍 Is suite_id nullable?', isNullable ? '✅ Yes' : '❌ No');
    }
    
    // Check for any records in executions
    try {
      const count = await db.get('SELECT COUNT(*) as count FROM executions');
      console.log(`\n📊 Number of records in executions table: ${count.count}`);
      
      if (count.count > 0) {
        const sample = await db.get('SELECT id, suite_id, status FROM executions LIMIT 1');
        console.log('\n📝 Sample execution record:');
        console.log(sample);
      }
    } catch (err) {
      console.error('❌ Error querying executions table:', err.message);
    }
    
    // Check foreign key constraints
    const fkCheck = await db.get("PRAGMA foreign_key_check;");
    console.log('\n🔍 Foreign key check:', fkCheck || 'No issues found');
    
    // Check database integrity
    const integrity = await db.get("PRAGMA integrity_check;");
    console.log('\n🔍 Database integrity check:', integrity || 'No issues found');
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
  }
}

checkSchema();
