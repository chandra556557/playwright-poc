import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixStrategyFiles() {
  const strategiesPath = path.join(__dirname, 'server/compiled-strategies');
  
  try {
    const files = await fs.readdir(strategiesPath);
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('base-strategy'));
    
    console.log(`Found ${jsFiles.length} strategy files to fix...`);
    
    for (const file of jsFiles) {
      const filePath = path.join(strategiesPath, file);
      let content = await fs.readFile(filePath, 'utf8');
      
      // Fix require statements
      content = content.replace(
        /const { BaseHealingStrategy } = require\('\.\/base-strategy'\);/g,
        "import { BaseHealingStrategy } from './base-strategy.js';"
      );
      
      // Fix module.exports
      content = content.replace(
        /module\.exports = { (\w+) };/g,
        'export { $1 };'
      );
      
      await fs.writeFile(filePath, content);
      console.log(`✅ Fixed ${file}`);
    }
    
    console.log('🎉 All strategy files fixed!');
  } catch (error) {
    console.error('❌ Error fixing strategy files:', error);
  }
}

fixStrategyFiles();
