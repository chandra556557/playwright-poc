import { BaseHealingStrategy } from './base-strategy';
import { ElementContext, HealingCandidate } from '../../types';
import * as levenshtein from 'fast-levenshtein';

export class TextFuzzyMatchStrategy extends BaseHealingStrategy {
  constructor(page: any) {
    super(page, 'text-fuzzy-match');
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    const candidates: HealingCandidate[] = [];
    const { textContent, tagName } = context;

    if (!textContent || textContent.length < 2) {
      return candidates;
    }

    // Generate various text-based selectors
    const textSelectors = this.generateTextSelectors(textContent, tagName);
    
    for (const selector of textSelectors) {
      if (await this.validateCandidate(selector)) {
        const candidateContext = await this.getCandidateContext(selector);
        if (candidateContext) {
          const features = await this.calculateFeatures(context, candidateContext, selector);
          const score = await this.scoreCandidate(selector, context, features);
          
          candidates.push(this.createCandidate(
            selector,
            score,
            features,
            `Text-based matching: ${selector}`
          ));
        }
      }
    }

    // Find elements with similar text content
    const similarTextCandidates = await this.findSimilarTextElements(context);
    candidates.push(...similarTextCandidates);

    return candidates;
  }

  private generateTextSelectors(text: string, tagName: string): string[] {
    const selectors: string[] = [];
    const normalizedText = this.normalizeText(text);

    // Exact text match
    selectors.push(`text="${text}"`);
    selectors.push(`${tagName}:has-text("${text}")`);
    
    // Normalized text match
    if (normalizedText !== text) {
      selectors.push(`text="${normalizedText}"`);
      selectors.push(`${tagName}:has-text("${normalizedText}")`);
    }

    // Partial text matches
    const words = normalizedText.split(' ').filter(w => w.length > 2);
    for (const word of words) {
      // Playwright substring text selector (unquoted) matches partial text
      selectors.push(`text=${word}`);
      selectors.push(`${tagName}:has-text("${word}")`);
    }

    // Text variations
    const variations = this.generateTextVariations(text);
    for (const variation of variations) {
      selectors.push(`text="${variation}"`);
      selectors.push(`${tagName}:has-text("${variation}")`);
      // also try unquoted substring for each word to allow partial matches
      for (const w of this.normalizeText(variation).split(' ').filter(v => v.length > 2)) {
        selectors.push(`text=${w}`);
      }
    }

    return selectors;
  }

