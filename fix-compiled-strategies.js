import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compiledStrategiesPath = path.join(__dirname, 'server/compiled-strategies');

async function fixCompiledStrategies() {
  try {
    const files = await fs.readdir(compiledStrategiesPath);
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('base-strategy'));

    console.log(`Found ${jsFiles.length} strategy files to fix...`);

    for (const file of jsFiles) {
      const filePath = path.join(compiledStrategiesPath, file);
      let content = await fs.readFile(filePath, 'utf8');

      console.log(`\n🔧 Fixing ${file}...`);

      // Fix common syntax errors from TypeScript compilation
      
      // Fix object property access syntax errors
      content = content.replace(/originalSelector\.originalSelector/g, 'context.originalSelector');
      content = content.replace(/tagName\.tagName/g, 'context.tagName');
      content = content.replace(/attributes\.attributes/g, 'context.attributes');
      content = content.replace(/textContent\.textContent/g, 'context.textContent');

      // Fix incomplete lines and syntax errors
      content = content.replace(/if \(!textContent \|\| textContent\.length\s+w\.length > 2\);/g, 
        'if (!textContent || textContent.length < 2) return candidates;\n    const words = textContent.split(/\\s+/).filter(w => w.length > 2);');

      // Fix import statements - convert to require for CommonJS
      content = content.replace(/import \* as (\w+) from ['"]([^'"]+)['"];/g, 
        'const $1 = require("$2");');

      // Fix export statements
      content = content.replace(/export \{ (\w+) \};/g, 'module.exports = { $1 };');

      // Fix any remaining ES6 syntax issues
      content = content.replace(/const \{ (\w+) \} = require\(['"]([^'"]+)['"]\);/g, 
        'const { $1 } = require("$2");');

      // Remove any remaining TypeScript-specific syntax
      content = content.replace(/:\s*\w+(\[\])?/g, ''); // Remove type annotations
      content = content.replace(/as\s+\w+/g, ''); // Remove 'as' type assertions

      // Fix any malformed function calls or expressions
      content = content.replace(/\.\.\.\s*(\w+)/g, '...$1'); // Fix spread operator spacing
      
      // Fix any incomplete expressions
      content = content.replace(/;\s*$/gm, ''); // Remove trailing semicolons on empty lines
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive newlines

      // Ensure proper module.exports at the end
      const strategyName = file.replace('.js', '').split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('') + 'Strategy';

      if (!content.includes('module.exports')) {
        content += `\n\nmodule.exports = { ${strategyName} };`;
      }

      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed ${file}`);
    }

    console.log('\n🎉 All compiled strategy files fixed!');
  } catch (error) {
    console.error('❌ Error fixing compiled strategy files:', error);
  }
}

fixCompiledStrategies();
