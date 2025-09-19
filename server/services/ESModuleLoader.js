/**
 * ES Module Loader for Strategy Files
 * Handles dynamic loading of ES modules with proper error handling
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ESModuleLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Load a strategy module dynamically
   * @param {string} filePath - Path to the strategy file
   * @returns {Object} The loaded module
   */
  async loadStrategyModule(filePath) {
    try {
      // Check cache first
      if (this.cache.has(filePath)) {
        return this.cache.get(filePath);
      }

      // Convert Windows path to proper file:// URL
      const fileUrl = this.convertToFileUrl(filePath);
      
      // Dynamic import
      const module = await import(fileUrl);
      
      // Cache the module
      this.cache.set(filePath, module);
      
      return module;
    } catch (error) {
      console.error(`Failed to load strategy module ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Convert file path to proper file:// URL for Windows
   * @param {string} filePath - The file path
   * @returns {string} The file:// URL
   */
  convertToFileUrl(filePath) {
    if (path.isAbsolute(filePath)) {
      // Convert Windows path to file:// URL
      const normalizedPath = filePath.replace(/\\/g, '/');
      return `file:///${normalizedPath}`;
    }
    return filePath;
  }

  /**
   * Clear the module cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cached module
   * @param {string} filePath - The file path
   * @returns {Object|null} The cached module or null
   */
  getCachedModule(filePath) {
    return this.cache.get(filePath) || null;
  }
}

export default ESModuleLoader;
