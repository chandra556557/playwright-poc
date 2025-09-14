const { Page } = require('@playwright/test');
// Types removed for JS compatibility
const { BaseHealingStrategy } = require('./base-strategy');

class VisualSimilarityStrategy extends BaseHealingStrategy {
  constructor(page) {
    super(page, 'visual-similarity');
  }

  async generateCandidates(context) {
    try {
      // Get visual properties of similar elements
      const candidates = await this.findVisuallySimilarElements(context);
      
      // Score and validate candidates
      const validatedCandidates = [];
      
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

  async findVisuallySimilarElements(context) {
    return await this.page.evaluate((contextData) => {
      // Helper functions
      function getVisualProperties(element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        return {
          width.width,
          height.height,
          backgroundColor.backgroundColor,
          color.color,
          fontSize(computedStyle.fontSize) || 0,
          fontFamily.fontFamily,
          fontWeight.fontWeight,
          borderRadius(computedStyle.borderRadius) || 0,
          borderWidth(computedStyle.borderWidth) || 0,
          borderColor.borderColor,
          display.display,
          position.position,
          tagName.tagName.toLowerCase(),
          className.className,
          textContent.textContent?.trim() || '',
          hasChildren.children.length > 0,
          childrenCount.children.length
        };
      }

      function calculateVisualSimilarity(props1, props2) {
        let score = 0;
        let totalWeight = 0;

        // Size similarity (weight.35)
        const sizeWeight = 0.35;
        const sizeSimilarity = calculateSizeSimilarity(props1, props2);
        score += sizeSimilarity * sizeWeight;
        totalWeight += sizeWeight;

        // Tag similarity (weight.2)
        const tagWeight = 0.2;
        const tagSimilarity = props1.tagName === props2.tagName ? 1 ;
        score += tagSimilarity * tagWeight;
        totalWeight += tagWeight;

        // Color similarity (weight.25)
        const colorWeight = 0.25;
        const colorSimilarity = calculateColorSimilarity(props1, props2);
        score += colorSimilarity * colorWeight;
        totalWeight += colorWeight;

        // Layout similarity (weight.2)
        const layoutWeight = 0.2;
        const layoutSimilarity = calculateLayoutSimilarity(props1, props2);
        score += layoutSimilarity * layoutWeight;
        totalWeight += layoutWeight;

        return totalWeight > 0 ? score / totalWeight ;
      }

      function calculateSizeSimilarity(props1, props2) {
        if (props1.width === 0 && props1.height === 0) return 0;
        if (props2.width === 0 && props2.height === 0) return 0;

        const widthRatio = Math.min(props1.width, props2.width) / Math.max(props1.width, props2.width);
        const heightRatio = Math.min(props1.height, props2.height) / Math.max(props1.height, props2.height);

        return (widthRatio + heightRatio) / 2;
      }

      function calculateColorSimilarity(props1, props2) {
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

        return total > 0 ? matches / total ;
      }

      function calculateLayoutSimilarity(props1, props2) {
        let matches = 0;
        let total = 0;

        const layoutProps = ['display', 'position'];
        
        for (const prop of layoutProps) {
          if (props1[prop] && props2[prop]) {
            total++;
            if (props1[prop] === props2[prop]) matches++;
          }
        }

        return total > 0 ? matches / total ;
      }

      function generateElementSelector(element) {
        if (element.id) {
          return '#' + element.id;
        }

        if (element.getAttribute('data-testid')) {
          return '[data-testid="' + element.getAttribute('data-testid') + '"]';
        }

        if (element.className) {
          const classes = element.className.split(' ').filter((c) => c.trim());
          if (classes.length > 0) {
            return '.' + classes.join('.');
          }
        }

        return element.tagName.toLowerCase();
      }
      
      const candidates = [];
      
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
            tagName.tagName,
            width.boundingBox?.width || 0,
            height.boundingBox?.height || 0,
            backgroundColor.computedStyles?.backgroundColor || '',
            color.computedStyles?.color || '',
            fontSize,
            fontFamily: '',
            fontWeight: '',
            borderRadius,
            borderWidth,
            borderColor: '',
            display.computedStyles?.display || '',
            position.computedStyles?.position || '',
            className: '',
            textContent.textContent || '',
            hasChildren,
            childrenCount
          };
          const similarity = calculateVisualSimilarity(visualProps, contextProps);
          
          if (similarity > 0.5) { // Minimum visual similarity threshold
            const selector = generateElementSelector(element);
            if (selector) {
              candidates.push({
                selector,
                features: {
                  visual,
                  attribute.5, // Simplified for now
                  text.5,      // Simplified for now
                  structure.5  // Simplified for now
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
  selector;
  features;
  reasoning;
}

module.exports = { VisualSimilarityStrategy };