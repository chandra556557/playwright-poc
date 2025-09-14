import { Page } from '@playwright/test';
import { ElementContext, HealingCandidate } from '../../types';
import { BaseHealingStrategy } from './base-strategy';

export class VisualSimilarityStrategy extends BaseHealingStrategy {
  constructor(page: Page) {
    super(page, 'visual-similarity');
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    try {
      // Get visual properties of similar elements
      const candidates = await this.findVisuallySimilarElements(context);
      
      // Score and validate candidates
      const validatedCandidates: HealingCandidate[] = [];
      
      for (const candidate of candidates) {
        if (await this.validateCandidate(candidate.selector)) {
          const score = await this.scoreCandidate(candidate.selector, context, candidate.features);
          
          validatedCandidates.push(this.createCandidate(
            candidate.selector,
            score,
            candidate.features,
            `Visual similarity match: ${candidate.reasoning}`
          ));
        }
      }

      return validatedCandidates.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Error in visual similarity strategy:', error);
      return [];
    }
  }

  private async findVisuallySimilarElements(context: ElementContext): Promise<CandidateInfo[]> {
    return await this.page.evaluate((contextData) => {
      // Helper functions
      function getVisualProperties(element: Element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        return {
          width: rect.width,
          height: rect.height,
          backgroundColor: computedStyle.backgroundColor,
          color: computedStyle.color,
          fontSize: parseFloat(computedStyle.fontSize) || 0,
          fontFamily: computedStyle.fontFamily,
          fontWeight: computedStyle.fontWeight,
          borderRadius: parseFloat(computedStyle.borderRadius) || 0,
          borderWidth: parseFloat(computedStyle.borderWidth) || 0,
          borderColor: computedStyle.borderColor,
          display: computedStyle.display,
          position: computedStyle.position,
          tagName: element.tagName.toLowerCase(),
          className: element.className,
          textContent: element.textContent?.trim() || '',
          hasChildren: element.children.length > 0,
          childrenCount: element.children.length
        };
      }

      function calculateVisualSimilarity(props1: any, props2: any) {
        let score = 0;
        let totalWeight = 0;

        // Size similarity (weight: 0.35)
        const sizeWeight = 0.35;
        const sizeSimilarity = calculateSizeSimilarity(props1, props2);
        score += sizeSimilarity * sizeWeight;
        totalWeight += sizeWeight;

        // Tag similarity (weight: 0.2)
        const tagWeight = 0.2;
        const tagSimilarity = props1.tagName === props2.tagName ? 1 : 0;
        score += tagSimilarity * tagWeight;
        totalWeight += tagWeight;

        // Color similarity (weight: 0.25)
        const colorWeight = 0.25;
        const colorSimilarity = calculateColorSimilarity(props1, props2);
        score += colorSimilarity * colorWeight;
        totalWeight += colorWeight;

        // Layout similarity (weight: 0.2)
        const layoutWeight = 0.2;
        const layoutSimilarity = calculateLayoutSimilarity(props1, props2);
        score += layoutSimilarity * layoutWeight;
        totalWeight += layoutWeight;

        return totalWeight > 0 ? score / totalWeight : 0;
      }

      function calculateSizeSimilarity(props1: any, props2: any) {
        if (props1.width === 0 && props1.height === 0) return 0;
        if (props2.width === 0 && props2.height === 0) return 0;

        const widthRatio = Math.min(props1.width, props2.width) / Math.max(props1.width, props2.width);
        const heightRatio = Math.min(props1.height, props2.height) / Math.max(props1.height, props2.height);

        return (widthRatio + heightRatio) / 2;
      }

      function calculateColorSimilarity(props1: any, props2: any) {
        let matches = 0;
        let total = 0;

        if (props1.backgroundColor && props2.backgroundColor) {
          total++;
          if (props1.backgroundColor === props2.backgroundColor) matches++;
        }

        if (props1.color && props2.color) {
          total++;
          if (props1.color === props2.color) matches++;
        }

        return total > 0 ? matches / total : 0;
      }

      function calculateLayoutSimilarity(props1: any, props2: any) {
        let matches = 0;
        let total = 0;

        const layoutProps = ['display', 'position'];
        
        for (const prop of layoutProps) {
          if (props1[prop] && props2[prop]) {
            total++;
            if (props1[prop] === props2[prop]) matches++;
          }
        }

        return total > 0 ? matches / total : 0;
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
      
      const candidates: CandidateInfo[] = [];
      
      // Find all visible elements
      const allElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               window.getComputedStyle(el).visibility !== 'hidden' &&
               window.getComputedStyle(el).display !== 'none';
      });

      for (const element of allElements) {
        try {
          const visualProps = getVisualProperties(element);
          // Create a basic visual context from the provided context data
          const contextProps = {
            tagName: contextData.tagName,
            width: contextData.boundingBox?.width || 0,
            height: contextData.boundingBox?.height || 0,
            backgroundColor: contextData.computedStyles?.backgroundColor || '',
            color: contextData.computedStyles?.color || '',
            fontSize: 0,
            fontFamily: '',
            fontWeight: '',
            borderRadius: 0,
            borderWidth: 0,
            borderColor: '',
            display: contextData.computedStyles?.display || '',
            position: contextData.computedStyles?.position || '',
            className: '',
            textContent: contextData.textContent || '',
            hasChildren: false,
            childrenCount: 0
          };
          const similarity = calculateVisualSimilarity(visualProps, contextProps);
          
          if (similarity > 0.5) { // Minimum visual similarity threshold
            const selector = generateElementSelector(element);
            if (selector) {
              candidates.push({
                selector,
                features: {
                  visual: similarity,
                  attribute: 0.5, // Simplified for now
                  text: 0.5,      // Simplified for now
                  structure: 0.5  // Simplified for now
                },
                reasoning: `Visual similarity: ${(similarity * 100).toFixed(1)}%`
              });
            }
          }
        } catch (error) {
          // Skip elements that can't be analyzed
          continue;
        }
      }

      return candidates;
    }, context);
  }
}

interface CandidateInfo {
  selector: string;
  features: Record<string, number>;
  reasoning: string;
}