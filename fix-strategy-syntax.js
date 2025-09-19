import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compiledStrategiesPath = path.join(__dirname, 'server/compiled-strategies');

async function fixStrategySyntax() {
  try {
    const files = await fs.readdir(compiledStrategiesPath);
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('base-strategy'));

    console.log(`Found ${jsFiles.length} strategy files to fix...`);

    for (const file of jsFiles) {
      const filePath = path.join(compiledStrategiesPath, file);
      let content = await fs.readFile(filePath, 'utf8');

      console.log(`\n🔧 Fixing ${file}...`);

      // Convert require to import
      content = content.replace(/const \{ BaseHealingStrategy \} = require\(['"]([^'"]+)['"]\);/, 
        `import { BaseHealingStrategy } from '$1.js';`);
      
      // Convert module.exports to export
      content = content.replace(/module\.exports = \{ (\w+) \};/, 
        `export { $1 };`);

      // Fix any remaining CommonJS syntax
      content = content.replace(/require\(['"]([^'"]+)['"]\)/g, 
        `import('$1.js')`);

      // Fix specific syntax errors
      content = content.replace(/\.\.\.\s*(\w+)/g, '...$1');
      content = content.replace(/;\s*$/gm, ';');
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

      // Fix malformed ternary operators
      content = content.replace(/(\w+)\.3/g, '$1 : 0.3');
      content = content.replace(/(\w+)\.6/g, '$1 : 0.6');
      
      // Fix malformed conditions
      content = content.replace(/(\w+)\.length  w\.length > 2\)/g, '$1.length > 2');
      
      // Fix malformed selectors
      content = content.replace(/(\w+)-text\("/g, '$1:has-text("');
      
      // Fix malformed property access
      content = content.replace(/(\w+)\.originalSelector/g, '$1.originalSelector');
      content = content.replace(/(\w+)\.tagName/g, '$1.tagName');
      content = content.replace(/(\w+)\.attributes/g, '$1.attributes');
      content = content.replace(/(\w+)\.textContent/g, '$1.textContent');

      // Ensure proper semicolons and formatting
      content = content.replace(/([^;])\n/g, '$1;\n');
      content = content.replace(/;;/g, ';');

      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed ${file}`);
    }

    console.log('\n🎉 All strategy files syntax fixed!');
  } catch (error) {
    console.error('❌ Error fixing strategy files:', error);
  }
}

fixStrategySyntax();
