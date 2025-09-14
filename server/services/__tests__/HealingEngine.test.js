import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HealingEngine from '../HealingEngine.js';
import path from 'path';

// Mock AI services
vi.mock('../ai/NeuralNetworkService.js', () => ({
  default: class MockNeuralNetworkService {
    initialize = vi.fn().mockResolvedValue();
    predict = vi.fn().mockResolvedValue([]);
    train = vi.fn().mockResolvedValue();
    getModelStats = vi.fn().mockReturnValue({ accuracy: 0.85 });
  }
}));

vi.mock('../ai/AIModelManager.js', () => ({
  default: class MockAIModelManager {
    initialize = vi.fn().mockResolvedValue();
    createModel = vi.fn().mockResolvedValue();
    predict = vi.fn().mockResolvedValue([]);
    getModelPerformance = vi.fn().mockReturnValue({ accuracy: 0.9 });
  }
}));

vi.mock('../ai/AIElementDetection.js', () => ({
  default: class MockAIElementDetection {
    initialize = vi.fn().mockResolvedValue();
    detectElements = vi.fn().mockResolvedValue([]);
    getAnalytics = vi.fn().mockReturnValue({ elementsDetected: 0 });
  }
}));

vi.mock('../ai/VisualRegressionHealing.js', () => ({
  default: class MockVisualRegressionHealing {
    initialize = vi.fn().mockResolvedValue();
    analyzeVisualChanges = vi.fn().mockResolvedValue([]);
    getAnalytics = vi.fn().mockReturnValue({ imagesProcessed: 0 });
  }
}));

vi.mock('../ai/AutoLearningEngine.js', () => ({
  default: class MockAutoLearningEngine {
    initialize = vi.fn().mockResolvedValue();
    getSuggestedStrategies = vi.fn().mockResolvedValue([]);
    getAnalytics = vi.fn().mockReturnValue({ patternsLearned: 0 });
  }
}));

vi.mock('../ai/CrossBrowserHealing.js', () => ({
  default: class MockCrossBrowserHealing {
    initialize = vi.fn().mockResolvedValue();
    getBrowserSpecificSuggestions = vi.fn().mockResolvedValue([]);
    getAnalytics = vi.fn().mockReturnValue({ browserStrategies: {} });
  }
}));

vi.mock('../ai/HealingConfidenceScoring.js', () => ({
  default: class MockHealingConfidenceScoring {
    initialize = vi.fn().mockResolvedValue();
    calculateConfidence = vi.fn().mockResolvedValue({
      overallConfidence: 0.8,
      confidenceLevel: 'high',
      factorScores: {},
      recommendations: [],
      riskFactors: []
    });
    getAnalytics = vi.fn().mockReturnValue({ totalSelectors: 0 });
  }
}));

vi.mock('../strategies/StrategyLoader.js', () => ({
  default: class MockStrategyLoader {
    initialize = vi.fn().mockResolvedValue();
    loadStrategies = vi.fn().mockResolvedValue(new Map());
    getAvailableStrategies = vi.fn().mockReturnValue([]);
  }
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(),
  writeFile: vi.fn().mockResolvedValue(),
  readFile: vi.fn().mockResolvedValue('{}'),
  access: vi.fn().mockResolvedValue(),
}));

