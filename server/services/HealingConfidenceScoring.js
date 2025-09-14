import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HealingConfidenceScoring {
  constructor() {
    this.scoringWeights = {
      selectorStability: 0.25,
      elementContext: 0.20,
      historicalSuccess: 0.20,
      browserCompatibility: 0.15,
      pageComplexity: 0.10,
      timingFactors: 0.10
    };
    
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
    
    this.dataDir = path.join(__dirname, '../data/confidence-scoring');
    this.historicalData = new Map();
    this.selectorReliability = new Map();
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadHistoricalData();
    } catch (error) {
      console.log('Initializing confidence scoring system');
    }
  }

  // Calculate overall confidence score for healing strategy
  calculateConfidenceScore(healingContext) {
    const {
      selector,
      strategy,
      elementContext,
      browserInfo,
      pageContext,
      historicalResults,
      timingContext
    } = healingContext;

    const scores = {
      selectorStability: this.scoreSelectorStability(selector, elementContext),
      elementContext: this.scoreElementContext(elementContext),
      historicalSuccess: this.scoreHistoricalSuccess(strategy, selector, historicalResults),
      browserCompatibility: this.scoreBrowserCompatibility(strategy, browserInfo),
      pageComplexity: this.scorePageComplexity(pageContext),
      timingFactors: this.scoreTimingFactors(timingContext)
    };

    // Calculate weighted confidence score
    let confidenceScore = 0;
    for (const [factor, score] of Object.entries(scores)) {
      confidenceScore += score * this.scoringWeights[factor];
    }

    // Normalize to 0-1 range
    confidenceScore = Math.max(0, Math.min(1, confidenceScore));

    return {
      overallConfidence: confidenceScore,
      confidenceLevel: this.getConfidenceLevel(confidenceScore),
      factorScores: scores,
      recommendations: this.generateRecommendations(scores, confidenceScore),
      riskFactors: this.identifyRiskFactors(scores)
    };
  }

  // Score selector stability and reliability
  scoreSelectorStability(selector, elementContext) {
    let score = 0.5; // Base score

    // ID selectors are most stable
    if (selector.includes('#') && elementContext.hasId) {
      score += 0.4;
    }

    // Data-testid selectors are very stable
    if (selector.includes('data-testid') && elementContext.hasDataTestId) {
      score += 0.35;
    }

    // Aria-label selectors are fairly stable
    if (selector.includes('aria-label') && elementContext.hasAriaLabel) {
      score += 0.25;
    }

    // Name attribute selectors
    if (selector.includes('[name=') && elementContext.hasName) {
      score += 0.2;
    }

    // Class selectors are less stable
    if (selector.includes('.') && elementContext.hasClass) {
      score += 0.1;
    }

    // Text selectors can be unstable
    if (selector.includes('text=') && elementContext.hasText) {
      score += 0.05;
    }

    // XPath selectors are often fragile
    if (selector.startsWith('//')) {
      score -= 0.1;
    }

    // nth-child selectors are very fragile
    if (selector.includes(':nth-child')) {
      score -= 0.2;
    }

    // Complex selectors are less reliable
    const selectorComplexity = this.calculateSelectorComplexity(selector);
    if (selectorComplexity > 3) {
      score -= 0.1 * (selectorComplexity - 3);
    }

    // Check historical reliability
    const historicalReliability = this.getSelectorHistoricalReliability(selector);
    score = (score * 0.7) + (historicalReliability * 0.3);

    return Math.max(0, Math.min(1, score));
  }

  // Score element context factors
  scoreElementContext(elementContext) {
    let score = 0.5;

    // Element visibility
    if (elementContext.isVisible) {
      score += 0.2;
    } else {
      score -= 0.3;
    }

    // Element enabled state
    if (elementContext.isEnabled) {
      score += 0.15;
    } else {
      score -= 0.2;
    }

    // Element in viewport
    if (elementContext.inViewport) {
      score += 0.1;
    } else {
      score -= 0.1;
    }

    // Element has stable attributes
    const stableAttributes = ['id', 'data-testid', 'aria-label', 'name'].filter(
      attr => elementContext[`has${attr.charAt(0).toUpperCase() + attr.slice(1).replace('-', '')}`]
    ).length;
    score += stableAttributes * 0.05;

    // Element type reliability
    const typeReliability = this.getElementTypeReliability(elementContext.tagName);
    score += typeReliability * 0.1;

    // Shadow DOM complexity
    if (elementContext.inShadowDOM) {
      score -= 0.15;
    }

    // Dynamic content
    if (elementContext.isDynamic) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Score historical success rate
  scoreHistoricalSuccess(strategy, selector, historicalResults) {
    if (!historicalResults || historicalResults.length === 0) {
      return 0.5; // Neutral score for no history
    }

    const strategyResults = historicalResults.filter(r => r.strategy === strategy);
    const selectorResults = historicalResults.filter(r => r.selector === selector);

    let strategySuccessRate = 0.5;
    let selectorSuccessRate = 0.5;

    if (strategyResults.length > 0) {
      const successes = strategyResults.filter(r => r.success).length;
      strategySuccessRate = successes / strategyResults.length;
    }

    if (selectorResults.length > 0) {
      const successes = selectorResults.filter(r => r.success).length;
      selectorSuccessRate = successes / selectorResults.length;
    }

    // Weight recent results more heavily
    const recentResults = historicalResults.filter(
      r => Date.now() - r.timestamp < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    let recentSuccessRate = 0.5;
    if (recentResults.length > 0) {
      const recentSuccesses = recentResults.filter(r => r.success).length;
      recentSuccessRate = recentSuccesses / recentResults.length;
    }

    // Combine scores with weights
    return (strategySuccessRate * 0.4) + (selectorSuccessRate * 0.4) + (recentSuccessRate * 0.2);
  }

  // Score browser compatibility
  scoreBrowserCompatibility(strategy, browserInfo) {
    const compatibilityMatrix = {
      'chromium': {
        'id_selector': 0.95,
        'data_testid': 0.9,
        'class_selector': 0.85,
        'xpath_selector': 0.75,
        'text_selector': 0.8,
        'css_selector': 0.9
      },
      'firefox': {
        'id_selector': 0.9,
        'data_testid': 0.85,
        'class_selector': 0.8,
        'xpath_selector': 0.9,
        'text_selector': 0.75,
        'css_selector': 0.85
      },
      'webkit': {
        'id_selector': 0.85,
        'data_testid': 0.8,
        'class_selector': 0.75,
        'xpath_selector': 0.6,
        'text_selector': 0.8,
        'css_selector': 0.75
      }
    };

    const browserName = this.normalizeBrowserName(browserInfo.name);
    const browserMatrix = compatibilityMatrix[browserName];

    if (!browserMatrix) {
      return 0.7; // Default score for unknown browsers
    }

    const strategyScore = browserMatrix[strategy] || 0.6;

    // Adjust for browser version (newer versions generally more reliable)
    let versionAdjustment = 0;
    if (browserInfo.version) {
      const majorVersion = parseInt(browserInfo.version.split('.')[0]);
      if (majorVersion >= 90) versionAdjustment = 0.05;
      else if (majorVersion >= 80) versionAdjustment = 0.02;
      else if (majorVersion < 70) versionAdjustment = -0.1;
    }

    return Math.max(0, Math.min(1, strategyScore + versionAdjustment));
  }

  // Score page complexity factors
  scorePageComplexity(pageContext) {
    let score = 0.8; // Start with high score

    // DOM complexity
    if (pageContext.domElementCount > 5000) {
      score -= 0.2;
    } else if (pageContext.domElementCount > 2000) {
      score -= 0.1;
    }

    // JavaScript frameworks
    if (pageContext.hasReactFramework) {
      score -= 0.05; // React can cause dynamic changes
    }
    if (pageContext.hasAngularFramework) {
      score -= 0.1; // Angular can be more complex
    }
    if (pageContext.hasVueFramework) {
      score -= 0.05;
    }

    // Single Page Application
    if (pageContext.isSPA) {
      score -= 0.1;
    }

    // Dynamic content loading
    if (pageContext.hasAjaxLoading) {
      score -= 0.15;
    }

    // Animations and transitions
    if (pageContext.hasAnimations) {
      score -= 0.05;
    }

    // Shadow DOM usage
    if (pageContext.hasShadowDOM) {
      score -= 0.1;
    }

    // Iframe complexity
    if (pageContext.hasIframes) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Score timing-related factors
  scoreTimingFactors(timingContext) {
    let score = 0.7;

    // Page load state
    if (timingContext.pageLoadComplete) {
      score += 0.2;
    } else {
      score -= 0.3;
    }

    // Network conditions
    if (timingContext.networkSpeed === 'fast') {
      score += 0.1;
    } else if (timingContext.networkSpeed === 'slow') {
      score -= 0.2;
    }

    // Pending requests
    if (timingContext.pendingRequests > 0) {
      score -= Math.min(0.2, timingContext.pendingRequests * 0.05);
    }

    // Element load time
    if (timingContext.elementLoadTime < 1000) {
      score += 0.1;
    } else if (timingContext.elementLoadTime > 5000) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Calculate selector complexity
  calculateSelectorComplexity(selector) {
    let complexity = 0;

    // Count selector parts
    complexity += (selector.match(/[>+~]/g) || []).length; // Combinators
    complexity += (selector.match(/\[.*?\]/g) || []).length; // Attribute selectors
    complexity += (selector.match(/:[^:]/g) || []).length; // Pseudo-classes
    complexity += (selector.match(/::/g) || []).length; // Pseudo-elements
    complexity += (selector.split(' ').length - 1); // Descendant selectors

    return complexity;
  }

  // Get element type reliability score
  getElementTypeReliability(tagName) {
    const reliabilityMap = {
      'BUTTON': 0.9,
      'INPUT': 0.85,
      'A': 0.8,
      'SELECT': 0.85,
      'TEXTAREA': 0.8,
      'FORM': 0.7,
      'DIV': 0.5,
      'SPAN': 0.4,
      'P': 0.3
    };

    return reliabilityMap[tagName?.toUpperCase()] || 0.5;
  }

  // Get historical reliability for a selector
  getSelectorHistoricalReliability(selector) {
    const selectorData = this.selectorReliability.get(selector);
    if (!selectorData) {
      return 0.5; // Neutral for unknown selectors
    }

    return selectorData.successRate;
  }

  // Normalize browser name
  normalizeBrowserName(browserName) {
    const normalized = browserName.toLowerCase();
    if (normalized.includes('chrome') || normalized.includes('chromium')) return 'chromium';
    if (normalized.includes('firefox')) return 'firefox';
    if (normalized.includes('safari') || normalized.includes('webkit')) return 'webkit';
    return 'chromium';
  }

  // Get confidence level from score
  getConfidenceLevel(score) {
    if (score >= this.confidenceThresholds.high) return 'high';
    if (score >= this.confidenceThresholds.medium) return 'medium';
    if (score >= this.confidenceThresholds.low) return 'low';
    return 'very-low';
  }

  // Generate recommendations based on scores
  generateRecommendations(scores, overallConfidence) {
    const recommendations = [];

    if (scores.selectorStability < 0.6) {
      recommendations.push({
        type: 'selector_improvement',
        message: 'Consider using more stable selectors like ID or data-testid',
        priority: 'high',
        impact: 'Improves selector reliability by up to 40%'
      });
    }

    if (scores.elementContext < 0.5) {
      recommendations.push({
        type: 'element_context',
        message: 'Element may not be ready for interaction. Consider adding waits.',
        priority: 'high',
        impact: 'Reduces timing-related failures'
      });
    }

    if (scores.historicalSuccess < 0.4) {
      recommendations.push({
        type: 'strategy_change',
        message: 'This strategy has low historical success. Consider alternatives.',
        priority: 'medium',
        impact: 'May improve success rate based on historical data'
      });
    }

    if (scores.browserCompatibility < 0.7) {
      recommendations.push({
        type: 'browser_compatibility',
        message: 'Strategy may not be optimal for this browser. Consider browser-specific alternatives.',
        priority: 'medium',
        impact: 'Improves cross-browser reliability'
      });
    }

    if (scores.pageComplexity < 0.6) {
      recommendations.push({
        type: 'page_complexity',
        message: 'Page complexity may affect reliability. Consider additional waits or simpler selectors.',
        priority: 'low',
        impact: 'Reduces complexity-related issues'
      });
    }

    if (overallConfidence < 0.5) {
      recommendations.push({
        type: 'overall_strategy',
        message: 'Overall confidence is low. Consider manual review or alternative approaches.',
        priority: 'high',
        impact: 'Prevents potential test failures'
      });
    }

    return recommendations;
  }

  // Identify risk factors
  identifyRiskFactors(scores) {
    const risks = [];

    Object.entries(scores).forEach(([factor, score]) => {
      if (score < 0.4) {
        risks.push({
          factor,
          severity: 'high',
          score,
          description: this.getRiskDescription(factor, score)
        });
      } else if (score < 0.6) {
        risks.push({
          factor,
          severity: 'medium',
          score,
          description: this.getRiskDescription(factor, score)
        });
      }
    });

    return risks.sort((a, b) => a.score - b.score);
  }

  // Get risk description for factors
  getRiskDescription(factor, score) {
    const descriptions = {
      selectorStability: 'Selector may be fragile and prone to breaking with UI changes',
      elementContext: 'Element may not be in the expected state for interaction',
      historicalSuccess: 'Strategy has shown poor performance in similar scenarios',
      browserCompatibility: 'Strategy may not work reliably in this browser',
      pageComplexity: 'Page complexity may interfere with element detection',
      timingFactors: 'Timing issues may cause intermittent failures'
    };

    return descriptions[factor] || 'Unknown risk factor';
  }

  // Learn from healing results to improve confidence scoring
  async learnFromHealingResult(healingContext, actualResult) {
    const { selector, strategy } = healingContext;
    const { success, executionTime, errorType } = actualResult;

    // Update selector reliability
    if (!this.selectorReliability.has(selector)) {
      this.selectorReliability.set(selector, {
        attempts: 0,
        successes: 0,
        successRate: 0.5,
        avgExecutionTime: 0,
        commonErrors: new Map()
      });
    }

    const selectorData = this.selectorReliability.get(selector);
    selectorData.attempts++;
    
    if (success) {
      selectorData.successes++;
    } else if (errorType) {
      const errorCount = selectorData.commonErrors.get(errorType) || 0;
      selectorData.commonErrors.set(errorType, errorCount + 1);
    }

    selectorData.successRate = selectorData.successes / selectorData.attempts;
    selectorData.avgExecutionTime = (selectorData.avgExecutionTime + executionTime) / 2;

    // Store historical data
    const historicalEntry = {
      ...healingContext,
      result: actualResult,
      timestamp: Date.now()
    };

    if (!this.historicalData.has(strategy)) {
      this.historicalData.set(strategy, []);
    }

    this.historicalData.get(strategy).push(historicalEntry);

    // Keep only recent data (last 1000 entries per strategy)
    const strategyData = this.historicalData.get(strategy);
    if (strategyData.length > 1000) {
      strategyData.splice(0, strategyData.length - 1000);
    }

    await this.saveHistoricalData();
  }

  // Save historical data
  async saveHistoricalData() {
    try {
      const data = {
        selectorReliability: Array.from(this.selectorReliability.entries()).map(([selector, data]) => [
          selector,
          {
            ...data,
            commonErrors: Array.from(data.commonErrors.entries())
          }
        ]),
        historicalData: Array.from(this.historicalData.entries()),
        timestamp: Date.now()
      };

      await fs.writeFile(
        path.join(this.dataDir, 'confidence-historical-data.json'),
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error('Error saving confidence historical data:', error);
    }
  }

  // Load historical data
  async loadHistoricalData() {
    try {
      const dataFile = path.join(this.dataDir, 'confidence-historical-data.json');
      const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));

      this.selectorReliability = new Map(
        data.selectorReliability.map(([selector, selectorData]) => [
          selector,
          {
            ...selectorData,
            commonErrors: new Map(selectorData.commonErrors)
          }
        ])
      );

      this.historicalData = new Map(data.historicalData);

      console.log('Confidence scoring historical data loaded');
    } catch (error) {
      console.log('No existing confidence historical data found');
    }
  }

  // Get confidence scoring analytics
  getAnalytics() {
    const totalSelectors = this.selectorReliability.size;
    const reliableSelectors = Array.from(this.selectorReliability.values())
      .filter(data => data.successRate >= 0.8).length;

    const avgSuccessRate = totalSelectors > 0 ?
      Array.from(this.selectorReliability.values())
        .reduce((sum, data) => sum + data.successRate, 0) / totalSelectors : 0;

    const strategyStats = Array.from(this.historicalData.entries())
      .map(([strategy, data]) => {
        const successes = data.filter(entry => entry.result.success).length;
        return {
          strategy,
          totalAttempts: data.length,
          successes,
          successRate: data.length > 0 ? (successes / data.length) * 100 : 0
        };
      });

    return {
      totalSelectors,
      reliableSelectors,
      reliabilityPercentage: totalSelectors > 0 ? (reliableSelectors / totalSelectors) * 100 : 0,
      avgSuccessRate: Math.round(avgSuccessRate * 100),
      strategyStats,
      confidenceThresholds: this.confidenceThresholds,
      scoringWeights: this.scoringWeights
    };
  }
}

export default HealingConfidenceScoring;