const { Page } = require('@playwright/test');
// Types removed for JS compatibility
const { BaseHealingStrategy } = require('./base-strategy');
const { VisualIntelligenceEngine, VisualHealingCandidate } = require('../../visual/visual-intelligence-engine');

class VisualIntelligenceStrategy extends BaseHealingStrategy {
  visualEngine;

  constructor(page) {
    super(page, 'visual-intelligence');
    this.visualEngine = new VisualIntelligenceEngine(page);
  }

  async generateCandidates(context) {
    try {
      // Use the visual intelligence engine to find similar elements
      const visualCandidates = await this.visualEngine.findVisuallySimilarElements(
        context,
        this.getSimilarityThreshold()
      );

      // Convert visual candidates to healing candidates
      const healingCandidates = [];

      for (const visualCandidate of visualCandidates) {
        // Validate the candidate
        if (await this.validateCandidate(visualCandidate.selector)) {
          // Calculate enhanced confidence based on visual analysis
          const enhancedConfidence = this.calculateEnhancedConfidence(visualCandidate);
          
          healingCandidates.push({
            selector.selector,
            strategy.strategyName,
            score.score,
            confidence,
            features: {
              visual.visualSimilarity.overall,
              size.visualSimilarity.size,
              color.visualSimilarity.color,
              typography.visualSimilarity.typography,
              layout.visualSimilarity.layout,
              content.visualSimilarity.content,
              shape.visualSimilarity.shape,
              screenshot.screenshotAnalysis ? 0.9 .5,
              layoutContext.calculateLayoutContextScore(visualCandidate.layoutContext)
            },
            reasoning.generateDetailedReasoning(visualCandidate)
          });
        }
      }

      // Sort by confidence and return top candidates
      return healingCandidates
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.getMaxCandidates());

    } catch (error) {
      console.error('Error in visual intelligence strategy:', error);
      return [];
    }
  }

  /**
   * Calculate enhanced confidence based on multiple visual factors
   */
  calculateEnhancedConfidence(candidate) {
    let confidence = candidate.visualSimilarity.overall;

    // Boost confidence for high visual similarity
    if (candidate.visualSimilarity.overall > 0.8) {
      confidence *= 1.1;
    }

    // Boost confidence if we have screenshot analysis
    if (candidate.screenshotAnalysis) {
      confidence *= 1.05;
    }

    // Boost confidence for good layout context
    const layoutScore = this.calculateLayoutContextScore(candidate.layoutContext);
    if (layoutScore > 0.7) {
      confidence *= 1.03;
    }

    // Boost confidence for consistent typography
    if (candidate.visualSimilarity.typography > 0.8) {
      confidence *= 1.02;
    }

    // Boost confidence for good color matching
    if (candidate.visualSimilarity.color > 0.8) {
      confidence *= 1.02;
    }

    // Penalize if element is too different in size
    if (candidate.visualSimilarity.size  10 && height > 10 && x >= 0 && y >= 0) {
        score += 1;
      } else {
        score += 0.5;
      }
    }

    // Check responsive breakpoint compatibility
    if (layoutContext.responsiveBreakpoint) {
      factors++;
      // Prefer elements that work across breakpoints
      if (['desktop', 'tablet', 'mobile'].includes(layoutContext.responsiveBreakpoint)) {
        score += 1;
      }
    }

    // Check if element has reasonable siblings
    if (layoutContext.siblingElements) {
      factors++;
      // Prefer elements with some siblings (not too isolated, not too crowded)
      const siblingCount = layoutContext.siblingElements.length;
      if (siblingCount > 0 && siblingCount  0 ? score / factors .5;
  }

  /**
   * Generate detailed reasoning for the healing suggestion
   */
  generateDetailedReasoning(candidate) {
    const reasons = [];
    const similarity = candidate.visualSimilarity;

    // Overall similarity
    reasons.push(`Overall visual similarity: ${(similarity.overall * 100).toFixed(1)}%`);

    // Specific similarity factors
    if (similarity.size > 0.7) {
      reasons.push(`Size similarity: ${(similarity.size * 100).toFixed(1)}%`);
    }
    if (similarity.color > 0.7) {
      reasons.push(`Color similarity: ${(similarity.color * 100).toFixed(1)}%`);
    }
    if (similarity.typography > 0.7) {
      reasons.push(`Typography similarity: ${(similarity.typography * 100).toFixed(1)}%`);
    }
    if (similarity.layout > 0.7) {
      reasons.push(`Layout similarity: ${(similarity.layout * 100).toFixed(1)}%`);
    }
    if (similarity.content > 0.7) {
      reasons.push(`Content similarity: ${(similarity.content * 100).toFixed(1)}%`);
    }
    if (similarity.shape > 0.7) {
      reasons.push(`Shape similarity: ${(similarity.shape * 100).toFixed(1)}%`);
    }

    // Additional factors
    if (candidate.screenshotAnalysis) {
      reasons.push('Screenshot analysis available');
    }

    // Layout context factors
    if (candidate.layoutContext.responsiveBreakpoint) {
      reasons.push(`Responsive: ${candidate.layoutContext.responsiveBreakpoint}`);
    }

    if (candidate.visualFeatures.hasIcon) {
      reasons.push('Contains icon');
    }
    if (candidate.visualFeatures.hasImage) {
      reasons.push('Contains image');
    }

    return reasons.join(', ');
  }

  /**
   * Get similarity threshold based on context
   */
  getSimilarityThreshold() {
    // Start with a reasonable threshold
    return 0.6;
  }

  /**
   * Get maximum number of candidates to return
   */
  getMaxCandidates() {
    return 5;
  }

  /**
   * Validate that a candidate selector is actually usable
   */
  async validateCandidate(selector) {
    try {
      const element = await this.page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      const isEnabled = await element.isEnabled().catch(() => false);
      
      return isVisible && isEnabled;
    } catch (error) {
      return false;
    }
  }
}


module.exports = { VisualIntelligenceStrategyStrategy };