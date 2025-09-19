import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import NeuralNetworkService from './NeuralNetworkService.js';
import * as tf from '@tensorflow/tfjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced AutoLearningEngine with full TensorFlow.js deep learning implementation
 * Uses neural networks to predict strategy effectiveness and optimize healing decisions
 */
class AutoLearningEngine {
  constructor() {
    this.dataDir = path.join(__dirname, '../data/learning');
    this.failurePatterns = new Map();
    this.successPatterns = new Map();
    this.strategyEffectiveness = new Map();
    
    // Neural network service for deep learning
    this.neuralService = new NeuralNetworkService();
    
    // Model names for different prediction tasks
    this.strategyModelName = 'strategy-effectiveness-model';
    this.healingModelName = 'healing-prediction-model';
    this.patternModelName = 'pattern-recognition-model';
    
    // Enhanced learning configuration
    this.isModelTrained = false;
    this.learningData = [];
    this.adaptiveStrategies = new Map();
    this.featureConfig = {
      inputSize: 25, // Enhanced feature vector size
      hiddenLayers: [64, 32, 16], // Deep network architecture
      outputSize: 1,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100
    };
    
    // Performance tracking
    this.modelMetrics = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      lastTraining: null
    };
    
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Initialize neural network service
      await this.neuralService.initialize();
      
      // Initialize deep learning models
      await this.initializeModels();
      
      // Load existing data and models
      await this.loadLearningData();
      await this.loadExistingModels();
      
      this.initializeDefaultStrategies();
      
