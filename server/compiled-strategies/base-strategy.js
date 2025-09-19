/**
 * Base Healing Strategy - ES Module Version
 * Provides common functionality for all healing strategies
 */

export class BaseHealingStrategy {
  constructor(page, strategyName) {
    this.page = page;
    this.strategyName = strategyName;
    this.confidence = 0.0;
    this.features = {};
  }

  /**
   * Generate healing candidates for a given context
   * @param {Object} context - The healing context
   * @returns {Array} Array of candidate selectors
   */
  async generateCandidates(context) {
    throw new Error(`generateCandidates must be implemented by ${this.strategyName}`);
  }

  /**
   * Validate a candidate selector
   * @param {string} selector - The selector to validate
   * @returns {boolean} Whether the selector is valid
   */
  async validateCandidate(selector) {
    try {
      const elements = await this.page.$$(selector);
      return elements.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get context for a candidate selector
   * @param {string} selector - The selector to get context for
   * @returns {Object} Context object
   */
  async getCandidateContext(selector) {
    try {
      const element = await this.page.$(selector);
      if (!element) return null;

      const [tagName, attributes, textContent] = await Promise.all([
        element.evaluate((el) => el.tagName.toLowerCase()),
        element.evaluate((el) => {
          const o = {};
          for (const a of Array.from(el.attributes)) o[a.name] = a.value;
          return o;
        }),
        element.evaluate((el) => el.textContent?.trim() || '')
      ]);

      return {
        tagName,
        attributes,
        textContent,
        selector
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate attribute similarity
   * @param {Object} attrs1 - First set of attributes
   * @param {Object} attrs2 - Second set of attributes
   * @returns {number} Similarity score (0-1)
   */
  calculateAttributeSimilarity(attrs1, attrs2) {
    if (!attrs1 || !attrs2) return 0.0;
    
    const keys1 = Object.keys(attrs1);
    const keys2 = Object.keys(attrs2);
    const commonKeys = keys1.filter(key => keys2.includes(key));
    
    if (commonKeys.length === 0) return 0.0;
    
    let matches = 0;
    for (const key of commonKeys) {
      if (attrs1[key] === attrs2[key]) {
        matches++;
      }
    }
    
    return matches / Math.max(keys1.length, keys2.length);
  }

  /**
   * Calculate text similarity
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0.0;
    
    const t1 = text1.toLowerCase().trim();
    const t2 = text2.toLowerCase().trim();
    
    if (t1 === t2) return 1.0;
    if (t1.includes(t2) || t2.includes(t1)) return 0.8;
    
    // Simple word overlap calculation
    const words1 = t1.split(/\s+/);
    const words2 = t2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Score a candidate
   * @param {string} selector - The selector
   * @param {Object} context - The context
   * @param {Object} features - The features
   * @returns {number} Score (0-1)
   */
  async scoreCandidate(selector, context, features) {
    let score = 0.0;
    
    // Attribute similarity weight
    score += (features.attribute || 0.0) * 0.3;
    
    // Structure similarity weight
    score += (features.structure || 0.0) * 0.2;
    
    // Text similarity weight
    score += (features.text || 0.0) * 0.3;
    
    // Visual similarity weight
    score += (features.visual || 0.0) * 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Create a candidate object
   * @param {string} selector - The selector
   * @param {number} score - The score
   * @param {Object} features - The features
   * @param {string} description - The description
   * @returns {Object} Candidate object
   */
  createCandidate(selector, score, features, description) {
    return {
      selector,
      score,
      features,
      description,
      strategy: this.strategyName,
      confidence: score
    };
  }

  /**
   * Generate a selector for an element
   * @param {Object} element - The element handle
   * @returns {string|null} The generated selector
   */
  async generateSelectorFor(element) {
    try {
      const [tagName, attrs, txt] = await Promise.all([
        element.evaluate((el) => el.tagName.toLowerCase()),
        element.evaluate((el) => {
          const o = {};
          for (const a of Array.from(el.attributes)) o[a.name] = a.value;
          return o;
        }),
        element.evaluate((el) => el.textContent?.trim() || '')
      ]);

      if (attrs['data-testid']) return `[data-testid="${attrs['data-testid']}"]`;
      if (attrs.id) return `#${attrs.id}`;
      if (attrs.name) return `[name="${attrs.name}"]`;
      if (txt) return `${tagName}:has-text("${txt}")`;
      return null;
    } catch (error) {
      return null;
    }
  }
}
