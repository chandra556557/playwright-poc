import { Page } from '@playwright/test';
import { ElementContext, HealingCandidate } from '../../types';
import { BaseHealingStrategy } from './base-strategy';

export class DOMStructureStrategy extends BaseHealingStrategy {
  constructor(page: Page) {
    super(page, 'dom-structure');
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    try {
      // Find elements with similar DOM structure
      const candidates = await this.findStructurallySimilarElements(context);
      
      // Score and validate candidates
      const validatedCandidates: HealingCandidate[] = [];
      
      for (const candidate of candidates) {
        if (await this.validateCandidate(candidate.selector)) {
          const score = await this.scoreCandidate(candidate.selector, context, candidate.features);
          
          validatedCandidates.push(this.createCandidate(
            candidate.selector,
            score,
            candidate.features,
            `DOM structure match: ${candidate.reasoning}`
          ));
        }
      }

      return validatedCandidates.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Error in DOM structure strategy:', error);
      return [];
    }
  }

  private async findStructurallySimilarElements(context: ElementContext): Promise<StructuralCandidate[]> {
    return await this.page.evaluate((contextData) => {
      // Helper functions
      function analyzeElementStructure(element: Element) {
        return {
          tagName: element.tagName.toLowerCase(),
          parentTag: element.parentElement ? element.parentElement.tagName.toLowerCase() : null,
          childrenCount: element.children.length,
          childrenTags: Array.from(element.children).map((child: Element) => child.tagName.toLowerCase()),
          hasText: (element.textContent?.trim().length || 0) > 0,
          isInteractive: isInteractiveElement(element),
          role: element.getAttribute('role') || getImplicitRole(element)
        };
      }

      function calculateStructuralSimilarity(structure1: any, structure2: any) {
        let score = 0;
        let totalWeight = 0;

        // Tag name similarity (weight: 0.4)
        const tagWeight = 0.4;
        if (structure1.tagName === structure2.tagName) {
          score += tagWeight;
        }
        totalWeight += tagWeight;

        // Parent context similarity (weight: 0.3)
        const parentWeight = 0.3;
        if (structure1.parentTag === structure2.parentTag) {
          score += parentWeight;
        }
        totalWeight += parentWeight;

        // Interactive element similarity (weight: 0.3)
        const interactiveWeight = 0.3;
        if (structure1.isInteractive === structure2.isInteractive) {
          score += interactiveWeight;
        }
        totalWeight += interactiveWeight;

        return totalWeight > 0 ? score / totalWeight : 0;
      }

      function isInteractiveElement(element: Element) {
        const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
        
        if (interactiveTags.includes(element.tagName.toLowerCase())) {
          return true;
        }
        
        return element.hasAttribute('onclick') || 
               element.hasAttribute('href') ||
               (element as HTMLElement).tabIndex >= 0;
      }

      function getImplicitRole(element: Element) {
        const tagName = element.tagName.toLowerCase();
        const roleMap: Record<string, string> = {
          'button': 'button',
          'a': element.hasAttribute('href') ? 'link' : 'generic',
          'input': 'textbox',
          'select': 'combobox',
          'textarea': 'textbox'
        };

        return roleMap[tagName] || 'generic';
      }

      function generateElementSelector(element: Element) {
        if (element.id) {
          return '#' + element.id;
        }

        if (element.getAttribute('data-testid')) {
          return '[data-testid="' + element.getAttribute('data-testid') + '"]';
        }

        if (element.className) {
          const classes = element.className.split(' ').filter((c: string) => c.trim());
          if (classes.length > 0) {
            return '.' + classes.join('.');
          }
        }

        return element.tagName.toLowerCase();
      }

      const candidates: StructuralCandidate[] = [];
      const allElements = document.querySelectorAll('*');

      Array.from(allElements).forEach((element) => {
        try {
          const structure = analyzeElementStructure(element);
          const similarity = calculateStructuralSimilarity(structure, contextData);
          
          if (similarity > 0.4) { // Minimum structural similarity threshold
            const selector = generateElementSelector(element);
            if (selector) {
              candidates.push({
                selector,
                features: {
                  structure: similarity,
                  attribute: 0.5, // Simplified for now
                  text: 0.5,      // Simplified for now
                  role: 0.5       // Simplified for now
                },
                reasoning: `Structural similarity: ${(similarity * 100).toFixed(1)}%`
              });
            }
          }
        } catch (error) {
          // Skip elements that can't be analyzed
        }
      });

      return candidates;
    }, context);
  }
}

