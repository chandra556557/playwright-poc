import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import ESModuleLoader from './ESModuleLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Strategy Loader Service
 * Compiles and loads TypeScript healing strategies from the strategies folder
 */
class StrategyLoader {
  constructor() {
    this.strategiesPath = path.join(__dirname, '../../strategies');
    this.compiledStrategiesPath = path.join(__dirname, '../compiled-strategies');
    this.loadedStrategies = new Map();
    this.moduleLoader = new ESModuleLoader();
  }

  /**
   * Initialize the strategy loader
   */
  async initialize() {
    try {
      // Ensure compiled strategies directory exists
      await this.ensureCompiledDirectory();
      
      // Compile TypeScript strategies
      await this.compileStrategies();
      
      // Load compiled strategies
      await this.loadCompiledStrategies();
      
      console.log(`✅ Strategy Loader initialized with ${this.loadedStrategies.size} strategies`);
    } catch (error) {
      console.error('❌ Failed to initialize Strategy Loader:', error);
      throw error;
    }
  }

  /**
   * Ensure the compiled strategies directory exists
   */
  async ensureCompiledDirectory() {
    try {
      await fs.access(this.compiledStrategiesPath);
    } catch {
      await fs.mkdir(this.compiledStrategiesPath, { recursive: true });
    }
  }

  /**
   * Compile TypeScript strategies to JavaScript
   */
  async compileStrategies() {
    try {
      console.log('🔄 Compiling TypeScript strategies...');
      
      // Get all TypeScript files in strategies directory
      const strategyFiles = await this.getStrategyFiles();
      
      if (strategyFiles.length === 0) {
        console.log('⚠️ No TypeScript strategy files found');
        return;
      }

      // Create a temporary tsconfig for compilation
      const tempTsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: this.compiledStrategiesPath,
          rootDir: this.strategiesPath,
          strict: false,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true
        },
        include: [path.join(this.strategiesPath, '*.ts')],
        exclude: ['node_modules']
      };

      const tempConfigPath = path.join(this.compiledStrategiesPath, 'tsconfig.temp.json');
      await fs.writeFile(tempConfigPath, JSON.stringify(tempTsConfig, null, 2));

      // Compile using TypeScript compiler
      try {
        execSync(`npx tsc --project "${tempConfigPath}"`, { 
          cwd: path.join(__dirname, '../..'),
          stdio: 'pipe'
        });
        console.log('✅ TypeScript strategies compiled successfully');
      } catch (compileError) {
        console.warn('⚠️ TypeScript compilation failed, attempting alternative compilation...');
        // Fallback: copy and modify files manually
        await this.fallbackCompilation(strategyFiles);
      }

      // Clean up temp config
      try {
        await fs.unlink(tempConfigPath);
      } catch {}

    } catch (error) {
      console.error('❌ Failed to compile strategies:', error);
      throw error;
    }
  }

  /**
   * Fallback compilation method
   */
  async fallbackCompilation(strategyFiles) {
    console.log('🔄 Using fallback compilation method...');
    
    for (const file of strategyFiles) {
      try {
        const tsContent = await fs.readFile(path.join(this.strategiesPath, file), 'utf8');
        
        // Simple TypeScript to JavaScript conversion
        let jsContent = tsContent
          .replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"];?/g, (match, imports, modulePath) => {
            if (modulePath === '../../types') {
              return '// Types removed for JS compatibility';
            }
            return `const { ${imports.trim()} } = require('${modulePath}');`;
          })
          .replace(/export\s+class/g, 'class')
          .replace(/: \w+\[\]/g, '')
          .replace(/: \w+/g, '')
          .replace(/\?:/g, ':')
          .replace(/<[^>]+>/g, '')
          .replace(/async\s+([\w]+)\s*\([^)]*\)\s*:\s*Promise<[^>]+>/g, 'async $1')
          .replace(/([\w]+)\s*\([^)]*\)\s*:\s*[\w<>\[\]]+/g, '$1')
          .replace(/private\s+/g, '')
          .replace(/protected\s+/g, '')
          .replace(/public\s+/g, '');

        // Add module.exports
        const className = file.replace('.ts', '').split('-').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join('') + 'Strategy';
        
        jsContent += `\n\nmodule.exports = { ${className} };`;

        const jsFile = file.replace('.ts', '.js');
        await fs.writeFile(path.join(this.compiledStrategiesPath, jsFile), jsContent);
        
        console.log(`✅ Compiled ${file} -> ${jsFile}`);
      } catch (error) {
        console.warn(`⚠️ Failed to compile ${file}:`, error.message);
      }
    }
  }

  /**
   * Get all TypeScript strategy files
   */
  async getStrategyFiles() {
    try {
      const files = await fs.readdir(this.strategiesPath);
      return files.filter(file => 
        file.endsWith('.ts') && 
        !file.includes('base-strategy') && 
        !file.includes('.d.ts')
      );
    } catch (error) {
      console.warn('⚠️ Could not read strategies directory:', error.message);
      return [];
    }
  }

  /**
   * Load compiled JavaScript strategies
   */
  async loadCompiledStrategies() {
    try {
      const compiledFiles = await fs.readdir(this.compiledStrategiesPath);
      const jsFiles = compiledFiles.filter(file => 
        file.endsWith('.js') && 
        !file.includes('base-strategy') &&
        !file.includes('tsconfig')
      );

      for (const file of jsFiles) {
        try {
          const filePath = path.join(this.compiledStrategiesPath, file);
          
          // Use ESModuleLoader for proper module loading
          let strategyModule;
          try {
            strategyModule = await this.moduleLoader.loadStrategyModule(filePath);
          } catch (error) {
            console.warn(`Failed to load strategy ${file}:`, error.message);
            continue;
          }
          const strategyName = file.replace('.js', '');
          
          // Find the strategy class in the module
          const StrategyClass = Object.values(strategyModule).find(exp => 
            typeof exp === 'function' && exp.name.includes('Strategy')
          );

          if (StrategyClass) {
            this.loadedStrategies.set(strategyName, StrategyClass);
            console.log(`✅ Loaded strategy: ${strategyName}`);
          } else {
            console.warn(`⚠️ No strategy class found in ${file}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load strategy ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load compiled strategies:', error);
    }
  }

  /**
   * Get all loaded strategies
   */
  getLoadedStrategies() {
    return this.loadedStrategies;
  }

  /**
   * Get a specific strategy by name
   */
  getStrategy(name) {
    return this.loadedStrategies.get(name);
  }

  /**
   * Create strategy instances for a given page
   */
  createStrategyInstances(page) {
    const instances = [];
    
    for (const [name, StrategyClass] of this.loadedStrategies) {
      try {
        const instance = new StrategyClass(page);
        instances.push({
          name,
          instance,
          priority: this.getStrategyPriority(name)
        });
      } catch (error) {
        console.warn(`⚠️ Failed to create instance of ${name}:`, error.message);
      }
    }

    // Sort by priority
    return instances.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get strategy priority based on name
   */
  getStrategyPriority(name) {
    const priorities = {
      'attribute-relaxation': 90,
      'role-accessible-name': 85,
      'text-fuzzy-match': 80,
      'anchor-proximity': 75,
      'semantic-text': 70,
      'dom-structure': 65,
      'visual-similarity': 60,
      'visual-intelligence-strategy': 55
    };
    
    return priorities[name] || 50;
  }

  /**
   * Reload strategies (useful for development)
   */
  async reload() {
    this.loadedStrategies.clear();
    await this.initialize();
  }
}

export default StrategyLoader;