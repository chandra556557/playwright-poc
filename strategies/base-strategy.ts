import { Page } from '@playwright/test';
import { ElementContext, HealingCandidate } from '../../types';

export abstract class BaseHealingStrategy {
  protected page: Page;
  protected strategyName: string;

  constructor(page: Page, strategyName: string) {
    this.page = page;
    this.strategyName = strategyName;
  }

  abstract generateCandidates(context: ElementContext): Promise<HealingCandidate[]>;

  protected async validateCandidate(selector: string): Promise<boolean> {
    try {
      const element = await this.page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  protected async scoreCandidate(
    selector: string, 
    context: ElementContext,
    features: Record<string, number>
  ): Promise<number> {
    // Base scoring algorithm - can be overridden by specific strategies
    const weights = {
      attribute: 0.3,
      text: 0.25,
      role: 0.2,
      structure: 0.15,
      visual: 0.1
    };

    let score = 0;
    for (const [feature, value] of Object.entries(features)) {
      const weight = weights[feature as keyof typeof weights] || 0.1;
      score += weight * value;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  protected calculateAttributeSimilarity(
    candidateAttrs: Record<string, string>,
    originalAttrs: Record<string, string>
  ): number {
    const importantAttrs = ['id', 'data-testid', 'name', 'type', 'role', 'aria-label'];
    let matches = 0;
    let total = 0;

    for (const attr of importantAttrs) {
      if (originalAttrs[attr]) {
        total++;
        if (candidateAttrs[attr] === originalAttrs[attr]) {
          matches++;
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  protected calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 && !text2) return 1;
    if (!text1 || !text2) return 0;

    const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);

    if (norm1 === norm2) return 1;

    // Simple fuzzy matching - can be enhanced with Levenshtein distance
    const words1 = norm1.split(' ');
    const words2 = norm2.split(' ');
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  protected async getCandidateContext(selector: string): Promise<Partial<ElementContext> | null> {
    try {
      const element = await this.page.$(selector);
      if (!element) return null;

      const [tagName, attributes, textContent, isVisible] = await Promise.all([
        element.evaluate((el: Element) => el.tagName.toLowerCase()),
        element.evaluate((el: Element) => {
          const attrs: Record<string, string> = {};
          for (const attr of Array.from(el.attributes)) {
            attrs[attr.name] = attr.value;
          }
          return attrs;
        }),
        element.evaluate((el: Element) => el.textContent?.trim() || ''),
        element.isVisible()
      ]);

      return {
        tagName,
        attributes,
        textContent,
        isVisible
      };
    } catch {
      return null;
    }
  }

  protected createCandidate(
    selector: string,
    score: number,
    features: Record<string, number>,
    reasoning: string
  ): HealingCandidate {
    return {
      selector,
      strategy: this.strategyName,
      score,
      confidence: score,
      features,
      reasoning
    };
  }
}