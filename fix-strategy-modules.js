import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compiledStrategiesPath = path.join(__dirname, 'server/compiled-strategies');

async function fixStrategyModules() {
  try {
    const files = await fs.readdir(compiledStrategiesPath);
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('base-strategy'));

    console.log(`Found ${jsFiles.length} strategy files to fix...`);

    for (const file of jsFiles) {
      const filePath = path.join(compiledStrategiesPath, file);
      let content = await fs.readFile(filePath, 'utf8');

      console.log(`\n🔧 Fixing ${file}...`);

      // Convert to proper ES module syntax
      content = content.replace(/const \{ BaseHealingStrategy \} = require\(['"]([^'"]+)['"]\);/, 
        `import { BaseHealingStrategy } from '$1.js';`);
      
      content = content.replace(/module\.exports = \{ (\w+) \};/, 
        `export { $1 };`);

      // Fix any remaining CommonJS syntax
      content = content.replace(/require\(['"]([^'"]+)['"]\)/g, 
        `import('$1.js')`);

      // Ensure proper semicolons and formatting
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      content = content.replace(/;\s*$/gm, ';');

      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed ${file}`);
    }

    console.log('\n🎉 All strategy files converted to ES modules!');
  } catch (error) {
    console.error('❌ Error fixing strategy files:', error);
  }
}

fixStrategyModules();