  private async findSimilarTextElements(context: ElementContext): Promise<HealingCandidate[]> {
    const candidates: HealingCandidate[] = [];
    const { textContent, tagName } = context;

    try {
      // Find all elements with similar tag
      const elements = await this.page.$$(tagName);
      
      for (const element of elements) {
        const elementText = await element.evaluate(el => el.textContent?.trim() || '');
        
        if (elementText && this.isTextSimilar(textContent, elementText)) {
          // Try to generate a selector for this element
          const elementSelector = await this.generateSelectorForElement(element);
          
          if (elementSelector && await this.validateCandidate(elementSelector)) {
            const candidateContext = await this.getCandidateContext(elementSelector);
            if (candidateContext) {
              const features = await this.calculateFeatures(context, candidateContext, elementSelector);
              const score = await this.scoreCandidate(elementSelector, context, features);
              
              candidates.push(this.createCandidate(
                elementSelector,
                score,
                features,
                `Similar text content: "${elementText}"`
              ));
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error finding similar text elements:', error);
    }

    return candidates;
  }

  private async generateSelectorForElement(element: any): Promise<string | null> {
    try {
      const [tagName, attributes, textContent] = await Promise.all([
        element.evaluate((el: Element) => el.tagName.toLowerCase()),
        element.evaluate((el: Element) => {
          const attrs: Record<string, string> = {};
          for (const attr of Array.from(el.attributes)) {
            attrs[attr.name] = attr.value;
          }
          return attrs;
        }),
        element.evaluate((el: Element) => el.textContent?.trim() || '')
      ]);

      // Prefer stable attributes
      if (attributes['data-testid']) {
        return `[data-testid="${attributes['data-testid']}"]`;
      }
      if (attributes.id) {
        return `#${attributes.id}`;
      }
      if (attributes.name) {
        return `[name="${attributes.name}"]`;
      }
      
      // Fall back to text selector
      if (textContent) {
        return `${tagName}:has-text("${textContent}")`;
      }

      return null;
    } catch {
      return null;
    }
  }

  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[()\[\]{}]/g, '') // drop brackets/parentheses
      .replace(/[^\w\s]/g, '')
      .toLowerCase();
  }

  private generateTextVariations(text: string): string[] {
    const variations: string[] = [];
    
    // Case variations
    variations.push(text.toLowerCase());
    variations.push(text.toUpperCase());
    variations.push(this.toTitleCase(text));
    
    // Whitespace variations
    variations.push(text.replace(/\s+/g, ' ').trim());
    variations.push(text.replace(/\s/g, ''));
    
    // Punctuation variations
    variations.push(text.replace(/[^\w\s]/g, ''));
    variations.push(text.replace(/[.,!?;:]/g, ''));
    
    // Common abbreviations and expansions (extend set)
    const commonReplacements: [string, string][] = [
      ['&', 'and'],
      ['@', 'at'],
      ['%', 'percent'],
      ['$', 'dollar'],
      ['+', 'plus'],
      ['document', 'doc'],
      ['cancel operation', 'cancel'],
      ['save document', 'save doc']
    ];
    
    for (const [from, to] of commonReplacements) {
      if (text.toLowerCase().includes(from)) {
        variations.push(text.replace(new RegExp(from, 'ig'), to));
      }
      if (text.toLowerCase().includes(to)) {
        variations.push(text.replace(new RegExp(to, 'ig'), from));
      }
    }
    
    return [...new Set(variations)].filter(v => v.length > 0);
  }

  private toTitleCase(text: string): string {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  private isTextSimilar(text1: string, text2: string, threshold: number = 0.65): boolean {
    if (!text1 || !text2) return false;
    
    const norm1 = this.normalizeText(text1);
    const norm2 = this.normalizeText(text2);
    
    if (norm1 === norm2) return true;

    // Word-overlap boost (handles doc/document etc.)
    const w1 = new Set(norm1.split(' ').filter(Boolean));
    const w2 = new Set(norm2.split(' ').filter(Boolean));
    const common = [...w1].filter(w => w2.has(w));
    const union = new Set([...w1, ...w2]).size || 1;
    const jaccard = common.length / union;

    // Levenshtein similarity
    const maxLength = Math.max(norm1.length, norm2.length);
    const distance = levenshtein.get(norm1, norm2);
    const levSim = maxLength > 0 ? 1 - (distance / maxLength) : 1;

    // Weighted combo
    const similarity = 0.6 * levSim + 0.4 * jaccard;
    
    return similarity >= threshold;
  }

  private async calculateFeatures(
    original: ElementContext,
    candidate: Partial<ElementContext>,
    selector: string
  ): Promise<Record<string, number>> {
    const features: Record<string, number> = {};

    // Text similarity (primary feature for this strategy)
    features.text = this.calculateTextSimilarity(
      candidate.textContent || '',
      original.textContent
    );

    // Levenshtein-based similarity
    const norm1 = this.normalizeText(original.textContent);
    const norm2 = this.normalizeText(candidate.textContent || '');
    const maxLen = Math.max(norm1.length, norm2.length);
    features.levenshtein = maxLen > 0 ? 1 - (levenshtein.get(norm1, norm2) / maxLen) : 0;

    // Tag match
    features.tagMatch = candidate.tagName === original.tagName ? 1 : 0;

    // Attribute similarity (secondary)
    features.attribute = this.calculateAttributeSimilarity(
      candidate.attributes || {},
      original.attributes
    );

    // Visibility match
    features.visibility = candidate.isVisible === original.isVisible ? 1 : 0;

    // Text length similarity
    const originalLen = original.textContent.length;
    const candidateLen = (candidate.textContent || '').length;
    features.lengthSimilarity = originalLen > 0 ? 
      1 - Math.abs(originalLen - candidateLen) / Math.max(originalLen, candidateLen) : 0;

    return features;
  }
}