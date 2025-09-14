import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest Configuration for Test Coverage Reporting
 * 
 * This configuration extends the base Vitest setup to include:
 * - Comprehensive coverage reporting
 * - Multiple output formats
 * - Coverage thresholds
 * - Exclusion patterns
 */

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    
    // Coverage configuration
    coverage: {
      // Coverage provider
      provider: 'v8', // Use V8 for better performance and accuracy
      
      // Output directory
      reportsDirectory: './coverage',
      
      // Report formats
      reporter: [
        'text',           // Console output
        'text-summary',   // Brief summary
        'html',          // HTML report for browsers
        'lcov',          // LCOV format for CI/CD
        'json',          // JSON format for programmatic access
        'json-summary',  // JSON summary
        'cobertura',     // Cobertura XML for Jenkins/Azure DevOps
        'clover'         // Clover XML format
      ],
      
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Per-file thresholds for critical components
        './src/components/CodegenRecorder.jsx': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        },
        './src/pages/Dashboard.tsx': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        './server/services/CodegenService.js': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        './server/services/HealingEngine.js': {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      
      // Files to include in coverage
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
        'server/**/*.{js,ts}',
        '!src/**/*.d.ts',
        '!server/**/*.d.ts'
      ],
      
      // Files to exclude from coverage
      exclude: [
        // Test files
        '**/__tests__/**',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
        
        // Configuration files
        '**/vite.config.{js,ts}',
        '**/vitest.config.{js,ts}',
        '**/playwright.config.{js,ts}',
        '**/tailwind.config.{js,ts}',
        '**/postcss.config.{js,ts}',
        
        // Build and distribution files
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/node_modules/**',
        
        // Development and tooling files
        '**/.next/**',
        '**/.nuxt/**',
        '**/.vitepress/**',
        '**/storybook-static/**',
        
        // Mock and fixture files
        '**/__mocks__/**',
        '**/fixtures/**',
        '**/test-utils/**',
        
        // Entry points and configuration
        '**/main.{js,jsx,ts,tsx}',
        '**/index.html',
        '**/*.config.{js,ts}',
        
        // Type definition files
        '**/*.d.ts',
        
        // Specific exclusions
        'src/vite-env.d.ts',
        'server/types/**',
        'src/types/**'
      ],
      
      // All files should be included in coverage, even if not tested
      all: true,
      
      // Skip coverage for files with no tests
      skipFull: false,
      
      // Clean coverage directory before running
      clean: true,
      
      // Enable branch coverage
      branches: true,
      
      // Enable function coverage
      functions: true,
      
      // Enable line coverage
      lines: true,
      
      // Enable statement coverage
      statements: true
    },
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'server/**/*.{test,spec}.{js,ts}',
      'tests/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    
    // Test exclusions
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**'
    ],
    
    // Test timeout
    testTimeout: 10000,
    
    // Hook timeout
    hookTimeout: 10000,
    
    // Reporters for test results
    reporters: [
      'default',
      'verbose',
      'json',
      'junit'
    ],
    
    // Output files for reporters
    outputFile: {
      json: './test-results/results.json',
      junit: './test-results/junit.xml'
    },
    
    // Watch mode exclusions
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**'
    ],
    
    // Pool options for parallel testing
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4
      }
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@server': resolve(__dirname, './server'),
      '@tests': resolve(__dirname, './tests')
    }
  },
  
  // Define configuration
  define: {
    __TEST__: true,
    __COVERAGE__: true
  }
});