      console.log('AutoLearningEngine initialized with neural networks');
    } catch (error) {
      console.error('Error initializing AutoLearningEngine:', error);
      console.log('Initializing new auto-learning engine');
    }
  }

  /**
   * Initialize TensorFlow.js models for different prediction tasks
   */
  async initializeModels() {
    try {
      // Strategy effectiveness prediction model
      const strategyModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [this.featureConfig.inputSize], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });
      
      strategyModel.compile({
        optimizer: tf.train.adam(this.featureConfig.learningRate),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      await this.neuralService.createModel(this.strategyModelName, strategyModel, 'tensorflow');
      
      // Healing success prediction model
      const healingModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [this.featureConfig.inputSize], units: 128, activation: 'relu' }),
          tf.layers.batchNormalization(),
          tf.layers.dropout({ rate: 0.4 }),
          tf.layers.dense({ units: 64, activation: 'relu' }),
          tf.layers.batchNormalization(),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });
      
      healingModel.compile({
        optimizer: tf.train.adam(this.featureConfig.learningRate),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      await this.neuralService.createModel(this.healingModelName, healingModel, 'tensorflow');
      
      // Pattern recognition model for failure analysis
      const patternModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [this.featureConfig.inputSize], units: 96, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 48, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 24, activation: 'relu' }),
          tf.layers.dense({ units: 8, activation: 'softmax' }) // Multi-class for different failure types
        ]
      });
      
      patternModel.compile({
        optimizer: tf.train.adam(this.featureConfig.learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      
      await this.neuralService.createModel(this.patternModelName, patternModel, 'tensorflow');
      
      console.log('Neural network models initialized successfully');
    } catch (error) {
      console.error('Error initializing models:', error);
    }
  }

  /**
   * Load existing trained models
   */
  async loadExistingModels() {
    try {
      await this.neuralService.loadModel(this.strategyModelName, 'tensorflow');
      await this.neuralService.loadModel(this.healingModelName, 'tensorflow');
      await this.neuralService.loadModel(this.patternModelName, 'tensorflow');
      
      this.isModelTrained = true;
      console.log('Existing neural network models loaded successfully');
    } catch (error) {
      console.log('No existing models found, will train new ones');
      this.isModelTrained = false;
    }
  }

  // Alias for compatibility
  async initialize() {
    return this.init();
  }

  // Initialize default healing strategies
  initializeDefaultStrategies() {
    const defaultStrategies = [
      {
        name: 'id_selector',
        priority: 0.9,
        pattern: /^#[\w-]+$/,
        effectiveness: 0.85,
        conditions: ['hasId']
      },
      {
        name: 'data_testid',
        priority: 0.85,
        pattern: /\[data-testid="[^"]+"\]/,
        effectiveness: 0.80,
        conditions: ['hasDataTestId']
      },
      {
        name: 'class_selector',
        priority: 0.7,
        pattern: /^\.[\w.-]+$/,
        effectiveness: 0.65,
        conditions: ['hasClass']
      },
      {
        name: 'text_selector',
        priority: 0.6,
        pattern: /text=/,
        effectiveness: 0.70,
        conditions: ['hasText']
      },
      {
        name: 'xpath_selector',
        priority: 0.5,
        pattern: /^\/\//,
        effectiveness: 0.55,
        conditions: ['complex']
      },
      {
        name: 'css_nth_child',
        priority: 0.4,
        pattern: /:nth-child\(\d+\)/,
        effectiveness: 0.45,
        conditions: ['positional']
      }
    ];

    defaultStrategies.forEach(strategy => {
      this.strategyEffectiveness.set(strategy.name, {
        ...strategy,
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: null,
        adaptiveScore: strategy.effectiveness
      });
    });
  }

  // Learn from test execution results
  async learnFromExecution(executionData) {
    const {
      testName,
      selector,
      strategy,
      success,
      errorType,
      elementContext,
      browserInfo,
      timestamp,
      retryCount,
      healingAttempts
    } = executionData;

    // Extract features for learning
    const features = this.extractExecutionFeatures(executionData);
    
    // Update strategy effectiveness
    await this.updateStrategyEffectiveness(strategy, success, features);
    
    // Learn failure patterns
    if (!success) {
      await this.analyzeFailurePattern(executionData, features);
    } else {
      await this.analyzeSuccessPattern(executionData, features);
    }
    
    // Add to learning dataset
    this.learningData.push({
      features,
      success,
      strategy,
      timestamp,
      testName,
      selector
    });
    
    // Retrain model periodically
    if (this.learningData.length % 100 === 0) {
      await this.retrainModel();
    }
    
    await this.saveLearningData();
  }

  /**
   * Extract comprehensive features from execution data for neural network training
   * Returns a normalized feature vector of size 25
   */
  extractExecutionFeatures(executionData) {
    const {
      selector,
      strategy,
      elementContext,
      browserInfo,
      retryCount,
      healingAttempts,
      errorType,
      testName,
      timestamp
    } = executionData;

    const features = {
      // Selector characteristics (7 features)
      selectorLength: Math.min((selector?.length || 0) / 200, 1), // Normalized to 0-1
      hasId: selector ? (selector.includes('#') ? 1 : 0) : 0,
      hasClass: selector ? (selector.includes('.') ? 1 : 0) : 0,
      hasDataTestId: selector ? (selector.includes('data-testid') ? 1 : 0) : 0,
      hasText: selector ? (selector.includes('text=') ? 1 : 0) : 0,
      hasXPath: selector ? (selector.startsWith('//') ? 1 : 0) : 0,
      hasNthChild: selector ? (selector.includes(':nth-child') ? 1 : 0) : 0,
      
      // Advanced selector characteristics (3 features)
      selectorComplexity: this.calculateSelectorComplexity(selector),
      hasAttribute: selector ? (selector.includes('[') && selector.includes(']') ? 1 : 0) : 0,
      hasPseudoClass: selector ? (selector.includes(':') ? 1 : 0) : 0,
      
      // Strategy characteristics (3 features)
      strategyPriority: this.getStrategyPriority(strategy),
      strategyEffectiveness: this.getStrategyEffectiveness(strategy),
      strategyUsageFrequency: this.getStrategyUsageFrequency(strategy),
      
      // Element context (5 features)
      elementVisible: elementContext?.visible ? 1 : 0,
      elementEnabled: elementContext?.enabled ? 1 : 0,
      elementType: this.encodeElementType(elementContext?.tagName),
      elementInteractable: this.isElementInteractable(elementContext) ? 1 : 0,
      elementStability: this.calculateElementStability(elementContext),
      
      // Browser and environment (3 features)
      browserType: this.encodeBrowserType(browserInfo?.name),
      browserVersion: browserInfo?.version ? Math.min(browserInfo.version / 120, 1) : 0,
      viewportSize: this.encodeViewportSize(browserInfo?.viewport),
      
      // Execution characteristics (2 features)
      retryCount: Math.min((retryCount || 0) / 10, 1),
      healingAttempts: Math.min((healingAttempts || 0) / 5, 1),
      
      // Error and failure analysis (2 features)
      errorType: this.encodeErrorType(errorType),
      errorSeverity: this.calculateErrorSeverity(errorType),
      
      // Temporal and contextual features (2 features)
      hourOfDay: new Date(timestamp || Date.now()).getHours() / 24,
      testComplexity: this.calculateTestComplexity(testName)
    };

    // Convert to array and ensure exactly 25 features
    const featureArray = Object.values(features);
    while (featureArray.length < 25) {
      featureArray.push(0); // Pad with zeros if needed
    }
    
    return featureArray.slice(0, 25); // Ensure exactly 25 features
  }

  /**
   * Calculate selector complexity based on various factors
   */
  calculateSelectorComplexity(selector) {
    if (!selector) return 0;
    
    let complexity = 0;
    complexity += (selector.split(' ').length - 1) * 0.1; // Descendant selectors
    complexity += (selector.split('>').length - 1) * 0.15; // Child selectors
    complexity += (selector.match(/\[.*?\]/g) || []).length * 0.2; // Attribute selectors
    complexity += (selector.match(/:\w+/g) || []).length * 0.1; // Pseudo-classes
    
    return Math.min(complexity, 1);
  }

  /**
   * Get strategy usage frequency
   */
  getStrategyUsageFrequency(strategy) {
    const strategyData = this.strategyEffectiveness.get(strategy);
    if (!strategyData) return 0;
    
    const totalUsage = Array.from(this.strategyEffectiveness.values())
      .reduce((sum, data) => sum + data.usageCount, 0);
    
    return totalUsage > 0 ? strategyData.usageCount / totalUsage : 0;
  }

  /**
   * Check if element is interactable
   */
  isElementInteractable(elementContext) {
    if (!elementContext) return false;
    
    const interactableTags = ['button', 'input', 'select', 'textarea', 'a', 'label'];
    return interactableTags.includes(elementContext.tagName?.toLowerCase());
  }

  /**
   * Calculate element stability score
   */
  calculateElementStability(elementContext) {
    if (!elementContext) return 0;
    
    let stability = 0.5; // Base stability
    
    if (elementContext.id) stability += 0.3;
    if (elementContext.className) stability += 0.1;
    if (elementContext.getAttribute?.('data-testid')) stability += 0.4;
    
    return Math.min(stability, 1);
  }

  /**
   * Encode viewport size
   */
  encodeViewportSize(viewport) {
    if (!viewport) return 0.5;
    
    const { width, height } = viewport;
    const area = width * height;
    
    // Normalize based on common screen sizes
    if (area < 800 * 600) return 0.2; // Small
    if (area < 1920 * 1080) return 0.5; // Medium
    return 0.8; // Large
  }

  /**
   * Calculate error severity
   */
  calculateErrorSeverity(errorType) {
    const severityMap = {
      'element_not_found': 0.8,
      'timeout': 0.6,
      'element_not_visible': 0.4,
      'element_not_clickable': 0.5,
      'stale_element': 0.7,
      'network_error': 0.9,
      'script_error': 0.8
    };
    
    return severityMap[errorType] || 0.5;
  }

  /**
   * Calculate test complexity based on test name
   */
  calculateTestComplexity(testName) {
    if (!testName) return 0.5;
    
    let complexity = 0;
    complexity += testName.split(' ').length * 0.05; // Word count
    complexity += (testName.match(/\d+/g) || []).length * 0.1; // Numbers
    complexity += testName.includes('complex') ? 0.3 : 0;
    complexity += testName.includes('integration') ? 0.2 : 0;
    
    return Math.min(complexity, 1);
  }

  // Analyze failure patterns to improve future healing
  async analyzeFailurePattern(executionData, features) {
    const { selector, strategy, errorType, elementContext } = executionData;
    
    const patternKey = `${strategy}_${errorType}`;
    
    if (!this.failurePatterns.has(patternKey)) {
      this.failurePatterns.set(patternKey, {
        count: 0,
        selectors: new Set(),
        commonFeatures: {},
        suggestedAlternatives: new Set()
      });
    }
    
    const pattern = this.failurePatterns.get(patternKey);
    pattern.count++;
    pattern.selectors.add(selector);
    
    // Accumulate common features
    Object.keys(features).forEach(key => {
      if (!pattern.commonFeatures[key]) {
        pattern.commonFeatures[key] = [];
      }
      pattern.commonFeatures[key].push(features[key]);
    });
    
    // Suggest alternative strategies based on failure analysis
    const alternatives = this.suggestAlternativeStrategies(strategy, features, errorType);
    alternatives.forEach(alt => pattern.suggestedAlternatives.add(alt));
  }

  // Analyze success patterns to reinforce effective strategies
  async analyzeSuccessPattern(executionData, features) {
    const { selector, strategy } = executionData;
    
    if (!this.successPatterns.has(strategy)) {
      this.successPatterns.set(strategy, {
        count: 0,
        selectors: new Set(),
        effectiveFeatures: {},
        avgConfidence: 0
      });
    }
    
    const pattern = this.successPatterns.get(strategy);
    pattern.count++;
    pattern.selectors.add(selector);
    
    // Track effective feature combinations
    Object.keys(features).forEach(key => {
      if (!pattern.effectiveFeatures[key]) {
        pattern.effectiveFeatures[key] = [];
      }
      pattern.effectiveFeatures[key].push(features[key]);
    });
  }

  // Update strategy effectiveness based on results
  async updateStrategyEffectiveness(strategy, success, features) {
    if (!this.strategyEffectiveness.has(strategy)) {
      this.strategyEffectiveness.set(strategy, {
        name: strategy,
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        effectiveness: 0.5,
        adaptiveScore: 0.5,
        lastUsed: Date.now()
      });
    }
    
    const strategyData = this.strategyEffectiveness.get(strategy);
    strategyData.usageCount++;
    strategyData.lastUsed = Date.now();
    
    if (success) {
      strategyData.successCount++;
    } else {
      strategyData.failureCount++;
    }
    
    // Calculate new effectiveness
    strategyData.effectiveness = strategyData.successCount / strategyData.usageCount;
    
    // Calculate adaptive score with recency bias
    const recencyFactor = this.calculateRecencyFactor(strategyData.lastUsed);
    strategyData.adaptiveScore = (strategyData.effectiveness * 0.7) + (recencyFactor * 0.3);
  }

  // Suggest alternative strategies based on failure analysis
  suggestAlternativeStrategies(failedStrategy, features, errorType) {
    const alternatives = [];
    
    // Rule-based suggestions based on error type
    switch (errorType) {
      case 'ElementNotFound':
        if (features.hasId && failedStrategy !== 'id_selector') {
          alternatives.push('id_selector');
        }
        if (features.hasDataTestId && failedStrategy !== 'data_testid') {
          alternatives.push('data_testid');
        }
        if (features.hasText && failedStrategy !== 'text_selector') {
          alternatives.push('text_selector');
        }
        break;
        
      case 'ElementNotVisible':
        alternatives.push('wait_for_visible');
        alternatives.push('scroll_into_view');
        break;
        
      case 'ElementNotClickable':
        alternatives.push('force_click');
        alternatives.push('javascript_click');
        break;
        
      case 'StaleElement':
        alternatives.push('refetch_element');
        alternatives.push('xpath_selector');
        break;
    }
    
    // ML-based suggestions
    if (this.isModelTrained) {
      const mlSuggestions = this.getMachineLearningAlternatives(features);
      alternatives.push(...mlSuggestions);
    }
    
    return alternatives;
  }

  // Get ML-based alternative strategies
  getMachineLearningAlternatives(features) {
    if (!this.isModelTrained) return [];
    
    const alternatives = [];
    const strategies = Array.from(this.strategyEffectiveness.keys());
    
    strategies.forEach(strategy => {
      const testFeatures = { ...features, strategy: this.encodeStrategy(strategy) };
      const prediction = this.learningModel.run(Object.values(testFeatures));
      
      if (prediction.success > 0.7) {
        alternatives.push({
          strategy,
          confidence: prediction.success,
          source: 'ml_prediction'
        });
      }
    });
    
    return alternatives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(alt => alt.strategy);
  }

  /**
   * Retrain neural network models with accumulated learning data
   */
  async retrainModel() {
    if (this.learningData.length < 50) {
      console.log('Insufficient data for model training (need at least 50 samples)');
      return;
    }
    
    console.log(`Retraining neural network models with ${this.learningData.length} samples`);
    
    try {
      // Prepare training data
      const { inputs, outputs, patternOutputs } = this.prepareTrainingData();
      
      // Train strategy effectiveness model
      await this.trainStrategyModel(inputs, outputs);
      
      // Train healing prediction model
      await this.trainHealingModel(inputs, outputs);
      
      // Train pattern recognition model
      await this.trainPatternModel(inputs, patternOutputs);
      
      // Update model metrics
      await this.evaluateModels(inputs, outputs);
      
      this.isModelTrained = true;
      await this.saveModels();
      
      console.log('Neural network model retraining completed successfully');
      console.log(`Model accuracy: ${(this.modelMetrics.accuracy * 100).toFixed(2)}%`);
    } catch (error) {
      console.error('Error during model retraining:', error);
    }
  }

  /**
   * Prepare training data for neural networks
   */
  prepareTrainingData() {
    const inputs = [];
    const outputs = [];
    const patternOutputs = [];
    
    this.learningData.forEach(sample => {
      // Ensure features is an array of 25 elements
      const features = Array.isArray(sample.features) ? 
        sample.features : Object.values(sample.features);
      
      if (features.length === 25) {
        inputs.push(features);
        outputs.push([sample.success ? 1 : 0]);
        
        // Create pattern classification output (8 classes for different failure types)
        const patternOutput = new Array(8).fill(0);
        const patternIndex = this.getPatternIndex(sample.strategy, sample.success);
        patternOutput[patternIndex] = 1;
        patternOutputs.push(patternOutput);
      }
    });
    
    return {
      inputs: tf.tensor2d(inputs),
      outputs: tf.tensor2d(outputs),
      patternOutputs: tf.tensor2d(patternOutputs)
    };
  }

  /**
   * Train strategy effectiveness prediction model
   */
  async trainStrategyModel(inputs, outputs) {
    const model = this.neuralService.getModel(this.strategyModelName);
    if (!model) {
      console.error('Strategy model not found');
      return;
    }
    
    console.log('Training strategy effectiveness model...');
    
    const history = await model.fit(inputs, outputs, {
      epochs: this.featureConfig.epochs,
      batchSize: this.featureConfig.batchSize,
      validationSplit: 0.2,
      shuffle: true,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 20 === 0) {
            console.log(`Strategy model - Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
          }
        }
      }
    });
    
    return history;
  }

  /**
   * Train healing success prediction model
   */
  async trainHealingModel(inputs, outputs) {
    const model = this.neuralService.getModel(this.healingModelName);
    if (!model) {
      console.error('Healing model not found');
      return;
    }
    
    console.log('Training healing prediction model...');
    
    const history = await model.fit(inputs, outputs, {
      epochs: Math.floor(this.featureConfig.epochs * 1.2), // Slightly more epochs for healing model
      batchSize: this.featureConfig.batchSize,
      validationSplit: 0.2,
      shuffle: true,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 25 === 0) {
            console.log(`Healing model - Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
          }
        }
      }
    });
    
    return history;
  }

  /**
   * Train pattern recognition model
   */
  async trainPatternModel(inputs, patternOutputs) {
    const model = this.neuralService.getModel(this.patternModelName);
    if (!model) {
      console.error('Pattern model not found');
      return;
    }
    
    console.log('Training pattern recognition model...');
    
    const history = await model.fit(inputs, patternOutputs, {
      epochs: this.featureConfig.epochs,
      batchSize: this.featureConfig.batchSize,
      validationSplit: 0.2,
      shuffle: true,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 20 === 0) {
            console.log(`Pattern model - Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
          }
        }
      }
    });
    
    return history;
  }

  /**
   * Get pattern index for classification
   */
  getPatternIndex(strategy, success) {
    const patterns = {
      'id_selector': success ? 0 : 1,
      'data_testid': success ? 0 : 2,
      'class_selector': success ? 0 : 3,
      'text_selector': success ? 0 : 4,
      'xpath_selector': success ? 0 : 5,
      'css_nth_child': success ? 0 : 6
    };
    
    return patterns[strategy] || 7; // Default pattern
  }

  /**
   * Evaluate model performance
   */
  async evaluateModels(inputs, outputs) {
    try {
      const strategyModel = this.neuralService.getModel(this.strategyModelName);
      const healingModel = this.neuralService.getModel(this.healingModelName);
      
      if (strategyModel && healingModel) {
        // Evaluate on a subset of data
        const evalSize = Math.min(100, inputs.shape[0]);
        const evalInputs = inputs.slice([0, 0], [evalSize, -1]);
        const evalOutputs = outputs.slice([0, 0], [evalSize, -1]);
        
        const strategyPredictions = strategyModel.predict(evalInputs);
        const healingPredictions = healingModel.predict(evalInputs);
        
        // Calculate accuracy
        const strategyAccuracy = await this.calculateAccuracy(strategyPredictions, evalOutputs);
        const healingAccuracy = await this.calculateAccuracy(healingPredictions, evalOutputs);
        
        this.modelMetrics.accuracy = (strategyAccuracy + healingAccuracy) / 2;
        this.modelMetrics.lastTraining = new Date().toISOString();
        
        // Cleanup tensors
        strategyPredictions.dispose();
        healingPredictions.dispose();
        evalInputs.dispose();
        evalOutputs.dispose();
      }
    } catch (error) {
      console.error('Error evaluating models:', error);
    }
  }

  /**
   * Calculate model accuracy
   */
  async calculateAccuracy(predictions, targets) {
    const predArray = await predictions.data();
    const targetArray = await targets.data();
    
    let correct = 0;
    for (let i = 0; i < predArray.length; i++) {
      const predicted = predArray[i] > 0.5 ? 1 : 0;
      const actual = targetArray[i];
      if (predicted === actual) correct++;
    }
    
    return correct / predArray.length;
  }

  /**
   * Get optimized healing strategy using neural network predictions
   */
  async getOptimizedStrategy(elementContext, browserInfo, previousFailures = []) {
    const features = this.extractContextFeatures(elementContext, browserInfo);
    
    // Get strategies sorted by adaptive effectiveness
    const strategies = Array.from(this.strategyEffectiveness.values())
      .filter(strategy => !previousFailures.includes(strategy.name))
      .sort((a, b) => b.adaptiveScore - a.adaptiveScore);
    
    // Use neural network predictions if available
    if (this.isModelTrained) {
      const mlPredictions = await Promise.all(strategies.map(async strategy => {
        const testFeatures = this.createFeatureVector(features, strategy.name);
        
        // Get predictions from both models
        const strategyPrediction = await this.predictStrategyEffectiveness(testFeatures);
        const healingPrediction = await this.predictHealingSuccess(testFeatures);
        const patternPrediction = await this.predictFailurePattern(testFeatures);
        
        // Combine predictions with historical data
        const mlConfidence = (strategyPrediction + healingPrediction) / 2;
        const patternRisk = Math.max(...patternPrediction); // Highest risk pattern
        
        const combinedScore = (
          strategy.adaptiveScore * 0.4 +
          mlConfidence * 0.4 +
          (1 - patternRisk) * 0.2 // Lower risk = higher score
        );
        
        return {
          ...strategy,
          mlConfidence,
          healingPrediction,
          patternRisk,
          combinedScore,
          neuralNetworkScore: true
        };
      }));
      
      return mlPredictions.sort((a, b) => b.combinedScore - a.combinedScore);
    }
    
    return strategies;
  }

  /**
   * Create feature vector for neural network prediction
   */
  createFeatureVector(contextFeatures, strategy) {
    // Create a full 25-feature vector
    const fullFeatures = new Array(25).fill(0);
    
    // Map context features to positions
    fullFeatures[0] = contextFeatures.hasId || 0;
    fullFeatures[1] = contextFeatures.hasClass || 0;
    fullFeatures[2] = contextFeatures.hasDataTestId || 0;
    fullFeatures[3] = contextFeatures.hasText || 0;
    fullFeatures[4] = contextFeatures.elementType || 0;
    fullFeatures[5] = contextFeatures.browserType || 0;
    fullFeatures[6] = contextFeatures.elementVisible || 0;
    fullFeatures[7] = contextFeatures.elementEnabled || 0;
    
    // Add strategy encoding
    fullFeatures[8] = this.encodeStrategy(strategy);
    
    // Add current time features
    fullFeatures[9] = new Date().getHours() / 24;
    
    // Fill remaining features with contextual data or defaults
    for (let i = 10; i < 25; i++) {
      fullFeatures[i] = Math.random() * 0.1; // Small random values for unused features
    }
    
    return fullFeatures;
  }

  /**
   * Predict strategy effectiveness using neural network
   */
  async predictStrategyEffectiveness(features) {
    try {
      const model = this.neuralService.getModel(this.strategyModelName);
      if (!model) return 0.5;
      
      const input = tf.tensor2d([features]);
      const prediction = model.predict(input);
      const result = await prediction.data();
      
      input.dispose();
      prediction.dispose();
      
      return result[0] || 0.5;
    } catch (error) {
      console.error('Error predicting strategy effectiveness:', error);
      return 0.5;
    }
  }

  /**
   * Predict healing success probability
   */
  async predictHealingSuccess(features) {
    try {
      const model = this.neuralService.getModel(this.healingModelName);
      if (!model) return 0.5;
      
      const input = tf.tensor2d([features]);
      const prediction = model.predict(input);
      const result = await prediction.data();
      
      input.dispose();
      prediction.dispose();
      
      return result[0] || 0.5;
    } catch (error) {
      console.error('Error predicting healing success:', error);
      return 0.5;
    }
  }

  /**
   * Predict failure pattern probabilities
   */
  async predictFailurePattern(features) {
    try {
      const model = this.neuralService.getModel(this.patternModelName);
      if (!model) return new Array(8).fill(0.125); // Equal probabilities
      
      const input = tf.tensor2d([features]);
      const prediction = model.predict(input);
      const result = await prediction.data();
      
      input.dispose();
      prediction.dispose();
      
      return Array.from(result);
    } catch (error) {
      console.error('Error predicting failure pattern:', error);
      return new Array(8).fill(0.125);
    }
  }

  /**
   * Encode strategy name to numerical value
   */
  encodeStrategy(strategyName) {
    const strategies = {
      'id_selector': 0.1,
      'data_testid': 0.2,
      'class_selector': 0.3,
      'text_selector': 0.4,
      'xpath_selector': 0.5,
      'css_nth_child': 0.6
    };
    
    return strategies[strategyName] || 0.7;
  }

  // Extract features from element context
  extractContextFeatures(elementContext, browserInfo) {
    return {
      hasId: elementContext?.id ? 1 : 0,
      hasClass: elementContext?.className ? 1 : 0,
      hasDataTestId: elementContext?.getAttribute?.('data-testid') ? 1 : 0,
      hasText: elementContext?.textContent ? 1 : 0,
      elementType: this.encodeElementType(elementContext?.tagName),
      browserType: this.encodeBrowserType(browserInfo?.name),
      elementVisible: elementContext?.visible ? 1 : 0,
      elementEnabled: elementContext?.enabled ? 1 : 0
    };
  }

  // Encoding helper methods
  encodeElementType(tagName) {
    const types = { 'BUTTON': 0.1, 'INPUT': 0.2, 'A': 0.3, 'DIV': 0.4, 'SPAN': 0.5 };
    return types[tagName?.toUpperCase()] || 0.6;
  }

  encodeBrowserType(browserName) {
    const browsers = { 'chromium': 0.1, 'firefox': 0.2, 'webkit': 0.3, 'chrome': 0.4 };
    return browsers[browserName?.toLowerCase()] || 0.5;
  }

  encodeErrorType(errorType) {
    const errors = {
      'ElementNotFound': 0.1,
      'ElementNotVisible': 0.2,
      'ElementNotClickable': 0.3,
      'StaleElement': 0.4,
      'Timeout': 0.5
    };
    return errors[errorType] || 0.6;
  }

  encodeStrategy(strategy) {
    const strategies = {
      'id_selector': 0.1,
      'data_testid': 0.2,
      'class_selector': 0.3,
      'text_selector': 0.4,
      'xpath_selector': 0.5,
      'css_nth_child': 0.6
    };
    return strategies[strategy] || 0.7;
  }

  getStrategyPriority(strategy) {
    const strategyData = this.strategyEffectiveness.get(strategy);
    return strategyData ? strategyData.priority || 0.5 : 0.5;
  }

  getStrategyEffectiveness(strategy) {
    const strategyData = this.strategyEffectiveness.get(strategy);
    return strategyData ? strategyData.effectiveness : 0.5;
  }

  calculateRecencyFactor(lastUsed) {
    const daysSinceUsed = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);
    return Math.max(0.1, 1 - (daysSinceUsed / 30)); // Decay over 30 days
  }

  // Save and load methods
  /**
   * Save all models and learning data
   */
  async saveData() {
    try {
      // Save neural network models
      await this.saveModels();
      
      // Save learning data
      const data = {
        strategyEffectiveness: Array.from(this.strategyEffectiveness.entries()),
        failurePatterns: Array.from(this.failurePatterns.entries()),
        successPatterns: Array.from(this.successPatterns.entries()),
        learningData: this.learningData,
        isModelTrained: this.isModelTrained,
        modelMetrics: this.modelMetrics,
        featureConfig: this.featureConfig
      };
      
      await fs.writeFile(
        path.join(this.dataDir, 'learning_data.json'),
        JSON.stringify(data, null, 2)
      );
      
      console.log('Learning data and models saved successfully');
    } catch (error) {
      console.error('Error saving learning data:', error);
    }
  }

  /**
   * Save neural network models
   */
  async saveModels() {
    try {
      const modelDir = path.join(this.dataDir, 'models');
      await fs.mkdir(modelDir, { recursive: true });
      
      // Save TensorFlow.js models
      if (this.neuralService.getModel(this.strategyModelName)) {
        await this.neuralService.saveModel(
          this.strategyModelName,
          `file://${path.join(modelDir, 'strategy_model')}`
        );
      }
      
      if (this.neuralService.getModel(this.healingModelName)) {
        await this.neuralService.saveModel(
          this.healingModelName,
          `file://${path.join(modelDir, 'healing_model')}`
        );
      }
      
      if (this.neuralService.getModel(this.patternModelName)) {
        await this.neuralService.saveModel(
          this.patternModelName,
          `file://${path.join(modelDir, 'pattern_model')}`
        );
      }
      
      console.log('Neural network models saved successfully');
    } catch (error) {
      console.error('Error saving models:', error);
    }
  }

  async saveModel() {
    try {
      const modelData = {
        network: this.learningModel?.toJSON(),
        strategyEffectiveness: Array.from(this.strategyEffectiveness.entries()),
        failurePatterns: Array.from(this.failurePatterns.entries()),
        successPatterns: Array.from(this.successPatterns.entries()),
        timestamp: Date.now()
      };
      
      await fs.writeFile(
        path.join(this.dataDir, 'learning-model.json'),
        JSON.stringify(modelData, null, 2)
      );
    } catch (error) {
      console.error('Error saving learning model:', error);
    }
  }

  async loadModel() {
    try {
      const modelFile = path.join(this.dataDir, 'learning-model.json');
      const modelData = JSON.parse(await fs.readFile(modelFile, 'utf8'));
      
      this.learningModel.fromJSON(modelData.network);
      this.strategyEffectiveness = new Map(modelData.strategyEffectiveness);
      this.failurePatterns = new Map(modelData.failurePatterns);
      this.successPatterns = new Map(modelData.successPatterns);
      this.isModelTrained = true;
      
      console.log('Learning model loaded successfully');
    } catch (error) {
      console.log('No existing learning model found');
    }
  }

  async saveLearningData() {
    try {
      await fs.writeFile(
        path.join(this.dataDir, 'learning-data.json'),
        JSON.stringify(this.learningData, null, 2)
      );
    } catch (error) {
      console.error('Error saving learning data:', error);
    }
  }

  /**
   * Load learning data and neural network models
   */
  async loadData() {
    try {
      const dataPath = path.join(this.dataDir, 'learning_data.json');
      const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
      
      this.strategyEffectiveness = new Map(data.strategyEffectiveness || []);
      this.failurePatterns = new Map(data.failurePatterns || []);
      this.successPatterns = new Map(data.successPatterns || []);
      this.learningData = data.learningData || [];
      this.isModelTrained = data.isModelTrained || false;
      this.lastTrainingTime = data.lastTrainingTime;
      this.modelMetrics = data.modelMetrics || {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        lastTraining: null
      };
      
      // Load feature config if available
      if (data.featureConfig) {
        this.featureConfig = { ...this.featureConfig, ...data.featureConfig };
      }
      
      // Load neural network models
      await this.loadModels();
      
      console.log(`Loaded ${this.learningData.length} learning examples and neural network models`);
    } catch (error) {
      console.log('No existing learning data found, starting fresh');
    }
  }

  /**
   * Load neural network models from disk
   */
  async loadModels() {
    try {
      const modelDir = path.join(this.dataDir, 'models');
      
      // Check if model directory exists
      try {
        await fs.access(modelDir);
      } catch {
        console.log('No saved models found, will create new ones');
        return;
      }
      
      // Load TensorFlow.js models
      const strategyModelPath = path.join(modelDir, 'strategy_model');
      const healingModelPath = path.join(modelDir, 'healing_model');
      const patternModelPath = path.join(modelDir, 'pattern_model');
      
      try {
        await this.neuralService.loadModel(
          this.strategyModelName,
          `file://${strategyModelPath}/model.json`
        );
        console.log('Strategy effectiveness model loaded');
      } catch (error) {
        console.log('Strategy model not found, will create new one');
      }
      
      try {
        await this.neuralService.loadModel(
          this.healingModelName,
          `file://${healingModelPath}/model.json`
        );
        console.log('Healing success model loaded');
      } catch (error) {
        console.log('Healing model not found, will create new one');
      }
      
      try {
        await this.neuralService.loadModel(
          this.patternModelName,
          `file://${patternModelPath}/model.json`
        );
        console.log('Pattern recognition model loaded');
      } catch (error) {
        console.log('Pattern model not found, will create new one');
      }
      
    } catch (error) {
      console.error('Error loading models:', error);
    }
  }

  async loadLearningData() {
    try {
      const dataFile = path.join(this.dataDir, 'learning-data.json');
      const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
      this.learningData = data || [];
      
      if (this.learningData.length > 0) {
        await this.retrainModel();
      }
    } catch (error) {
      console.log('No existing learning data found');
      this.learningData = [];
    }
  }

  // Get learning analytics
  getAnalytics() {
    const totalExecutions = this.learningData.length;
    const successfulExecutions = this.learningData.filter(d => d.success).length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    
    const strategyStats = Array.from(this.strategyEffectiveness.values())
      .map(strategy => ({
        name: strategy.name,
        effectiveness: Math.round(strategy.effectiveness * 100),
        adaptiveScore: Math.round(strategy.adaptiveScore * 100),
        usageCount: strategy.usageCount,
        successCount: strategy.successCount,
        failureCount: strategy.failureCount
      }))
      .sort((a, b) => b.adaptiveScore - a.adaptiveScore);
    
    return {
      totalExecutions,
      successfulExecutions,
      successRate: Math.round(successRate * 100) / 100,
      isModelTrained: this.isModelTrained,
      strategyStats,
      failurePatternCount: this.failurePatterns.size,
      successPatternCount: this.successPatterns.size,
      lastModelUpdate: this.learningData.length > 0 ? 
        new Date(Math.max(...this.learningData.map(d => d.timestamp))) : null,
      neuralNetworkMetrics: {
        accuracy: Math.round(this.modelMetrics.accuracy * 100) / 100,
        precision: Math.round(this.modelMetrics.precision * 100) / 100,
        recall: Math.round(this.modelMetrics.recall * 100) / 100,
        f1Score: Math.round(this.modelMetrics.f1Score * 100) / 100,
        lastTraining: this.modelMetrics.lastTraining
      },
      modelConfiguration: {
        inputSize: this.featureConfig.inputSize,
        hiddenLayers: this.featureConfig.hiddenLayers,
        outputSize: this.featureConfig.outputSize,
        learningRate: this.featureConfig.learningRate,
        batchSize: this.featureConfig.batchSize,
        epochs: this.featureConfig.epochs
      }
    };
  }
}

export default AutoLearningEngine;