import { Page } from '@playwright/test';
import { ElementContext, HealingCandidate } from '../../types';
import { BaseHealingStrategy } from './base-strategy';
import { VisualIntelligenceEngine, VisualHealingCandidate } from '../../visual/visual-intelligence-engine';

export class VisualIntelligenceStrategy extends BaseHealingStrategy {
  private visualEngine: VisualIntelligenceEngine;

  constructor(page: Page) {
    super(page, 'visual-intelligence');
    this.visualEngine = new VisualIntelligenceEngine(page);
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    try {
      // Use the visual intelligence engine to find similar elements
      const visualCandidates = await this.visualEngine.findVisuallySimilarElements(
        context,
        this.getSimilarityThreshold()
      );

      // Convert visual candidates to healing candidates
      const healingCandidates: HealingCandidate[] = [];

      for (const visualCandidate of visualCandidates) {
        // Validate the candidate
        if (await this.validateCandidate(visualCandidate.selector)) {
          // Calculate enhanced confidence based on visual analysis
          const enhancedConfidence = this.calculateEnhancedConfidence(visualCandidate);
          
          healingCandidates.push({
            selector: visualCandidate.selector,
            strategy: this.strategyName,
            score: visualCandidate.score,
            confidence: enhancedConfidence,
            features: {
              visual: visualCandidate.visualSimilarity.overall,
              size: visualCandidate.visualSimilarity.size,
              color: visualCandidate.visualSimilarity.color,
              typography: visualCandidate.visualSimilarity.typography,
              layout: visualCandidate.visualSimilarity.layout,
              content: visualCandidate.visualSimilarity.content,
              shape: visualCandidate.visualSimilarity.shape,
              screenshot: visualCandidate.screenshotAnalysis ? 0.9 : 0.5,
              layoutContext: this.calculateLayoutContextScore(visualCandidate.layoutContext)
            },
            reasoning: this.generateDetailedReasoning(visualCandidate)
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
  private calculateEnhancedConfidence(candidate: VisualHealingCandidate): number {
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
    if (candidate.visualSimilarity.size < 0.5) {
      confidence *= 0.9;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate layout context score
   */
  private calculateLayoutContextScore(layoutContext: any): number {
    let score = 0;
    let factors = 0;

    // Check if element is in a reasonable position
    if (layoutContext.elementPosition) {
      factors++;
      const { x, y, width, height } = layoutContext.elementPosition;
      
      // Prefer elements that are visible and not too small
      if (width > 10 && height > 10 && x >= 0 && y >= 0) {
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
      if (siblingCount > 0 && siblingCount < 10) {
        score += 1;
      } else {
        score += 0.7;
      }
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Generate detailed reasoning for the healing suggestion
   */
  private generateDetailedReasoning(candidate: VisualHealingCandidate): string {
    const reasons: string[] = [];
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
  private getSimilarityThreshold(): number {
    // Start with a reasonable threshold
    return 0.6;
  }

  /**
   * Get maximum number of candidates to return
   */
  private getMaxCandidates(): number {
    return 5;
  }

  /**
   * Validate that a candidate selector is actually usable
   */
  protected async validateCandidate(selector: string): Promise<boolean> {
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