// Helper functions injected into page context
const structuralHelpers = `
  function analyzeElementStructure(element) {
    return {
      tagName: element.tagName.toLowerCase(),
      attributes: this.getElementAttributes(element),
      classes: Array.from(element.classList),
      id: element.id || null,
      parentTag: element.parentElement ? element.parentElement.tagName.toLowerCase() : null,
      childrenCount: element.children.length,
      childrenTags: Array.from(element.children).map(child => child.tagName.toLowerCase()),
      siblingIndex: this.getSiblingIndex(element),
      depth: this.getElementDepth(element),
      hasText: (element.textContent?.trim().length || 0) > 0,
      isInteractive: this.isInteractiveElement(element),
      role: element.getAttribute('role') || this.getImplicitRole(element),
      ariaLabel: element.getAttribute('aria-label') || '',
      position: this.getElementPosition(element)
    };
  }

  function calculateStructuralSimilarity(structure1, structure2) {
    let score = 0;
    let totalWeight = 0;

    // Tag name similarity (weight: 0.3)
    const tagWeight = 0.3;
    if (structure1.tagName === structure2.tagName) {
      score += tagWeight;
    } else if (this.areRelatedTags(structure1.tagName, structure2.tagName)) {
      score += tagWeight * 0.7;
    }
    totalWeight += tagWeight;

    // Parent context similarity (weight: 0.2)
    const parentWeight = 0.2;
    if (structure1.parentTag === structure2.parentTag) {
      score += parentWeight;
    } else if (this.areRelatedTags(structure1.parentTag, structure2.parentTag)) {
      score += parentWeight * 0.5;
    }
    totalWeight += parentWeight;

    // Children similarity (weight: 0.2)
    const childrenWeight = 0.2;
    const childrenSimilarity = this.calculateChildrenSimilarity(
      structure1.childrenTags, 
      structure2.childrenTags
    );
    score += childrenSimilarity * childrenWeight;
    totalWeight += childrenWeight;

    // Interactive element similarity (weight: 0.15)
    const interactiveWeight = 0.15;
    if (structure1.isInteractive === structure2.isInteractive) {
      score += interactiveWeight;
    }
    totalWeight += interactiveWeight;

    // Role similarity (weight: 0.15)
    const roleWeight = 0.15;
    if (structure1.role === structure2.role) {
      score += roleWeight;
    }
    totalWeight += roleWeight;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  function calculateChildrenSimilarity(children1, children2) {
    if (children1.length === 0 && children2.length === 0) return 1;
    if (children1.length === 0 || children2.length === 0) return 0;

    const set1 = new Set(children1);
    const set2 = new Set(children2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  function areRelatedTags(tag1, tag2) {
    if (!tag1 || !tag2) return false;

    const relatedGroups = [
      ['button', 'input', 'a'],
      ['div', 'span', 'section', 'article'],
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ['ul', 'ol', 'dl'],
      ['li', 'dt', 'dd'],
      ['p', 'blockquote', 'pre'],
      ['img', 'svg', 'canvas'],
      ['table', 'thead', 'tbody', 'tfoot'],
      ['tr', 'th', 'td']
    ];

    return relatedGroups.some(group => 
      group.includes(tag1) && group.includes(tag2)
    );
  }

  function getElementAttributes(element) {
    const attrs = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  function getSiblingIndex(element) {
    if (!element.parentElement) return 0;
    return Array.from(element.parentElement.children).indexOf(element);
  }

  function getElementDepth(element) {
    let depth = 0;
    let current = element;
    while (current.parentElement) {
      depth++;
      current = current.parentElement;
      if (depth > 20) break; // Prevent infinite loops
    }
    return depth;
  }

  function isInteractiveElement(element) {
    const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
    const interactiveRoles = ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio'];
    
    if (interactiveTags.includes(element.tagName.toLowerCase())) {
      return true;
    }
    
    const role = element.getAttribute('role');
    if (role && interactiveRoles.includes(role.toLowerCase())) {
      return true;
    }
    
    return element.hasAttribute('onclick') || 
           element.hasAttribute('href') ||
           element.tabIndex >= 0;
  }

  function getImplicitRole(element) {
    const tagName = element.tagName.toLowerCase();
    const roleMap = {
      'button': 'button',
      'a': element.hasAttribute('href') ? 'link' : 'generic',
      'input': this.getInputRole(element),
      'select': 'combobox',
      'textarea': 'textbox',
      'img': element.hasAttribute('alt') ? 'img' : 'presentation',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
      'nav': 'navigation',
      'main': 'main',
      'section': 'region',
      'article': 'article',
      'aside': 'complementary',
      'header': 'banner',
      'footer': 'contentinfo'
    };

    return roleMap[tagName] || 'generic';
  }

  function getInputRole(element) {
    const type = element.getAttribute('type')?.toLowerCase() || 'text';
    const roleMap = {
      'button': 'button',
      'submit': 'button',
      'reset': 'button',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'range': 'slider',
      'text': 'textbox',
      'email': 'textbox',
      'password': 'textbox',
      'search': 'searchbox',
      'tel': 'textbox',
      'url': 'textbox'
    };

    return roleMap[type] || 'textbox';
  }

  function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    };
  }

  function calculateAttributeMatch(element, context) {
    const elementAttrs = this.getElementAttributes(element);
    
    if (!context.attributes) return 0;

    const importantAttrs = ['id', 'data-testid', 'name', 'type', 'role', 'aria-label', 'class'];
    let matches = 0;
    let total = 0;

    for (const attr of importantAttrs) {
      if (context.attributes[attr]) {
        total++;
        if (elementAttrs[attr] === context.attributes[attr]) {
          matches++;
        } else if (attr === 'class' && elementAttrs[attr] && context.attributes[attr]) {
          // Partial class matching
          const elementClasses = new Set(elementAttrs[attr].split(' '));
          const contextClasses = new Set(context.attributes[attr].split(' '));
          const intersection = new Set([...elementClasses].filter(x => contextClasses.has(x)));
          const union = new Set([...elementClasses, ...contextClasses]);
          matches += intersection.size / union.size;
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  function calculateTextMatch(element, context) {
    const elementText = element.textContent?.trim() || '';
    const contextText = context.textContent || '';

    if (!elementText && !contextText) return 1;
    if (!elementText || !contextText) return 0;

    const normalize = (str) => str.toLowerCase().trim().replace(/\\s+/g, ' ');
    const norm1 = normalize(elementText);
    const norm2 = normalize(contextText);

    if (norm1 === norm2) return 1;

    // Calculate word overlap
    const words1 = norm1.split(' ');
    const words2 = norm2.split(' ');
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  function calculateRoleMatch(element, context) {
    const elementRole = element.getAttribute('role') || this.getImplicitRole(element);
    const contextRole = context.role || context.tagName;

    if (elementRole === contextRole) return 1;

    // Related roles
    const relatedRoles = [
      ['button', 'link'],
      ['textbox', 'searchbox'],
      ['heading', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    ];

    for (const group of relatedRoles) {
      if (group.includes(elementRole) && group.includes(contextRole)) {
        return 0.7;
      }
    }

    return 0;
  }

  function generateElementSelector(element) {
    // Priority order: id > data-testid > unique class > path
    if (element.id) {
      return '#' + element.id;
    }

    if (element.getAttribute('data-testid')) {
      return '[data-testid="' + element.getAttribute('data-testid') + '"]';
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        // Check if class combination is unique
        const classSelector = '.' + classes.join('.');
        const matchingElements = document.querySelectorAll(classSelector);
        if (matchingElements.length === 1) {
          return classSelector;
        }
      }
    }

    // Generate path-based selector
    const path = [];
    let current = element;
    let depth = 0;
    
    while (current && current.parentElement && depth < 6) {
      const tagName = current.tagName.toLowerCase();
      const siblings = Array.from(current.parentElement.children).filter(
        child => child.tagName.toLowerCase() === tagName
      );
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        path.unshift(tagName + ':nth-of-type(' + index + ')');
      } else {
        path.unshift(tagName);
      }
      
      current = current.parentElement;
      depth++;
    }

    return path.join(' > ');
  }
`;

interface StructuralCandidate {
  selector: string;
  features: Record<string, number>;
  reasoning: string;
}