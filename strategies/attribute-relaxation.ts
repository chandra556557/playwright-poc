import { BaseHealingStrategy } from './base-strategy';
import { ElementContext, HealingCandidate } from '../../types';

export class AttributeRelaxationStrategy extends BaseHealingStrategy {
  constructor(page: any) {
    super(page, 'attribute-relaxation');
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    console.log('🔍 AttributeRelaxationStrategy: Generating candidates for context:', {
      originalSelector: context.originalSelector,
      tagName: context.tagName,
      attributes: context.attributes,
      textContent: context.textContent
    });
    
    const candidates: HealingCandidate[] = [];
    const { attributes, tagName, textContent } = context;

    // Priority order for attributes
    const attributePriority = [
      'data-testid',
      'data-test',
      'data-cy',
      'id',
      'name',
      'type',
      'role',
      'aria-label',
      'title',
      'placeholder',
      'class'
    ];

    // Generate candidates by relaxing attributes in order
    for (const attr of attributePriority) {
      if (attributes[attr]) {
        console.log(`🔍 Generating candidates for attribute: ${attr}=${attributes[attr]}`);
        const selectorCandidates = await this.generateSelectorsForAttribute(
          attr,
          attributes[attr],
          tagName,
          context
        );
        console.log(`🔍 Generated ${selectorCandidates.length} candidates for ${attr}`);
        candidates.push(...selectorCandidates);
      }
    }

    // If no candidates found from known attributes, try to find similar elements
    if (candidates.length === 0) {
      console.log('🔍 No candidates from known attributes, searching for similar elements...');
      const similarElementCandidates = await this.findSimilarElements(context);
      console.log(`🔍 Found ${similarElementCandidates.length} similar element candidates`);
      candidates.push(...similarElementCandidates);
    }

    // Generate candidates with multiple attributes
    const multiAttrCandidates = await this.generateMultiAttributeSelectors(context);
    candidates.push(...multiAttrCandidates);

    console.log(`🔍 Total candidates generated: ${candidates.length}`);
    return candidates;
  }

  private async findSimilarElements(context: ElementContext): Promise<HealingCandidate[]> {
    const candidates: HealingCandidate[] = [];
    
    // Extract potential identifying information from the original selector
    const originalSelector = context.originalSelector;
    
    // If original selector was an ID, try to find elements with similar text or data attributes
    if (originalSelector.startsWith('#')) {
      const idValue = originalSelector.substring(1);
      
      // Look for elements with data-testid that might correspond to this ID
      const testIdVariations = [
        idValue,
        idValue.replace(/-/g, ''),
        idValue.replace(/-btn$/, '-button'),
        idValue.replace(/-button$/, '-btn'),
        idValue.replace(/btn$/, 'button'),
        idValue.replace(/button$/, 'btn')
      ];
      
      for (const testId of testIdVariations) {
        const selector = `[data-testid="${testId}"]`;
        console.log(`🔍 Trying data-testid variation: ${selector}`);
        if (await this.validateCandidate(selector)) {
          const candidateContext = await this.getCandidateContext(selector);
          if (candidateContext) {
            const features = await this.calculateFeatures(context, candidateContext, selector);
            const score = await this.scoreCandidate(selector, context, features);
            
            candidates.push(this.createCandidate(
              selector,
              score,
              features,
              `Similar element found via data-testid: ${testId}`
            ));
            console.log(`🔍 Found similar element: ${selector}`);
          }
        }
      }
      
      // Also try to find buttons with similar text content
      const buttonTextVariations = [
        'Click Me',
        'Submit',
        'Button',
        'Click'
      ];
      
      for (const text of buttonTextVariations) {
        const selector = `button:has-text("${text}")`;
        console.log(`🔍 Trying button text variation: ${selector}`);
        if (await this.validateCandidate(selector)) {
          const candidateContext = await this.getCandidateContext(selector);
          if (candidateContext) {
            const features = await this.calculateFeatures(context, candidateContext, selector);
            const score = await this.scoreCandidate(selector, context, features);
            
            candidates.push(this.createCandidate(
              selector,
              score,
              features,
              `Similar element found via text content: ${text}`
            ));
            console.log(`🔍 Found similar element: ${selector}`);
          }
        }
      }
    }
    
    return candidates;
  }

  private async generateSelectorsForAttribute(
    attrName: string,
    attrValue: string,
    tagName: string,
    context: ElementContext
  ): Promise<HealingCandidate[]> {
    const candidates: HealingCandidate[] = [];
    const selectors: string[] = [];

    // Exact match
    selectors.push(`[${attrName}="${attrValue}"]`);
    selectors.push(`${tagName}[${attrName}="${attrValue}"]`);

    // Partial matches for certain attributes
    if (['class', 'data-testid', 'id'].includes(attrName)) {
      // Contains match
      selectors.push(`[${attrName}*="${attrValue}"]`);
      
      // Starts with match
      selectors.push(`[${attrName}^="${attrValue}"]`);
      
      // Word match (for classes)
      if (attrName === 'class') {
        const classes = attrValue.split(' ').filter(c => c.trim());
        for (const cls of classes) {
          selectors.push(`.${cls}`);
          selectors.push(`${tagName}.${cls}`);
        }
      }
    }

    // Fuzzy matching for text-based attributes
    if (['title', 'placeholder', 'aria-label'].includes(attrName)) {
      const variations = this.generateTextVariations(attrValue);
      for (const variation of variations) {
        selectors.push(`[${attrName}="${variation}"]`);
      }
    }

    // Validate and score candidates
    for (const selector of selectors) {
      if (await this.validateCandidate(selector)) {
        const candidateContext = await this.getCandidateContext(selector);
        if (candidateContext) {
          const features = await this.calculateFeatures(context, candidateContext, selector);
          const score = await this.scoreCandidate(selector, context, features);
          
          candidates.push(this.createCandidate(
            selector,
            score,
            features,
            `Relaxed ${attrName} attribute matching`
          ));
        }
      }
    }

    return candidates;
  }

