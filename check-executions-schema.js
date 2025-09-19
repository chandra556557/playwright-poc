import { initializeDatabase, getDb } from './server/services/database.js';

async function checkExecutionsSchema() {
  try {
    await initializeDatabase();
    const db = getDb();
    
    // Get the schema of the executions table
    const schema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='executions'");
    
    if (schema) {
      console.log('Executions table schema:');
      console.log(schema.sql);
      
      // Check if suite_id is nullable
      const isNullable = schema.sql.includes('suite_id TEXT,');
      console.log('\nIs suite_id nullable?', isNullable ? '✅ Yes' : '❌ No');
      
      // Check foreign key constraint
      const hasForeignKey = schema.sql.includes('FOREIGN KEY(suite_id)');
      console.log('Has foreign key constraint on suite_id?', hasForeignKey ? '✅ Yes' : '❌ No');
      
      // Check if the foreign key has ON DELETE SET NULL
      const hasOnDeleteSetNull = schema.sql.includes('ON DELETE SET NULL');
      console.log('Has ON DELETE SET NULL?', hasOnDeleteSetNull ? '✅ Yes' : '❌ No');
    } else {
      console.error('Executions table not found!');
    }
    
  } catch (error) {
    console.error('Error checking executions schema:', error);
  }
}

checkExecutionsSchema();
