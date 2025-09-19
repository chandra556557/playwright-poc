import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compiledStrategiesPath = path.join(__dirname, 'server/compiled-strategies');

async function fixAllStrategies() {
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

      // Fix syntax errors
      content = content.replace(/\.\.\.\s*(\w+)/g, '...$1');
      content = content.replace(/;\s*$/gm, ';');
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

      // Ensure proper semicolons and formatting
      content = content.replace(/([^;])\n/g, '$1;\n');
      content = content.replace(/;;/g, ';');

      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed ${file}`);
    }

    console.log('\n🎉 All strategy files converted to ES modules!');
  } catch (error) {
    console.error('❌ Error fixing strategy files:', error);
  }
}

fixAllStrategies();