  private async generateMultiAttributeSelectors(context: ElementContext): Promise<HealingCandidate[]> {
    const candidates: HealingCandidate[] = [];
    const { attributes, tagName } = context;

    // Combine stable attributes
    const stableAttrs = ['data-testid', 'id', 'name', 'type', 'role'];
    const availableAttrs = stableAttrs.filter(attr => attributes[attr]);

    // Generate combinations of 2-3 attributes
    for (let i = 0; i < availableAttrs.length; i++) {
      for (let j = i + 1; j < availableAttrs.length; j++) {
        const attr1 = availableAttrs[i];
        const attr2 = availableAttrs[j];
        
        const selector = `${tagName}[${attr1}="${attributes[attr1]}"][${attr2}="${attributes[attr2]}"]`;
        
        if (await this.validateCandidate(selector)) {
          const candidateContext = await this.getCandidateContext(selector);
          if (candidateContext) {
            const features = await this.calculateFeatures(context, candidateContext, selector);
            const score = await this.scoreCandidate(selector, context, features);
            
            candidates.push(this.createCandidate(
              selector,
              score,
              features,
              `Combined ${attr1} and ${attr2} attributes`
            ));
          }
        }
      }
    }

    return candidates;
  }

  private generateTextVariations(text: string): string[] {
    const variations: string[] = [];
    
    // Trim whitespace
    variations.push(text.trim());
    
    // Case variations
    variations.push(text.toLowerCase());
    variations.push(text.toUpperCase());
    
    // Remove extra spaces
    variations.push(text.replace(/\s+/g, ' ').trim());
    
    // Remove special characters
    variations.push(text.replace(/[^\w\s]/g, '').trim());
    
    return [...new Set(variations)].filter(v => v.length > 0);
  }

  private async calculateFeatures(
    original: ElementContext,
    candidate: Partial<ElementContext>,
    selector: string
  ): Promise<Record<string, number>> {
    const features: Record<string, number> = {};

    // Check if we're working with limited context from a failed selector
    const isLimitedContext = !original.isVisible && Object.keys(original.attributes).length <= 2;

    // Attribute similarity - be more lenient for limited context
    features.attribute = this.calculateAttributeSimilarity(
      candidate.attributes || {},
      original.attributes
    );
    
    // Special boost for partial ID matches (like [id*="submit-btn"] matching submit-btn-new)
    if (selector.includes('[id*=') && original.attributes.id) {
      const idPattern = selector.match(/\[id\*="([^"]+)"\]/)?.[1];
      if (idPattern && candidate.attributes?.id?.includes(idPattern)) {
        features.attribute = Math.max(features.attribute, 0.85); // High score for partial ID matches
      }
    }
    
    if (isLimitedContext && features.attribute < 0.3) {
      features.attribute = 0.5; // Give benefit of doubt for limited context
    }

    // Text similarity - be more lenient for limited context
    features.text = this.calculateTextSimilarity(
      candidate.textContent || '',
      original.textContent
    );
    if (isLimitedContext && !original.textContent) {
      features.text = 0.7; // Assume reasonable text match when original has no text
    }

    // Tag match - boost for button elements when original context is limited
    features.tagMatch = candidate.tagName === original.tagName ? 1 : 0;
    if (isLimitedContext && candidate.tagName === 'button' && original.tagName === 'unknown') {
      features.tagMatch = 0.8; // Likely a button based on selector pattern
    }

    // Visibility match - don't penalize when original is not visible
    features.visibility = candidate.isVisible === original.isVisible ? 1 : 0;
    if (isLimitedContext && candidate.isVisible && !original.isVisible) {
      features.visibility = 0.9; // Prefer visible elements when healing
    }

    // Selector complexity (simpler is better)
    features.simplicity = Math.max(0, 1 - (selector.length / 100));

    // Stability score (prefer data-testid, id over classes)
    features.stability = this.calculateStabilityScore(selector);

    return features;
  }

  private calculateStabilityScore(selector: string): number {
    let score = 0.5; // Base score

    if (selector.includes('data-testid')) score += 0.4;
    else if (selector.includes('data-test')) score += 0.35;
    else if (selector.includes('data-cy')) score += 0.35;
    else if (selector.includes('#')) score += 0.3; // ID
    else if (selector.includes('[name=')) score += 0.25;
    else if (selector.includes('[type=')) score += 0.2;
    else if (selector.includes('[role=')) score += 0.2;
    else if (selector.includes('.')) score += 0.1; // Class

    // Penalize complex selectors
    const complexity = (selector.match(/[\[\]\.#]/g) || []).length;
    score -= complexity * 0.05;

    return Math.max(0, Math.min(1, score));
  }

  protected async scoreCandidate(
    selector: string,
    context: ElementContext,
    features: Record<string, number>
  ): Promise<number> {
    // Custom scoring for attribute relaxation strategy
    const weights = {
      attribute: 0.35,
      text: 0.15,
      tagMatch: 0.1,
      visibility: 0.1,
      simplicity: 0.1,
      stability: 0.2
    };

    let score = 0;
    for (const [feature, value] of Object.entries(features)) {
      const weight = weights[feature as keyof typeof weights] || 0.05;
      score += weight * value;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }
}