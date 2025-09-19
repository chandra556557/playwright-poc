import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AIElementDetection from './AIElementDetection.js';
import VisualRegressionHealing from './VisualRegressionHealing.js';
import AutoLearningEngine from './AutoLearningEngine.js';
import CrossBrowserHealing from './CrossBrowserHealing.js';
import HealingConfidenceScoring from './HealingConfidenceScoring.js';
import StrategyLoader from './StrategyLoader.js';
import NeuralNetworkService from './NeuralNetworkService.js';
import AIModelManager from './AIModelManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HealingEngine {
  constructor() {
    this.healingHistory = new Map();
    this.strategies = new Map();
    this.customStrategies = new Map(); // For TypeScript strategies
    this.analytics = {
      totalHealingAttempts: 0,
      successfulHealings: 0,
      failedHealings: 0,
      strategiesUsed: new Map(),
      commonFailures: new Map(),
      healingTrends: [],
      recentFailures: [],
      recentSuccesses: [],
      failureTypes: {},
      strategyPerformance: {},
      aiEnhancements: {},
      averageHealingTime: 0
    };
    this.ready = false;
    this.dataDir = path.join(__dirname, '../data/healing');
    
    // Initialize AI-powered services
    this.neuralNetworkService = new NeuralNetworkService();
    this.aiModelManager = new AIModelManager();
    this.aiElementDetection = new AIElementDetection();
    this.visualRegressionHealing = new VisualRegressionHealing();
    this.autoLearningEngine = new AutoLearningEngine();
    this.crossBrowserHealing = new CrossBrowserHealing();
    this.confidenceScoring = new HealingConfidenceScoring();
    this.strategyLoader = new StrategyLoader();
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Enhanced AI Healing Engine...');
      
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Initialize neural network services first
      await this.neuralNetworkService.initialize();
      await this.aiModelManager.init();
      
      // Initialize AI services with neural network support
      await this.aiElementDetection.initialize();
      await this.visualRegressionHealing.initialize();
      await this.autoLearningEngine.initialize();
      await this.crossBrowserHealing.initialize();
      await this.confidenceScoring.init();
      
      // Register and initialize AI models
      await this.initializeAIModels();
      
      // Load healing strategies
      this.loadDefaultStrategies();
      
      // Load custom TypeScript strategies
      await this.loadCustomStrategies();
      
      // Load historical data
      await this.loadHealingHistory();
      
      // Seed sample data only if explicitly enabled
      if (process.env.HEALING_SEED === 'true') {
        await this.seedSampleDataIfNeeded();
      }
      
      this.ready = true;
      console.log('✅ Enhanced AI Healing Engine ready with ML capabilities');
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Healing Engine:', error);
      this.ready = false;
    }
  }

  isReady() {
    return this.ready;
  }

  /**
   * Initialize and register AI models for healing operations
   */
  async initializeAIModels() {
    try {
      console.log('🧠 Initializing AI models for healing engine...');
      
      // Register core healing models
      this.aiModelManager.registerModel('elementDetection', {
        type: 'tensorflow',
        inputSize: 20,
        hiddenLayers: [64, 32, 16],
        outputSize: 1,
        learningRate: 0.001,
        epochs: 100
      });
      
      this.aiModelManager.registerModel('strategyEffectiveness', {
        type: 'tensorflow',
        inputSize: 25,
        hiddenLayers: [128, 64, 32],
        outputSize: 1,
        learningRate: 0.001,
        epochs: 150
      });
      
      this.aiModelManager.registerModel('healingSuccess', {
        type: 'tensorflow',
        inputSize: 25,
        hiddenLayers: [64, 32],
        outputSize: 1,
        learningRate: 0.002,
        epochs: 100
      });
      
      this.aiModelManager.registerModel('patternRecognition', {
        type: 'tensorflow',
        inputSize: 25,
        hiddenLayers: [128, 64, 32],
        outputSize: 8,
        learningRate: 0.001,
        epochs: 200
      });
      
      this.aiModelManager.registerModel('selectorOptimization', {
        type: 'brainjs',
        architecture: 'lstm',
        hiddenLayers: [20, 15],
        learningRate: 0.01,
        iterations: 1000
      });
      
      // Create models
      await this.aiModelManager.createModel('elementDetection');
      await this.aiModelManager.createModel('strategyEffectiveness');
      await this.aiModelManager.createModel('healingSuccess');
      await this.aiModelManager.createModel('patternRecognition');
      await this.aiModelManager.createModel('selectorOptimization');
      
      console.log('✅ AI models initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing AI models:', error);
    }
  }

  loadDefaultStrategies() {
    // Click strategies
    this.strategies.set('click', [
      {
        name: 'id-selector',
        priority: 10,
        generate: (element) => element.id ? `#${element.id}` : null,
        description: 'Use element ID selector'
      },
      {
        name: 'data-testid',
        priority: 9,
        generate: (element) => element.testId ? `[data-testid="${element.testId}"]` : null,
        description: 'Use data-testid attribute'
      },
      {
        name: 'aria-label',
        priority: 8,
        generate: (element) => element.ariaLabel ? `[aria-label="${element.ariaLabel}"]` : null,
        description: 'Use aria-label attribute'
      },
      {
        name: 'text-content',
        priority: 7,
        generate: (element) => element.text ? `text="${element.text}"` : null,
        description: 'Use text content selector'
      },
      {
        name: 'class-selector',
        priority: 6,
        generate: (element) => element.className ? `.${element.className.split(' ')[0]}` : null,
        description: 'Use primary class selector'
      },
      {
        name: 'xpath-position',
        priority: 5,
        generate: (element) => element.xpath ? element.xpath : null,
        description: 'Use XPath selector'
      },
      {
        name: 'css-nth-child',
        priority: 4,
        generate: (element) => element.nthChild ? `${element.tagName}:nth-child(${element.nthChild})` : null,
        description: 'Use nth-child selector'
      }
    ]);

    // Fill strategies
    this.strategies.set('fill', [
      {
        name: 'name-attribute',
        priority: 10,
        generate: (element) => element.name ? `[name="${element.name}"]` : null,
        description: 'Use name attribute'
      },
      {
        name: 'id-selector',
        priority: 9,
        generate: (element) => element.id ? `#${element.id}` : null,
        description: 'Use element ID'
      },
      {
        name: 'placeholder-text',
        priority: 8,
        generate: (element) => element.placeholder ? `[placeholder="${element.placeholder}"]` : null,
        description: 'Use placeholder attribute'
      },
      {
        name: 'label-association',
        priority: 7,
        generate: (element) => element.label ? `input[aria-label="${element.label}"]` : null,
        description: 'Use associated label'
      },
      {
        name: 'type-selector',
        priority: 6,
        generate: (element) => element.type ? `input[type="${element.type}"]` : null,
        description: 'Use input type selector'
      }
    ]);

    // Wait strategies
    this.strategies.set('wait', [
      {
        name: 'element-visible',
        priority: 10,
        generate: (element) => ({ type: 'visible', selector: element.selector }),
        description: 'Wait for element to be visible'
      },
      {
        name: 'element-attached',
        priority: 9,
        generate: (element) => ({ type: 'attached', selector: element.selector }),
        description: 'Wait for element to be attached to DOM'
      },
      {
        name: 'network-idle',
        priority: 8,
        generate: () => ({ type: 'networkidle', timeout: 5000 }),
        description: 'Wait for network to be idle'
      },
      {
        name: 'load-state',
        priority: 7,
        generate: () => ({ type: 'load', state: 'domcontentloaded' }),
        description: 'Wait for DOM content loaded'
      }
    ]);

    console.log('📚 Loaded default healing strategies');
  }

  async loadCustomStrategies() {
    try {
      console.log('🔄 Loading custom TypeScript healing strategies...');
      
      // Initialize and load strategies from the strategies folder
      await this.strategyLoader.initialize();
      
      // Get loaded strategies
      const loadedStrategies = this.strategyLoader.getLoadedStrategies();
      
      // Store custom strategies
      for (const [name, StrategyClass] of loadedStrategies) {
        this.customStrategies.set(name, StrategyClass);
        console.log(`✅ Loaded custom strategy: ${name}`);
      }
      
      console.log(`📚 Loaded ${loadedStrategies.size} custom healing strategies`);
    } catch (error) {
      console.warn('⚠️ Failed to load custom strategies:', error.message);
      console.log('🔄 Continuing with default strategies only...');
    }
  }

  async analyzeFailures(testFailures, pageContent, browserInfo = {}, pageScreenshot = null) {
    console.log('🔍 Analyzing test failures with AI-powered healing...');
    
    const suggestions = [];
    
    for (const failure of testFailures) {
      const failureType = this.classifyFailure(failure);
      
      // Enhanced healing suggestions with AI capabilities
      const healingSuggestions = await this.generateEnhancedHealingSuggestions(
        failure, 
        failureType, 
        pageContent, 
        browserInfo, 
        pageScreenshot
      );
      
      // Calculate confidence using AI-powered scoring
      const confidenceResult = await this.calculateEnhancedConfidence(
        failure, 
        healingSuggestions, 
        browserInfo, 
        pageContent
      );
      
      suggestions.push({
        testId: failure.testId,
        stepId: failure.stepId,
        failureType,
        originalError: failure.error,
        suggestions: healingSuggestions,
        confidence: confidenceResult.overallConfidence,
        confidenceLevel: confidenceResult.confidenceLevel,
        factorScores: confidenceResult.factorScores,
        recommendations: confidenceResult.recommendations,
        riskFactors: confidenceResult.riskFactors,
        priority: this.calculatePriority(failure, failureType)
      });
      
      // Update analytics
      this.analytics.totalHealingAttempts++;
      this.updateFailureStats(failureType);
      
      // Learn from this failure for future improvements
      await this.autoLearningEngine.analyzeFailure(failure, healingSuggestions);
    }
    
    // Sort by priority and confidence
    suggestions.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.confidence - a.confidence;
    });
    
    await this.saveAnalysisResults(suggestions);
    
    return suggestions;
  }

  classifyFailure(failure) {
    const { error, action, selector } = failure;
    const errorMessage = (error && typeof error === 'string' ? error : String(error || '')).toLowerCase();
    
    if (errorMessage.includes('timeout') || errorMessage.includes('not found')) {
      return 'element-not-found';
    } else if (errorMessage.includes('not visible') || errorMessage.includes('not clickable')) {
      return 'element-not-interactable';
    } else if (errorMessage.includes('detached') || errorMessage.includes('stale')) {
      return 'element-detached';
    } else if (errorMessage.includes('network') || errorMessage.includes('navigation')) {
      return 'network-issue';
    } else if (errorMessage.includes('permission') || errorMessage.includes('blocked')) {
      return 'permission-issue';
    } else {
      return 'unknown';
    }
  }

  async generateEnhancedHealingSuggestions(failure, failureType, pageContent, browserInfo, pageScreenshot) {
    const suggestions = [];
    const { action, selector, element } = failure;
    
    // Get strategies for the action type
    const actionStrategies = this.strategies.get(action) || [];
    
    // Neural Network-powered predictions (highest priority)
    try {
      const neuralSuggestions = await this.generateNeuralNetworkSuggestions(
        failure, 
        failureType, 
        pageContent, 
        browserInfo
      );
      
      neuralSuggestions.forEach(neuralSuggestion => {
        suggestions.push({
          type: 'neural-network-prediction',
          strategy: 'deep-learning',
          newSelector: neuralSuggestion.selector,
          description: `Neural network prediction: ${neuralSuggestion.description}`,
          confidence: neuralSuggestion.confidence,
          neuralFeatures: neuralSuggestion.features,
          modelPredictions: neuralSuggestion.predictions,
          implementation: {
            locator: neuralSuggestion.selector,
            waitFor: true,
            timeout: 10000,
            neuralOptimized: true
          }
        });
      });
    } catch (error) {
      console.warn('Neural network predictions failed:', error.message);
    }
    
    // AI-powered element detection suggestions
    if (pageContent && pageContent.elements) {
      try {
        const aiSuggestions = await this.aiElementDetection.findSimilarElements(
          element, 
          pageContent.elements
        );
        
        aiSuggestions.forEach(aiSuggestion => {
          suggestions.push({
            type: 'ai-element-detection',
            strategy: 'machine-learning',
            newSelector: aiSuggestion.selector,
            description: `AI-detected similar element: ${aiSuggestion.description}`,
            confidence: aiSuggestion.confidence,
            aiFeatures: aiSuggestion.features,
            implementation: {
              locator: aiSuggestion.selector,
              waitFor: true,
              timeout: 10000
            }
          });
        });
      } catch (error) {
        console.warn('AI element detection failed:', error.message);
      }
    }
    
    // Visual regression healing suggestions
    if (pageScreenshot) {
      try {
        const visualSuggestions = await this.visualRegressionHealing.analyzeVisualChanges(
          pageScreenshot,
          element,
          failure
        );
        
        visualSuggestions.forEach(visualSuggestion => {
          suggestions.push({
            type: 'visual-regression-healing',
            strategy: 'computer-vision',
            newSelector: visualSuggestion.selector,
            description: `Visual analysis suggestion: ${visualSuggestion.description}`,
            confidence: visualSuggestion.confidence,
            visualAnalysis: visualSuggestion.analysis,
            implementation: {
              locator: visualSuggestion.selector,
              coordinates: visualSuggestion.coordinates,
              waitFor: true,
              timeout: 10000
            }
          });
        });
      } catch (error) {
        console.warn('Visual regression healing failed:', error.message);
      }
    }
    
    // Custom TypeScript strategy suggestions
    if (this.customStrategies.size > 0) {
      try {
        const customSuggestions = await this.generateCustomStrategySuggestions(
          failure,
          failureType,
          pageContent
        );
        
        customSuggestions.forEach(customSuggestion => {
          suggestions.push({
            type: 'custom-strategy',
            strategy: customSuggestion.strategy,
            newSelector: customSuggestion.selector,
            description: `Custom strategy: ${customSuggestion.reasoning || customSuggestion.description}`,
            confidence: customSuggestion.confidence,
            features: customSuggestion.features,
            implementation: {
              locator: customSuggestion.selector,
              waitFor: true,
              timeout: 10000
            }
          });
        });
      } catch (error) {
        console.warn('Custom strategy healing failed:', error.message);
      }
    }
    
    // Cross-browser healing suggestions
    if (browserInfo && browserInfo.name) {
      try {
        const browserSuggestions = await this.crossBrowserHealing.generateHealingStrategy(
          failure,
          browserInfo
        );
        
        browserSuggestions.forEach(browserSuggestion => {
          suggestions.push({
            type: 'cross-browser-healing',
            strategy: `browser-specific-${browserInfo.name}`,
            newSelector: browserSuggestion.selector,
            description: `${browserInfo.name}-optimized strategy: ${browserSuggestion.description}`,
            confidence: browserSuggestion.confidence,
            browserOptimizations: browserSuggestion.optimizations,
            implementation: browserSuggestion.implementation
          });
        });
      } catch (error) {
        console.warn('Cross-browser healing failed:', error.message);
      }
    }
    
    // Auto-learning enhanced suggestions
    try {
      const learningSuggestions = await this.autoLearningEngine.getSuggestedStrategies(
        failure,
        failureType
      );
      
      learningSuggestions.forEach(learningSuggestion => {
        suggestions.push({
          type: 'auto-learning',
          strategy: 'learned-pattern',
          newSelector: learningSuggestion.selector,
          description: `Learned strategy: ${learningSuggestion.description}`,
          confidence: learningSuggestion.confidence,
          learningData: learningSuggestion.data,
          implementation: learningSuggestion.implementation
        });
      });
    } catch (error) {
      console.warn('Auto-learning suggestions failed:', error.message);
    }
    
    // Traditional healing suggestions (fallback)
    switch (failureType) {
      case 'element-not-found':
        suggestions.push(...this.generateElementNotFoundSuggestions(failure, actionStrategies, pageContent));
        break;
        
      case 'element-not-interactable':
        suggestions.push(...this.generateInteractabilitySuggestions(failure, actionStrategies));
        break;
        
      case 'element-detached':
        suggestions.push(...this.generateDetachedElementSuggestions(failure, actionStrategies));
        break;
        
      case 'network-issue':
        suggestions.push(...this.generateNetworkIssueSuggestions(failure));
        break;
        
      default:
        suggestions.push(...this.generateGenericSuggestions(failure, actionStrategies));
    }
    
    // Add timing-based suggestions
    suggestions.push(...this.generateTimingSuggestions(failure));
    
    // Add context-aware suggestions
    suggestions.push(...this.generateContextAwareSuggestions(failure, pageContent));
    
    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // Increased limit for AI suggestions
  }
  
  async generateNeuralNetworkSuggestions(failure, failureType, pageContent, browserInfo) {
    const suggestions = [];
    
    try {
      // Prepare input data for neural network models
      const inputData = {
        selector: failure.selector,
        action: failure.action,
        element: failure.element,
        failureType: failureType,
        pageContext: pageContent,
        browserInfo: browserInfo,
        historicalData: this.getHistoricalFailures(failure.selector)
      };
      
      // Get element detection predictions
      const elementPredictions = await this.aiModelManager.predict('elementDetection', inputData);
      if (elementPredictions && elementPredictions.length > 0) {
        elementPredictions.forEach(prediction => {
          suggestions.push({
            selector: prediction.selector,
            description: `Element detection model suggests: ${prediction.description}`,
            confidence: prediction.confidence,
            features: prediction.features,
            predictions: { elementDetection: prediction }
          });
        });
      }
      
      // Get strategy effectiveness predictions
      const strategyPredictions = await this.aiModelManager.predict('strategyEffectiveness', inputData);
      if (strategyPredictions && strategyPredictions.length > 0) {
        strategyPredictions.forEach(prediction => {
          suggestions.push({
            selector: prediction.selector,
            description: `Strategy effectiveness model suggests: ${prediction.description}`,
            confidence: prediction.confidence,
            features: prediction.features,
            predictions: { strategyEffectiveness: prediction }
          });
        });
      }
      
      // Get healing success predictions
      const healingPredictions = await this.aiModelManager.predict('healingSuccess', inputData);
      if (healingPredictions && healingPredictions.length > 0) {
        healingPredictions.forEach(prediction => {
          suggestions.push({
            selector: prediction.selector,
            description: `Healing success model suggests: ${prediction.description}`,
            confidence: prediction.confidence,
            features: prediction.features,
            predictions: { healingSuccess: prediction }
          });
        });
      }
      
      // Get pattern recognition predictions
      const patternPredictions = await this.aiModelManager.predict('patternRecognition', inputData);
      if (patternPredictions && patternPredictions.length > 0) {
        patternPredictions.forEach(prediction => {
          suggestions.push({
            selector: prediction.selector,
            description: `Pattern recognition model suggests: ${prediction.description}`,
            confidence: prediction.confidence,
            features: prediction.features,
            predictions: { patternRecognition: prediction }
          });
        });
      }
      
      // Get selector optimization predictions
      const selectorPredictions = await this.aiModelManager.predict('selectorOptimization', inputData);
      if (selectorPredictions && selectorPredictions.length > 0) {
        selectorPredictions.forEach(prediction => {
          suggestions.push({
            selector: prediction.selector,
            description: `Selector optimization model suggests: ${prediction.description}`,
            confidence: prediction.confidence,
            features: prediction.features,
            predictions: { selectorOptimization: prediction }
          });
        });
      }
      
      // Combine and rank suggestions by confidence
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5); // Top 5 neural network suggestions
        
    } catch (error) {
      console.warn('Neural network suggestion generation failed:', error.message);
      return [];
    }
  }
  
  async calculateEnhancedConfidence(failure, suggestions, browserInfo, pageContent) {
    try {
      // Prepare healing context for confidence scoring
      const healingContext = {
        selector: failure.selector,
        strategy: failure.action,
        elementContext: {
          isVisible: failure.element?.isVisible || false,
          isEnabled: failure.element?.isEnabled || false,
          inViewport: failure.element?.inViewport || false,
          hasId: !!failure.element?.id,
          hasDataTestId: !!failure.element?.testId,
          hasAriaLabel: !!failure.element?.ariaLabel,
          hasName: !!failure.element?.name,
          hasClass: !!failure.element?.className,
          hasText: !!failure.element?.text,
          tagName: failure.element?.tagName,
          inShadowDOM: failure.element?.inShadowDOM || false,
          isDynamic: failure.element?.isDynamic || false
        },
        browserInfo: browserInfo || { name: 'unknown', version: '0' },
        pageContext: {
          domElementCount: pageContent?.elements?.length || 0,
          hasReactFramework: pageContent?.frameworks?.includes('react') || false,
          hasAngularFramework: pageContent?.frameworks?.includes('angular') || false,
          hasVueFramework: pageContent?.frameworks?.includes('vue') || false,
          isSPA: pageContent?.isSPA || false,
          hasAjaxLoading: pageContent?.hasAjaxLoading || false,
          hasAnimations: pageContent?.hasAnimations || false,
          hasShadowDOM: pageContent?.hasShadowDOM || false,
          hasIframes: pageContent?.hasIframes || false
        },
        historicalResults: this.getHistoricalFailures(failure.selector),
        timingContext: {
          pageLoadComplete: true,
          networkSpeed: 'medium',
          pendingRequests: 0,
          elementLoadTime: 2000
        }
      };
      
      return await this.confidenceScoring.calculateConfidenceScore(healingContext);
    } catch (error) {
      console.warn('Enhanced confidence calculation failed:', error.message);
      // Fallback to traditional confidence calculation
      return {
        overallConfidence: this.calculateConfidence(suggestions, failure),
        confidenceLevel: 'medium',
        factorScores: {},
        recommendations: [],
        riskFactors: []
      };
    }
  }

  generateElementNotFoundSuggestions(failure, strategies, pageContent) {
    const suggestions = [];
    const { element, selector } = failure;
    
    // Try alternative selectors
    strategies.forEach(strategy => {
      const newSelector = strategy.generate(element);
      if (newSelector && newSelector !== selector) {
        suggestions.push({
          type: 'alternative-selector',
          strategy: strategy.name,
          newSelector,
          description: `Try ${strategy.description}: ${newSelector}`,
          confidence: strategy.priority / 10,
          implementation: {
            locator: newSelector,
            waitFor: true,
            timeout: 10000
          }
        });
      }
    });
    
    // Suggest similar elements from page content
    if (pageContent && pageContent.elements) {
      const similarElements = this.findSimilarElements(element, pageContent.elements);
      similarElements.forEach(similar => {
        suggestions.push({
          type: 'similar-element',
          strategy: 'content-analysis',
          newSelector: similar.selector,
          description: `Try similar element: ${similar.text || similar.selector}`,
          confidence: similar.similarity,
          implementation: {
            locator: similar.selector,
            waitFor: true,
            timeout: 10000
          }
        });
      });
    }
    
    // Suggest parent/child traversal
    suggestions.push({
      type: 'dom-traversal',
      strategy: 'parent-child',
      newSelector: `${selector} >> visible=true`,
      description: 'Try finding visible child elements',
      confidence: 0.6,
      implementation: {
        locator: `${selector} >> visible=true`,
        waitFor: true,
        timeout: 15000
      }
    });
    
    return suggestions;
  }

  generateInteractabilitySuggestions(failure, strategies) {
    const suggestions = [];
    const { selector } = failure;
    
    // Wait for element to be ready
    suggestions.push({
      type: 'wait-strategy',
      strategy: 'wait-for-ready',
      description: 'Wait for element to be clickable',
      confidence: 0.8,
      implementation: {
        locator: selector,
        waitFor: 'visible',
        timeout: 15000,
        force: false
      }
    });
    
    // Scroll into view
    suggestions.push({
      type: 'scroll-strategy',
      strategy: 'scroll-into-view',
      description: 'Scroll element into view before interaction',
      confidence: 0.7,
      implementation: {
        locator: selector,
        scrollIntoView: true,
        waitFor: 'visible',
        timeout: 10000
      }
    });
    
    // Force interaction
    suggestions.push({
      type: 'force-interaction',
      strategy: 'force-click',
      description: 'Force click on element (use with caution)',
      confidence: 0.5,
      implementation: {
        locator: selector,
        force: true,
        timeout: 10000
      }
    });
    
    return suggestions;
  }

  generateDetachedElementSuggestions(failure, strategies) {
    const suggestions = [];
    const { selector } = failure;
    
    // Re-query element
    suggestions.push({
      type: 'requery-strategy',
      strategy: 'fresh-query',
      description: 'Re-query element from DOM',
      confidence: 0.9,
      implementation: {
        locator: selector,
        requery: true,
        waitFor: 'attached',
        timeout: 10000
      }
    });
    
    // Wait for stability
    suggestions.push({
      type: 'stability-wait',
      strategy: 'wait-for-stability',
      description: 'Wait for DOM to stabilize',
      confidence: 0.8,
      implementation: {
        locator: selector,
        waitForStability: true,
        stabilityTimeout: 2000,
        timeout: 15000
      }
    });
    
    return suggestions;
  }

  generateNetworkIssueSuggestions(failure) {
    const suggestions = [];
    
    suggestions.push({
      type: 'network-wait',
      strategy: 'wait-for-network',
      description: 'Wait for network requests to complete',
      confidence: 0.8,
      implementation: {
        waitForLoadState: 'networkidle',
        timeout: 30000
      }
    });
    
    suggestions.push({
      type: 'retry-strategy',
      strategy: 'network-retry',
      description: 'Retry action after network stabilizes',
      confidence: 0.7,
      implementation: {
        retries: 3,
        retryDelay: 2000,
        waitForNetwork: true
      }
    });
    
    return suggestions;
  }

  generateGenericSuggestions(failure, strategies) {
    const suggestions = [];
    const { selector } = failure;
    
    // Increase timeout
    suggestions.push({
      type: 'timeout-increase',
      strategy: 'longer-timeout',
      description: 'Increase timeout for the action',
      confidence: 0.6,
      implementation: {
        locator: selector,
        timeout: 30000
      }
    });
    
    // Add explicit wait
    suggestions.push({
      type: 'explicit-wait',
      strategy: 'wait-before-action',
      description: 'Add explicit wait before action',
      confidence: 0.5,
      implementation: {
        locator: selector,
        waitBefore: 2000,
        timeout: 15000
      }
    });
    
    return suggestions;
  }

  generateTimingSuggestions(failure) {
    const suggestions = [];
    
    // Dynamic wait based on failure history
    const historicalFailures = this.getHistoricalFailures(failure.selector);
    if (historicalFailures.length > 0) {
      const avgWaitTime = historicalFailures.reduce((sum, f) => sum + (f.suggestedWait || 0), 0) / historicalFailures.length;
      
      suggestions.push({
        type: 'historical-timing',
        strategy: 'learned-timing',
        description: `Use learned timing based on ${historicalFailures.length} previous failures`,
        confidence: 0.8,
        implementation: {
          waitBefore: Math.max(1000, avgWaitTime * 1.2),
          timeout: 20000
        }
      });
    }
    
    return suggestions;
  }

  generateContextAwareSuggestions(failure, pageContent) {
    const suggestions = [];
    
    if (pageContent) {
      // Check for loading indicators
      if (pageContent.hasLoadingIndicators) {
        suggestions.push({
          type: 'loading-aware',
          strategy: 'wait-for-loading',
          description: 'Wait for loading indicators to disappear',
          confidence: 0.9,
          implementation: {
            waitForLoadingToDisappear: true,
            loadingSelectors: ['.loading', '.spinner', '.loader', '[data-loading]'],
            timeout: 30000
          }
        });
      }
      
      // Check for modals or overlays
      if (pageContent.hasModals) {
        suggestions.push({
          type: 'modal-aware',
          strategy: 'handle-modals',
          description: 'Handle modal dialogs that might be blocking interaction',
          confidence: 0.8,
          implementation: {
            checkForModals: true,
            modalSelectors: ['.modal', '.dialog', '.overlay', '[role="dialog"]'],
            dismissModals: true
          }
        });
      }
    }
    
    return suggestions;
  }

  findSimilarElements(targetElement, pageElements) {
    const similar = [];
    
    pageElements.forEach(element => {
      const similarity = this.calculateElementSimilarity(targetElement, element);
      if (similarity > 0.5) {
        similar.push({
          ...element,
          similarity
        });
      }
    });
    
    return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  calculateElementSimilarity(element1, element2) {
    let similarity = 0;
    let factors = 0;
    
    // Text similarity
    if (element1.text && element2.text) {
      const textSim = this.calculateTextSimilarity(element1.text, element2.text);
      similarity += textSim * 0.4;
      factors += 0.4;
    }
    
    // Tag similarity
    if (element1.tagName === element2.tagName) {
      similarity += 0.2;
    }
    factors += 0.2;
    
    // Class similarity
    if (element1.className && element2.className) {
      const class1 = element1.className.split(' ');
      const class2 = element2.className.split(' ');
      const commonClasses = class1.filter(c => class2.includes(c));
      const classSim = commonClasses.length / Math.max(class1.length, class2.length);
      similarity += classSim * 0.2;
    }
    factors += 0.2;
    
    // Type similarity (for inputs)
    if (element1.type && element2.type && element1.type === element2.type) {
      similarity += 0.2;
    }
    factors += 0.2;
    
    return factors > 0 ? similarity / factors : 0;
  }

  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  calculateConfidence(suggestions, failure) {
    if (suggestions.length === 0) return 0;
    
    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;
    
    // Adjust based on failure history
    const historicalSuccess = this.getHistoricalSuccessRate(failure.selector);
    
    return Math.min(1, avgConfidence * (0.5 + historicalSuccess * 0.5));
  }

  calculatePriority(failure, failureType) {
    const basePriority = {
      'element-not-found': 9,
      'element-not-interactable': 8,
      'element-detached': 7,
      'network-issue': 6,
      'permission-issue': 5,
      'unknown': 3
    };
    
    let priority = basePriority[failureType] || 3;
    
    // Increase priority for frequently failing elements
    const failureCount = this.getFailureCount(failure.selector);
    if (failureCount > 5) priority += 2;
    else if (failureCount > 2) priority += 1;
    
    return Math.min(10, priority);
  }

  async applySuggestions(testId, suggestions, healingContext = {}) {
    console.log(`🔧 Applying ${suggestions.length} AI-enhanced healing suggestions for test ${testId}`);
    
    const results = [];
    
    for (const suggestion of suggestions) {
      try {
        const startTime = Date.now();
        const result = await this.applySingleSuggestion(testId, suggestion);
        const executionTime = Date.now() - startTime;
        
        // Enhanced result with timing and context
        const enhancedResult = {
          ...result,
          executionTime,
          suggestionType: suggestion.type,
          strategy: suggestion.strategy,
          originalConfidence: suggestion.confidence
        };
        
        results.push(enhancedResult);
        
        if (result.success) {
          this.analytics.successfulHealings++;
          this.recordSuccessfulHealing(suggestion);
          
          // Learn from successful healing
          await this.autoLearningEngine.recordSuccess({
            ...healingContext,
            suggestion,
            result: enhancedResult
          });
          
          // Update confidence scoring with actual result
          await this.confidenceScoring.learnFromHealingResult(
            healingContext,
            { success: true, executionTime, errorType: null }
          );
        } else {
          this.analytics.failedHealings++;
          
          // Learn from failed healing
          await this.autoLearningEngine.recordFailure({
            ...healingContext,
            suggestion,
            result: enhancedResult
          });
          
          // Update confidence scoring with actual result
          await this.confidenceScoring.learnFromHealingResult(
            healingContext,
            { success: false, executionTime, errorType: result.error }
          );
        }
        
        this.updateStrategyStats(suggestion.strategy, result.success);
        
      } catch (error) {
        const failedResult = {
          suggestionId: suggestion.id || `${suggestion.type}-${Date.now()}`,
          success: false,
          error: error.message,
          suggestionType: suggestion.type,
          strategy: suggestion.strategy
        };
        
        results.push(failedResult);
        this.analytics.failedHealings++;
        
        // Learn from exception
        await this.autoLearningEngine.recordFailure({
          ...healingContext,
          suggestion,
          result: failedResult
        });
      }
    }
    
    // Trigger model retraining if enough new data
    await this.autoLearningEngine.checkAndRetrain();
    
    await this.saveHealingResults(testId, results);
    
    return {
      testId,
      appliedSuggestions: results.length,
      successfulHealings: results.filter(r => r.success).length,
      aiSuggestions: results.filter(r => r.suggestionType?.includes('ai')).length,
      visualSuggestions: results.filter(r => r.suggestionType === 'visual-regression-healing').length,
      crossBrowserSuggestions: results.filter(r => r.suggestionType === 'cross-browser-healing').length,
      learningSuggestions: results.filter(r => r.suggestionType === 'auto-learning').length,
      results
    };
  }

  async applySingleSuggestion(testId, suggestion) {
    // This would integrate with the test runner to apply the suggestion
    // For now, we'll simulate the application
    
    const { type, implementation } = suggestion;
    
    // Simulate success/failure based on confidence
    const success = Math.random() < suggestion.confidence;
    
    return {
      suggestionId: suggestion.id || `${type}-${Date.now()}`,
      type,
      success,
      appliedAt: new Date().toISOString(),
      implementation: success ? implementation : null,
      error: success ? null : 'Simulated failure for demonstration'
    };
  }

  recordSuccessfulHealing(suggestion) {
    const key = `${suggestion.type}-${suggestion.strategy}`;
    this.healingHistory.set(key, {
      ...suggestion,
      lastUsed: new Date().toISOString(),
      successCount: (this.healingHistory.get(key)?.successCount || 0) + 1
    });
  }

  updateStrategyStats(strategy, success) {
    const current = this.analytics.strategiesUsed.get(strategy) || { used: 0, successful: 0 };
    current.used++;
    if (success) current.successful++;
    this.analytics.strategiesUsed.set(strategy, current);
  }

  updateFailureStats(failureType) {
    const current = this.analytics.commonFailures.get(failureType) || 0;
    this.analytics.commonFailures.set(failureType, current + 1);
  }

  getHistoricalFailures(selector) {
    // This would query historical failure data
    // For now, return empty array
    return [];
  }

  getHistoricalSuccessRate(selector) {
    // This would calculate success rate from historical data
    // For now, return a default value
    return 0.7;
  }

  getFailureCount(selector) {
    // This would count failures for a selector
    // For now, return a random count
    return Math.floor(Math.random() * 10);
  }

  async getAnalytics() {
    const baseAnalytics = {
      ...this.analytics,
      strategiesUsed: Object.fromEntries(this.analytics.strategiesUsed),
      commonFailures: Object.fromEntries(this.analytics.commonFailures),
      healingSuccessRate: this.analytics.totalHealingAttempts > 0 
        ? this.analytics.successfulHealings / this.analytics.totalHealingAttempts 
        : 0,
      topStrategies: this.getTopStrategies(),
      healingTrends: this.generateHealingTrends(),
      // Additional fields for AIHealingWidget compatibility
      averageHealingTime: this.calculateAverageHealingTime(),
      activeHealingSessions: this.getActiveHealingSessions(),
      recentActivity: this.getRecentActivity()
    };
    
    // Enhanced analytics with AI services data
    try {
      const aiAnalytics = this.aiElementDetection.getAnalytics() || {};
      const visualAnalytics = this.visualRegressionHealing.getAnalytics() || {};
      const learningAnalytics = this.autoLearningEngine.getAnalytics() || {};
      const browserAnalytics = this.crossBrowserHealing.getAnalytics() || {};
      const confidenceAnalytics = this.confidenceScoring.getAnalytics() || {};
      
      return {
        ...baseAnalytics,
        aiEnhancements: {
          elementDetection: {
            modelsLoaded: aiAnalytics.modelsLoaded || 0,
            predictionsGenerated: aiAnalytics.predictionsGenerated || 0,
            averageConfidence: aiAnalytics.averageConfidence || 0,
            featureExtractionTime: aiAnalytics.averageFeatureExtractionTime || 0
          },
          visualRegression: {
            imagesProcessed: visualAnalytics.imagesProcessed || 0,
            visualChangesDetected: visualAnalytics.visualChangesDetected || 0,
            averageProcessingTime: visualAnalytics.averageProcessingTime || 0,
            uiElementsDetected: visualAnalytics.uiElementsDetected || 0
          },
          autoLearning: {
            patternsLearned: learningAnalytics.patternsLearned || 0,
            modelsRetrained: learningAnalytics.modelsRetrained || 0,
            strategyEffectiveness: learningAnalytics.strategyEffectiveness || {},
            learningAccuracy: learningAnalytics.learningAccuracy || 0
          },
          crossBrowser: {
            browserStrategies: browserAnalytics.browserStrategies || {},
            compatibilityScore: browserAnalytics.averageCompatibilityScore || 0,
            quirksHandled: browserAnalytics.quirksHandled || 0,
            browserOptimizations: browserAnalytics.optimizationsApplied || 0
          },
          confidenceScoring: {
            totalSelectors: confidenceAnalytics.totalSelectors || 0,
            reliableSelectors: confidenceAnalytics.reliableSelectors || 0,
            reliabilityPercentage: confidenceAnalytics.reliabilityPercentage || 0,
            avgSuccessRate: confidenceAnalytics.avgSuccessRate || 0,
            strategyStats: confidenceAnalytics.strategyStats || []
          }
        },
        enhancedMetrics: {
          aiPoweredSuggestions: this.getAIPoweredSuggestionStats(),
          healingEfficiencyImprovement: this.calculateEfficiencyImprovement(),
          crossBrowserCompatibility: this.getCrossBrowserStats(),
          learningProgress: this.getLearningProgressStats()
        }
      };
    } catch (error) {
      console.warn('Failed to gather enhanced analytics:', error.message);
      return baseAnalytics;
    }
  }
  
  getAIPoweredSuggestionStats() {
    const aiStrategies = Array.from(this.analytics.strategiesUsed.entries())
      .filter(([name]) => name.includes('ai') || name.includes('machine-learning') || name.includes('computer-vision'))
      .reduce((acc, [name, stats]) => {
        acc[name] = stats;
        return acc;
      }, {});
    
    return {
      totalAISuggestions: Object.values(aiStrategies).reduce((sum, stats) => sum + stats.used, 0),
      aiSuccessRate: this.calculateAISuccessRate(aiStrategies),
      aiStrategies
    };
  }
  
  calculateAISuccessRate(aiStrategies) {
    const totalUsed = Object.values(aiStrategies).reduce((sum, stats) => sum + stats.used, 0);
    const totalSuccessful = Object.values(aiStrategies).reduce((sum, stats) => sum + stats.successful, 0);
    return totalUsed > 0 ? (totalSuccessful / totalUsed) * 100 : 0;
  }
  
  calculateEfficiencyImprovement() {
    // Calculate improvement metrics compared to traditional healing
    const traditionalStrategies = ['id-selector', 'class-selector', 'xpath-position'];
    const aiStrategies = ['machine-learning', 'computer-vision', 'learned-pattern'];
    
    const traditionalStats = this.getStrategyGroupStats(traditionalStrategies);
    const aiStats = this.getStrategyGroupStats(aiStrategies);
    
    return {
      traditionalSuccessRate: traditionalStats.successRate,
      aiSuccessRate: aiStats.successRate,
      improvement: aiStats.successRate - traditionalStats.successRate,
      efficiencyGain: aiStats.successRate > 0 ? 
        ((aiStats.successRate - traditionalStats.successRate) / traditionalStats.successRate) * 100 : 0
    };
  }
  
  getStrategyGroupStats(strategies) {
    const groupStats = strategies.reduce((acc, strategy) => {
      const stats = this.analytics.strategiesUsed.get(strategy);
      if (stats) {
        acc.used += stats.used;
        acc.successful += stats.successful;
      }
      return acc;
    }, { used: 0, successful: 0 });
    
    return {
      ...groupStats,
      successRate: groupStats.used > 0 ? (groupStats.successful / groupStats.used) * 100 : 0
    };
  }
  
  getCrossBrowserStats() {
    const browserStrategies = Array.from(this.analytics.strategiesUsed.entries())
      .filter(([name]) => name.includes('browser-specific'))
      .reduce((acc, [name, stats]) => {
        const browser = name.split('-').pop();
        acc[browser] = stats;
        return acc;
      }, {});
    
    return {
      supportedBrowsers: Object.keys(browserStrategies).length,
      browserStrategies,
      overallCompatibility: this.calculateOverallCompatibility(browserStrategies)
    };
  }
  
  calculateOverallCompatibility(browserStrategies) {
    const browsers = Object.values(browserStrategies);
    if (browsers.length === 0) return 0;
    
    const avgSuccessRate = browsers.reduce((sum, stats) => {
      return sum + (stats.used > 0 ? (stats.successful / stats.used) : 0);
    }, 0) / browsers.length;
    
    return Math.round(avgSuccessRate * 100);
  }
  
  getLearningProgressStats() {
    const learningStrategies = Array.from(this.analytics.strategiesUsed.entries())
      .filter(([name]) => name.includes('learned') || name.includes('auto-learning'))
      .reduce((acc, [name, stats]) => {
        acc.totalLearned += stats.used;
        acc.successfulLearned += stats.successful;
        return acc;
      }, { totalLearned: 0, successfulLearned: 0 });
    
    return {
      ...learningStrategies,
      learningEffectiveness: learningStrategies.totalLearned > 0 ? 
        (learningStrategies.successfulLearned / learningStrategies.totalLearned) * 100 : 0,
      adaptationRate: this.calculateAdaptationRate()
    };
  }
  
  calculateAdaptationRate() {
    // Calculate how quickly the system adapts to new patterns
    const recentTrends = this.analytics.healingTrends.slice(-7); // Last 7 days
    if (recentTrends.length < 2) return 0;
    
    const initialSuccess = recentTrends[0].successfulHealings;
    const finalSuccess = recentTrends[recentTrends.length - 1].successfulHealings;
    
    return finalSuccess > initialSuccess ? 
      ((finalSuccess - initialSuccess) / initialSuccess) * 100 : 0;
  }

  getTopStrategies() {
    const strategies = Array.from(this.analytics.strategiesUsed.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        successRate: stats.used > 0 ? stats.successful / stats.used : 0
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);
    
    return strategies;
  }

  generateHealingTrends() {
    // Generate sample trend data
    const trends = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        healingAttempts: Math.floor(Math.random() * 20),
        successfulHealings: Math.floor(Math.random() * 15),
        newStrategiesLearned: Math.floor(Math.random() * 3)
      });
    }
    
    return trends;
  }

  async loadHealingHistory() {
    try {
      const historyPath = path.join(this.dataDir, 'healing-history.json');
      const content = await fs.readFile(historyPath, 'utf8');
      const history = JSON.parse(content);
      
      this.healingHistory = new Map(Object.entries(history));
      console.log(`📚 Loaded ${this.healingHistory.size} healing history entries`);
    } catch (error) {
      console.log('📚 No healing history found, starting fresh');
    }
  }

  async saveAnalysisResults(suggestions) {
    const filePath = path.join(this.dataDir, `analysis-${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(suggestions, null, 2));
  }

  async saveHealingResults(testId, results) {
    const filePath = path.join(this.dataDir, `healing-${testId}-${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(results, null, 2));
  }

  async generateCustomStrategySuggestions(failure, failureType, pageContent) {
    const suggestions = [];
    const { action, selector, element } = failure;
    
    try {
      // Create element context from failure information
      const elementContext = {
        originalSelector: selector,
        tagName: element?.tagName || 'unknown',
        attributes: element?.attributes || {},
        textContent: element?.textContent || element?.text || '',
        isVisible: element?.isVisible,
        role: element?.role,
        ariaName: element?.ariaName,
        ariaLabel: element?.ariaLabel,
        nearbyLabels: element?.nearbyLabels || [],
        stableAnchors: element?.stableAnchors || []
      };
      
      // Create strategy instances for the current page context
      const strategyInstances = this.strategyLoader.createStrategyInstances({
        $: () => null, // Mock page object for now
        $$: () => [], 
        evaluate: () => null
      });
      
      // Run each strategy to generate candidates
      for (const { name, instance, priority } of strategyInstances) {
        try {
          console.log(`🔍 Running custom strategy: ${name}`);
          
          // Generate candidates using the strategy
          const candidates = await instance.generateCandidates(elementContext);
          
          // Add candidates to suggestions
          for (const candidate of candidates) {
            suggestions.push({
              selector: candidate.selector,
              strategy: name,
              confidence: candidate.confidence,
              features: candidate.features || {},
              reasoning: candidate.reasoning || `Generated by ${name} strategy`,
              priority: priority,
              metadata: {
                strategyType: 'custom-typescript',
                originalStrategy: name,
                failureType: failureType
              }
            });
          }
          
          console.log(`✅ ${name} generated ${candidates.length} candidates`);
        } catch (strategyError) {
          console.warn(`⚠️ Strategy ${name} failed:`, strategyError.message);
        }
      }
      
      // Sort by confidence and priority
      suggestions.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.confidence - a.confidence;
      });
      
      console.log(`🎯 Generated ${suggestions.length} custom strategy suggestions`);
      
    } catch (error) {
      console.error('❌ Failed to generate custom strategy suggestions:', error);
    }
    
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  calculateAverageHealingTime() {
    // Calculate average healing time from recent healing attempts
    const recentHealings = Array.from(this.healingHistory.values())
      .filter(entry => entry.timestamp > Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      .filter(entry => entry.healingTime);
    
    if (recentHealings.length === 0) return 2500; // Default 2.5 seconds
    
    const totalTime = recentHealings.reduce((sum, entry) => sum + (entry.healingTime || 0), 0);
    return totalTime / recentHealings.length;
  }

  getActiveHealingSessions() {
    // Count active healing sessions (simulated based on recent activity)
    const recentActivity = Array.from(this.healingHistory.values())
      .filter(entry => entry.timestamp > Date.now() - 5 * 60 * 1000); // Last 5 minutes
    
    return Math.min(recentActivity.length, 10); // Cap at 10 for realism
  }

  getRecentActivity() {
    // Get recent activity stats for the last 7 days, grouped by day
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEntries = Array.from(this.healingHistory.values())
      .filter(entry => entry.timestamp > sevenDaysAgo);
    
    // Group by date
    const dailyActivity = new Map();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyActivity.set(dateStr, {
        date: dateStr,
        healingAttempts: 0,
        successfulHealings: 0,
        newStrategiesLearned: 0
      });
    }
    
    // Populate with actual data
    recentEntries.forEach(entry => {
      const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
      const dayData = dailyActivity.get(entryDate);
      if (dayData) {
        dayData.healingAttempts++;
        if (entry.success) dayData.successfulHealings++;
        if (entry.strategyLearned) dayData.newStrategiesLearned++;
      }
    });
    
    return Array.from(dailyActivity.values());
  }

  async seedSampleDataIfNeeded() {
    try {
      // Check if we have any real healing data
      const hasRealData = this.analytics.totalHealingAttempts > 0 || 
                         this.analytics.successfulHealings > 0 || 
                         this.analytics.recentFailures.length > 0;
      
      if (!hasRealData) {
        console.log('🌱 Seeding sample healing data for demonstration...');
        
        // Seed sample analytics data
        this.analytics.totalHealingAttempts = 47;
        this.analytics.successfulHealings = 42;
        this.analytics.failedHealings = 5;
        this.analytics.averageHealingTime = 1250;
        
        // Add sample failure types
        this.analytics.failureTypes = {
          'element-not-found': 18,
          'element-not-interactable': 12,
          'element-detached': 8,
          'network-issue': 5,
          'permission-issue': 2,
          'unknown': 2
        };
        
        // Add sample strategy performance
        this.analytics.strategyPerformance = {
          'css-selector-alternatives': { attempts: 15, successes: 14, avgTime: 890 },
          'xpath-alternatives': { attempts: 12, successes: 10, avgTime: 1200 },
          'text-based-selection': { attempts: 8, successes: 7, avgTime: 950 },
          'attribute-based-selection': { attempts: 6, successes: 6, avgTime: 750 },
          'wait-and-retry': { attempts: 6, successes: 5, avgTime: 2100 }
        };
        
        // Add sample recent activities
        const now = Date.now();
        this.analytics.recentFailures = [
          {
            timestamp: now - 3600000, // 1 hour ago
            testId: 'test-login-form',
            failureType: 'element-not-found',
            selector: '#login-button'
          },
          {
            timestamp: now - 7200000, // 2 hours ago
            testId: 'test-checkout-flow',
            failureType: 'element-not-interactable',
            selector: '.checkout-btn'
          }
        ];
        
        this.analytics.recentSuccesses = [
          {
            timestamp: now - 1800000, // 30 minutes ago
            testId: 'test-navigation',
            strategy: 'css-selector-alternatives',
            healingTime: 850
          },
          {
            timestamp: now - 5400000, // 1.5 hours ago
            testId: 'test-form-submission',
            strategy: 'attribute-based-selection',
            healingTime: 650
          }
        ];
        
        // Add sample AI enhancements
        this.analytics.aiEnhancements = {
          neuralNetworkPredictions: 23,
          visualRegressionFixes: 8,
          crossBrowserOptimizations: 12,
          autoLearningImprovements: 15
        };
        
        console.log('✅ Sample healing data seeded successfully');
      }
    } catch (error) {
      console.warn('⚠️ Failed to seed sample data:', error.message);
    }
  }
}

export default HealingEngine;