describe('HealingEngine', () => {
  let healingEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    healingEngine = new HealingEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('creates a new HealingEngine instance', () => {
      expect(healingEngine).toBeInstanceOf(HealingEngine);
      expect(healingEngine.healingHistory).toBeInstanceOf(Map);
      expect(healingEngine.strategies).toBeInstanceOf(Map);
      expect(healingEngine.customStrategies).toBeInstanceOf(Map);
      expect(healingEngine.ready).toBe(false);
    });

    it('initializes with default analytics', () => {
      expect(healingEngine.analytics).toEqual({
        totalHealingAttempts: 0,
        successfulHealings: 0,
        failedHealings: 0,
        strategiesUsed: expect.any(Map),
        commonFailures: expect.any(Map),
        healingTrends: [],
        recentFailures: [],
        recentSuccesses: [],
        failureTypes: {},
        strategyPerformance: {},
        aiEnhancements: {},
        averageHealingTime: 0
      });
    });

    it('initializes successfully', async () => {
      await healingEngine.initialize();
      expect(healingEngine.isReady()).toBe(true);
    });

    it('loads default healing strategies', async () => {
      await healingEngine.initialize();
      
      expect(healingEngine.strategies.has('click')).toBe(true);
      expect(healingEngine.strategies.has('fill')).toBe(true);
      expect(healingEngine.strategies.has('wait')).toBe(true);
    });

    it('handles initialization errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error during AI initialization
      healingEngine.neuralNetworkService.initialize.mockRejectedValue(new Error('AI init failed'));
      
      await healingEngine.initialize();
      expect(healingEngine.isReady()).toBe(true); // Should still be ready
      
      consoleSpy.mockRestore();
    });
  });

  describe('Failure Classification', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('classifies element not found failures', () => {
      const failure = {
        error: 'Element not found: timeout exceeded',
        action: 'click',
        selector: '#missing-button'
      };
      
      const classification = healingEngine.classifyFailure(failure);
      expect(classification).toBe('element-not-found');
    });

    it('classifies element not interactable failures', () => {
      const failure = {
        error: 'Element is not visible',
        action: 'click',
        selector: '#hidden-button'
      };
      
      const classification = healingEngine.classifyFailure(failure);
      expect(classification).toBe('element-not-interactable');
    });

    it('classifies detached element failures', () => {
      const failure = {
        error: 'Element is detached from DOM',
        action: 'fill',
        selector: '#dynamic-input'
      };
      
      const classification = healingEngine.classifyFailure(failure);
      expect(classification).toBe('element-detached');
    });

    it('classifies network issue failures', () => {
      const failure = {
        error: 'Network timeout during navigation',
        action: 'goto',
        selector: null
      };
      
      const classification = healingEngine.classifyFailure(failure);
      expect(classification).toBe('network-issue');
    });

    it('classifies unknown failures', () => {
      const failure = {
        error: 'Some unexpected error',
        action: 'custom',
        selector: '#element'
      };
      
      const classification = healingEngine.classifyFailure(failure);
      expect(classification).toBe('unknown');
    });
  });

  describe('Healing Analysis', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('analyzes test failures and generates suggestions', async () => {
      const testFailures = [
        {
          testId: 'test-1',
          stepId: 'step-1',
          error: 'Element not found',
          action: 'click',
          selector: '#missing-button',
          element: { id: 'missing-button', text: 'Click me' }
        }
      ];
      
      const pageContent = {
        elements: [
          { selector: '#alternative-button', text: 'Click me', id: 'alternative-button' }
        ]
      };
      
      const result = await healingEngine.analyzeFailures(testFailures, pageContent);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('testId', 'test-1');
      expect(result[0]).toHaveProperty('failureType', 'element-not-found');
      expect(result[0]).toHaveProperty('suggestions');
      expect(result[0]).toHaveProperty('confidence');
      expect(result[0]).toHaveProperty('priority');
    });

    it('handles multiple failures', async () => {
      const testFailures = [
        {
          testId: 'test-1',
          stepId: 'step-1',
          error: 'Element not found',
          action: 'click',
          selector: '#button1'
        },
        {
          testId: 'test-2',
          stepId: 'step-1',
          error: 'Element not visible',
          action: 'fill',
          selector: '#input1'
        }
      ];
      
      const result = await healingEngine.analyzeFailures(testFailures, {});
      
      expect(result).toHaveLength(2);
      expect(result[0].failureType).toBe('element-not-found');
      expect(result[1].failureType).toBe('element-not-interactable');
    });

    it('updates analytics after analysis', async () => {
      const testFailures = [
        {
          testId: 'test-1',
          stepId: 'step-1',
          error: 'Element not found',
          action: 'click',
          selector: '#button'
        }
      ];
      
      const initialAttempts = healingEngine.analytics.totalHealingAttempts;
      
      await healingEngine.analyzeFailures(testFailures, {});
      
      expect(healingEngine.analytics.totalHealingAttempts).toBe(initialAttempts + 1);
    });
  });

  describe('Healing Suggestions Generation', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('generates element not found suggestions', () => {
      const failure = {
        action: 'click',
        selector: '#missing-button',
        element: {
          id: 'missing-button',
          text: 'Click me',
          className: 'btn btn-primary'
        }
      };
      
      const strategies = healingEngine.strategies.get('click');
      const suggestions = healingEngine.generateElementNotFoundSuggestions(failure, strategies, {});
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('type');
      expect(suggestions[0]).toHaveProperty('strategy');
      expect(suggestions[0]).toHaveProperty('confidence');
    });

    it('generates interactability suggestions', () => {
      const failure = {
        action: 'click',
        selector: '#hidden-button',
        element: { id: 'hidden-button', isVisible: false }
      };
      
      const strategies = healingEngine.strategies.get('click');
      const suggestions = healingEngine.generateInteractabilitySuggestions(failure, strategies);
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.some(s => s.type === 'wait-strategy')).toBe(true);
    });

    it('generates detached element suggestions', () => {
      const failure = {
        action: 'fill',
        selector: '#dynamic-input',
        element: { id: 'dynamic-input' }
      };
      
      const strategies = healingEngine.strategies.get('fill');
      const suggestions = healingEngine.generateDetachedElementSuggestions(failure, strategies);
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.some(s => s.type === 'requery-strategy')).toBe(true);
    });

    it('generates network issue suggestions', () => {
      const failure = {
        action: 'goto',
        error: 'Network timeout'
      };
      
      const suggestions = healingEngine.generateNetworkIssueSuggestions(failure);
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.some(s => s.type === 'network-wait')).toBe(true);
      expect(suggestions.some(s => s.type === 'retry-strategy')).toBe(true);
    });

    it('generates timing suggestions', () => {
      const failure = {
        action: 'click',
        selector: '#button',
        element: { id: 'button' }
      };
      
      const suggestions = healingEngine.generateTimingSuggestions(failure);
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.some(s => s.type === 'wait-strategy')).toBe(true);
    });
  });

  describe('AI-Powered Features', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('generates neural network suggestions', async () => {
      const failure = {
        action: 'click',
        selector: '#button',
        element: { id: 'button' }
      };
      
      // Mock neural network predictions
      healingEngine.neuralNetworkService.predict.mockResolvedValue([
        {
          selector: '#ai-suggested-button',
          confidence: 0.9,
          description: 'AI-powered suggestion',
          features: { hasId: true, isVisible: true }
        }
      ]);
      
      const suggestions = await healingEngine.generateNeuralNetworkSuggestions(
        failure,
        'element-not-found',
        {},
        { name: 'chrome' }
      );
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(healingEngine.neuralNetworkService.predict).toHaveBeenCalled();
    });

    it('calculates enhanced confidence scores', async () => {
      const failure = {
        selector: '#button',
        action: 'click',
        element: {
          isVisible: true,
          isEnabled: true,
          id: 'button'
        }
      };
      
      const suggestions = [
        { type: 'alternative-selector', confidence: 0.8 }
      ];
      
      const result = await healingEngine.calculateEnhancedConfidence(
        failure,
        suggestions,
        { name: 'chrome' },
        { elements: [] }
      );
      
      expect(result).toHaveProperty('overallConfidence');
      expect(result).toHaveProperty('confidenceLevel');
      expect(result).toHaveProperty('factorScores');
      expect(healingEngine.confidenceScoring.calculateConfidence).toHaveBeenCalled();
    });
  });

  describe('Strategy Management', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('adds custom healing strategy', () => {
      const customStrategy = {
        name: 'custom-click',
        priority: 10,
        generate: (element) => element.customAttr ? `[custom-attr="${element.customAttr}"]` : null,
        description: 'Custom click strategy'
      };
      
      healingEngine.addCustomStrategy('click', customStrategy);
      
      const clickStrategies = healingEngine.strategies.get('click');
      expect(clickStrategies.some(s => s.name === 'custom-click')).toBe(true);
    });

    it('removes healing strategy', () => {
      healingEngine.removeStrategy('click', 'text-content');
      
      const clickStrategies = healingEngine.strategies.get('click');
      expect(clickStrategies.some(s => s.name === 'text-content')).toBe(false);
    });

    it('gets available strategies', () => {
      const strategies = healingEngine.getAvailableStrategies();
      
      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies).toContain('click');
      expect(strategies).toContain('fill');
      expect(strategies).toContain('wait');
    });

    it('gets top performing strategies', () => {
      // Add some strategy usage data
      healingEngine.updateStrategyStats('id-selector', true);
      healingEngine.updateStrategyStats('id-selector', true);
      healingEngine.updateStrategyStats('text-content', true);
      healingEngine.updateStrategyStats('text-content', false);
      
      const topStrategies = healingEngine.getTopStrategies();
      
      expect(topStrategies).toBeInstanceOf(Array);
      expect(topStrategies[0]).toHaveProperty('name');
      expect(topStrategies[0]).toHaveProperty('successRate');
      expect(topStrategies[0].successRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Analytics and Reporting', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('gets healing statistics', async () => {
      const stats = await healingEngine.getStats();
      
      expect(stats).toHaveProperty('totalHealingAttempts');
      expect(stats).toHaveProperty('successfulHealings');
      expect(stats).toHaveProperty('failedHealings');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('strategiesUsed');
      expect(stats).toHaveProperty('commonFailures');
      expect(stats).toHaveProperty('aiEnhancements');
    });

    it('records successful healing', () => {
      const suggestion = {
        type: 'alternative-selector',
        strategy: 'id-selector',
        newSelector: '#new-button',
        confidence: 0.9
      };
      
      healingEngine.recordSuccessfulHealing(suggestion);
      
      const key = `${suggestion.type}-${suggestion.strategy}`;
      expect(healingEngine.healingHistory.has(key)).toBe(true);
      
      const record = healingEngine.healingHistory.get(key);
      expect(record.successCount).toBe(1);
      expect(record.lastUsed).toBeDefined();
    });

    it('updates strategy statistics', () => {
      const initialStats = healingEngine.analytics.strategiesUsed.get('test-strategy');
      
      healingEngine.updateStrategyStats('test-strategy', true);
      
      const updatedStats = healingEngine.analytics.strategiesUsed.get('test-strategy');
      expect(updatedStats.used).toBe((initialStats?.used || 0) + 1);
      expect(updatedStats.successful).toBe((initialStats?.successful || 0) + 1);
    });

    it('tracks healing trends', () => {
      const initialTrends = healingEngine.analytics.healingTrends.length;
      
      healingEngine.trackHealingTrend({
        timestamp: new Date().toISOString(),
        success: true,
        strategy: 'id-selector',
        confidence: 0.8
      });
      
      expect(healingEngine.analytics.healingTrends.length).toBe(initialTrends + 1);
    });

    it('gets failure patterns', () => {
      // Add some failure data
      healingEngine.updateFailureStats('element-not-found');
      healingEngine.updateFailureStats('element-not-found');
      healingEngine.updateFailureStats('element-not-interactable');
      
      const patterns = healingEngine.getFailurePatterns();
      
      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('type');
      expect(patterns[0]).toHaveProperty('count');
      expect(patterns[0]).toHaveProperty('percentage');
    });
  });

  describe('Custom TypeScript Strategies', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('loads custom TypeScript strategies', async () => {
      const mockStrategy = {
        generateCandidates: vi.fn().mockReturnValue([
          {
            selector: '#custom-selector',
            confidence: 0.9,
            reasoning: 'Custom strategy reasoning'
          }
        ])
      };
      
      healingEngine.customStrategies.set('custom-strategy', mockStrategy);
      
      const suggestions = await healingEngine.generateCustomStrategySuggestions(
        {
          action: 'click',
          selector: '#button',
          element: { id: 'button' }
        },
        'element-not-found',
        {}
      );
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(mockStrategy.generateCandidates).toHaveBeenCalled();
    });

    it('handles custom strategy errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockStrategy = {
        generateCandidates: vi.fn().mockImplementation(() => {
          throw new Error('Strategy failed');
        })
      };
      
      healingEngine.customStrategies.set('failing-strategy', mockStrategy);
      
      const suggestions = await healingEngine.generateCustomStrategySuggestions(
        {
          action: 'click',
          selector: '#button'
        },
        'element-not-found',
        {}
      );
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Strategy failing-strategy failed:'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('finds similar elements', () => {
      const targetElement = {
        text: 'Submit',
        className: 'btn btn-primary',
        tagName: 'button'
      };
      
      const pageElements = [
        {
          selector: '#submit-btn',
          text: 'Submit',
          className: 'btn btn-secondary',
          tagName: 'button'
        },
        {
          selector: '#cancel-btn',
          text: 'Cancel',
          className: 'btn btn-primary',
          tagName: 'button'
        },
        {
          selector: '#link',
          text: 'Submit',
          className: 'link',
          tagName: 'a'
        }
      ];
      
      const similarElements = healingEngine.findSimilarElements(targetElement, pageElements);
      
      expect(similarElements).toBeInstanceOf(Array);
      expect(similarElements.length).toBeGreaterThan(0);
      expect(similarElements[0]).toHaveProperty('similarity');
      expect(similarElements[0].similarity).toBeGreaterThan(0);
    });

    it('calculates priority correctly', () => {
      const highPriorityFailure = {
        action: 'click',
        selector: '#critical-button'
      };
      
      const lowPriorityFailure = {
        action: 'hover',
        selector: '#optional-element'
      };
      
      const highPriority = healingEngine.calculatePriority(highPriorityFailure, 'element-not-found');
      const lowPriority = healingEngine.calculatePriority(lowPriorityFailure, 'element-not-interactable');
      
      expect(highPriority).toBeGreaterThan(lowPriority);
    });

    it('checks if engine is ready', () => {
      expect(healingEngine.isReady()).toBe(true);
    });

    it('enables and disables healing mode', () => {
      healingEngine.setEnabled(false);
      expect(healingEngine.enabled).toBe(false);
      
      healingEngine.setEnabled(true);
      expect(healingEngine.enabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await healingEngine.initialize();
    });

    it('handles malformed failure objects', async () => {
      const malformedFailures = [
        null,
        undefined,
        {},
        { error: null },
        { action: 'click' } // missing required fields
      ];
      
      const result = await healingEngine.analyzeFailures(malformedFailures, {});
      
      expect(result).toBeInstanceOf(Array);
      // Should handle gracefully without throwing
    });

    it('handles AI service failures gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock AI service failure
      healingEngine.neuralNetworkService.predict.mockRejectedValue(new Error('AI service down'));
      
      const failure = {
        testId: 'test-1',
        stepId: 'step-1',
        error: 'Element not found',
        action: 'click',
        selector: '#button'
      };
      
      const result = await healingEngine.analyzeFailures([failure], {});
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Neural network predictions failed:'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });
  });
});