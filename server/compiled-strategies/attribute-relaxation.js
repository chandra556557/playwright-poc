const { BaseHealingStrategy } = require('./base-strategy');
// Types removed for JS compatibility

class AttributeRelaxationStrategy extends BaseHealingStrategy {
  constructor(page) {
    super(page, 'attribute-relaxation');
  }

  async generateCandidates(context) {
    console.log('🔍 AttributeRelaxationStrategy candidates for context:', {
      originalSelector.originalSelector,
      tagName.tagName,
      attributes.attributes,
      textContent.textContent
    });
    
    const candidates = [];
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

  async findSimilarElements(context) {
    const candidates = [];
    
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

  async generateSelectorsForAttribute(
    attrName,
    attrValue,
    tagName,
    context
  ) {
    const candidates = [];
    const selectors = [];

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

  async generateMultiAttributeSelectors(context) {
    const candidates = [];
    const { attributes, tagName } = context;

    // Combine stable attributes
    const stableAttrs = ['data-testid', 'id', 'name', 'type', 'role'];
    const availableAttrs = stableAttrs.filter(attr => attributes[attr]);

    // Generate combinations of 2-3 attributes
    for (let i = 0; i  v.length > 0);
  }

  async calculateFeatures(
    original,
    candidate,
    selector
  )> {
    const features = {};

    // Check if we're working with limited context from a failed selector
    const isLimitedContext = !original.isVisible && Object.keys(original.attributes).length 
  ) {
    // Custom scoring for attribute relaxation strategy
    const weights = {
      attribute.35,
      text.15,
      tagMatch.1,
      visibility.1,
      simplicity.1,
      stability.2
    };

    let score = 0;
    for (const [feature, value] of Object.entries(features)) {
      const weight = weights[feature as keyof typeof weights] || 0.05;
      score += weight * value;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }
}

module.exports = { AttributeRelaxationStrategy };