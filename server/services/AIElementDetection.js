import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import NeuralNetworkService from './NeuralNetworkService.js';
import similarity from 'similarity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Element Detection with Full Neural Network Implementation
 * Uses both Brain.js and TensorFlow.js for element interaction prediction
 */
class AIElementDetection {
  constructor() {
    this.neuralService = new NeuralNetworkService();
    this.elementPatterns = new Map();
    this.trainingData = [];
    this.isModelTrained = false;
    this.dataPath = path.join(__dirname, '../data/ai-element-detection');
    
    // Model names
    this.brainModelName = 'element_detection_brain';
    this.tfModelName = 'element_detection_tensorflow';
    
    // Feature extraction configuration
    this.featureConfig = {
      maxTextLength: 200,
      maxAttributeLength: 100,
      positionNormalization: true,
      includeVisualFeatures: true,
      includeDOMFeatures: true,
      includeSemanticFeatures: true
    };
    
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await this.neuralService.initialize();
      await this.loadTrainingData();
      await this.initializeModels();
      await this.loadExistingModels();
      console.log('AI Element Detection initialized with neural networks');
    } catch (error) {
      console.log('Initializing new AI models for element detection:', error.message);
      await this.initializeModels();
    }
  }

  // Alias for compatibility
  async initialize() {
    return this.init();
  }

  /**
   * Initialize neural network models
   */
  async initializeModels() {
    try {
      // Create Brain.js model for fast predictions
      this.neuralService.createBrainNetwork(this.brainModelName, {
        hiddenLayers: [20, 15, 10],
        learningRate: 0.3,
        iterations: 10000,
        errorThresh: 0.01
      });

      // Create TensorFlow.js model for complex pattern recognition
      this.neuralService.createTensorFlowModel(this.tfModelName, {
        inputShape: [25], // 25 features
        hiddenLayers: [
          { units: 64, activation: 'relu', dropout: 0.2 },
          { units: 32, activation: 'relu', dropout: 0.2 },
          { units: 16, activation: 'relu' }
        ],
        outputUnits: 1,
        outputActivation: 'sigmoid',
        epochs: 150,
        batchSize: 16
      });

      console.log('Neural network models initialized for element detection');
    } catch (error) {
      console.error('Failed to initialize neural models:', error);
      throw error;
    }
  }

  /**
   * Load existing trained models
   */
  async loadExistingModels() {
    try {
      const brainModel = await this.neuralService.loadBrainModel(this.brainModelName);
      const tfModel = await this.neuralService.loadTensorFlowModel(this.tfModelName);
      
      // Check if at least one model was loaded successfully
      if (brainModel || tfModel) {
        this.isModelTrained = true;
        console.log('Existing neural models loaded successfully');
      } else {
        this.isModelTrained = false;
        console.log('No existing models found, will need training');
      }
    } catch (error) {
      console.log('No existing models found, will need training:', error.message);
      this.isModelTrained = false;
    }
  }

  /**
   * Extract comprehensive features from element for neural network input
   */
  extractElementFeatures(element) {
    if (!element) {
      // Return default features for null/undefined elements
      return new Array(25).fill(0);
    }

    const features = {};
    
    try {
      // Text-based features (enhanced)
      const textContent = this.getElementText(element);
      features.hasText = textContent ? 1 : 0;
      features.textLength = textContent ? Math.min(textContent.length / this.featureConfig.maxTextLength, 1) : 0;
      features.textComplexity = this.calculateTextComplexity(textContent);
      features.hasPlaceholder = (element.placeholder && element.placeholder.trim()) ? 1 : 0;
      features.hasTitle = (element.title && element.title.trim()) ? 1 : 0;
      
      // Attribute features (enhanced)
      features.hasId = (element.id && element.id.trim()) ? 1 : 0;
      features.hasClass = (element.className && element.className.trim()) ? 1 : 0;
      features.hasName = (element.name && element.name.trim()) ? 1 : 0;
      features.hasDataTestId = element.getAttribute && element.getAttribute('data-testid') ? 1 : 0;
      features.hasAriaLabel = element.getAttribute && element.getAttribute('aria-label') ? 1 : 0;
      features.hasRole = element.getAttribute && element.getAttribute('role') ? 1 : 0;
      features.attributeCount = element.attributes ? Math.min(element.attributes.length / 20, 1) : 0; // normalized
      
      // Tag-based features (enhanced)
      const tagName = element.tagName ? element.tagName.toUpperCase() : '';
      features.isButton = tagName === 'BUTTON' ? 1 : 0;
      features.isInput = tagName === 'INPUT' ? 1 : 0;
      features.isLink = tagName === 'A' ? 1 : 0;
      features.isDiv = tagName === 'DIV' ? 1 : 0;
      features.isSpan = tagName === 'SPAN' ? 1 : 0;
      features.isInteractive = this.isInteractiveElement(element) ? 1 : 0;
      
      // Position and size features (enhanced)
      const rect = this.getElementRect(element);
      features.x = Math.min(rect.x / 1920, 1);
      features.y = Math.min(rect.y / 1080, 1);
      features.width = Math.min(rect.width / 1920, 1);
      features.height = Math.min(rect.height / 1080, 1);
      features.area = features.width * features.height;
      
      // Visibility and state features (enhanced)
      features.isVisible = this.isElementVisible(element) ? 1 : 0;
      features.isEnabled = element.disabled === false ? 1 : 0;
      features.isClickable = this.isElementClickable(element) ? 1 : 0;
      features.zIndex = Math.min(this.getZIndex(element) / 1000, 1); // normalized
      
      // DOM structure features
      features.depth = Math.min(this.getElementDepth(element) / 20, 1); // normalized
      features.siblingCount = Math.min(this.getSiblingCount(element) / 10, 1); // normalized
      features.childCount = element.children ? Math.min(element.children.length / 10, 1) : 0; // normalized
      
    } catch (error) {
      console.warn('Error extracting element features:', error.message);
      // Return default features on error
      return new Array(25).fill(0);
    }
    
    return Object.values(features);
  }

  /**
   * Calculate text complexity score
   */
  calculateTextComplexity(text) {
    if (!text) return 0;
    
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;
    const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
    
    return Math.min((wordCount * 0.1 + charCount * 0.01 + specialChars * 0.05), 1);
  }

  /**
   * Check if element is interactive
   */
  isInteractiveElement(element) {
    if (!element) return false;
    
    try {
      const interactiveTags = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'];
      const interactiveRoles = ['button', 'link', 'textbox', 'checkbox', 'radio'];
      
      const tagName = element.tagName ? element.tagName.toUpperCase() : '';
      const role = element.getAttribute ? element.getAttribute('role') : null;
      const tabindex = element.getAttribute ? element.getAttribute('tabindex') : null;
      
      return interactiveTags.includes(tagName) ||
             (role && interactiveRoles.includes(role)) ||
             element.onclick !== null ||
             tabindex !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get element bounding rectangle safely
   */
  getElementRect(element) {
    try {
      if (element.getBoundingClientRect) {
        return element.getBoundingClientRect();
      }
    } catch (error) {
      // Fallback for elements not in DOM
    }
    
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  /**
   * Check if element is visible
   */
  isElementVisible(element) {
    if (!element) return false;
    
    try {
      // Basic visibility checks
      if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        return false;
      }
      
      // Check style properties
      const style = element.style || {};
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      
      // Check computed style if available (browser environment)
      if (typeof getComputedStyle !== 'undefined') {
        try {
          const computed = getComputedStyle(element);
          if (computed.display === 'none' || computed.visibility === 'hidden') {
            return false;
          }
        } catch (error) {
          // Ignore computed style errors in non-browser environments
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if element is clickable
   */
  isElementClickable(element) {
    if (!element) return false;
    
    try {
      return this.isInteractiveElement(element) && 
             this.isElementVisible(element) && 
             element.disabled !== true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get element z-index
   */
  getZIndex(element) {
    try {
      const computed = typeof getComputedStyle !== 'undefined' ? getComputedStyle(element) : {};
      const zIndex = parseInt(computed.zIndex) || 0;
      return Math.max(0, zIndex);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get element depth in DOM tree
   */
  getElementDepth(element) {
    let depth = 0;
    let current = element;
    
    while (current && current.parentElement) {
      depth++;
      current = current.parentElement;
      if (depth > 50) break; // Prevent infinite loops
    }
    
    return depth;
  }

  /**
   * Get sibling count
   */
  getSiblingCount(element) {
    return element.parentElement ? element.parentElement.children.length - 1 : 0;
  }

  // Calculate semantic similarity between elements
  calculateSemanticSimilarity(element1, element2) {
    const text1 = this.getElementText(element1).toLowerCase();
    const text2 = this.getElementText(element2).toLowerCase();
    
    if (!text1 || !text2) return 0;
    
    return similarity(text1, text2);
  }

  getElementText(element) {
    return element.textContent || 
           element.placeholder || 
           element.getAttribute('aria-label') || 
           element.getAttribute('title') || 
           element.value || 
           '';
  }

  /**
   * Train both neural networks with element interaction data
   */
  async trainModel(trainingData) {
    if (!trainingData || trainingData.length === 0) {
      console.log('No training data available');
      return { success: false, message: 'No training data available' };
    }

    console.log(`Training AI models with ${trainingData.length} samples`);
    
    try {
      // Validate training data
      const validData = trainingData.filter(sample => 
        sample && 
        sample.features && 
        Array.isArray(sample.features) && 
        typeof sample.success === 'boolean'
      );

      if (validData.length === 0) {
        throw new Error('No valid training data found');
      }

      console.log(`Using ${validData.length} valid samples for training`);

      // Prepare data for Brain.js (object format)
      const brainData = validData.map(sample => ({
        input: this.normalizeFeatures(sample.features),
        output: { success: sample.success ? 1 : 0 }
      }));

      // Prepare data for TensorFlow.js (tensor format)
      const tfInputs = validData.map(sample => this.normalizeFeatures(sample.features));
      const tfOutputs = validData.map(sample => [sample.success ? 1 : 0]);
      
      // Split data for validation
      const splitIndex = Math.floor(validData.length * 0.8);
      const trainInputs = tfInputs.slice(0, splitIndex);
      const trainOutputs = tfOutputs.slice(0, splitIndex);
      const valInputs = tfInputs.slice(splitIndex);
      const valOutputs = tfOutputs.slice(splitIndex);

      let brainStats = null;
      let tfHistory = null;

      // Train Brain.js model (fast training)
      try {
        console.log('Training Brain.js model...');
        brainStats = await this.neuralService.trainBrainNetwork(
          this.brainModelName, 
          brainData
        );
        console.log('Brain.js model trained successfully');
      } catch (error) {
        console.warn('Brain.js training failed:', error.message);
      }

      // Train TensorFlow.js model (deep learning)
      try {
        console.log('Training TensorFlow.js model...');
        tfHistory = await this.neuralService.trainTensorFlowModel(
          this.tfModelName,
          { inputs: trainInputs, outputs: trainOutputs },
          valInputs.length > 0 ? { inputs: valInputs, outputs: valOutputs } : null
        );
        console.log('TensorFlow.js model trained successfully');
      } catch (error) {
        console.warn('TensorFlow.js training failed:', error.message);
      }

      // Save trained models if at least one was successful
      if (brainStats || tfHistory) {
        try {
          if (brainStats) {
            await this.neuralService.saveBrainModel(this.brainModelName);
          }
          if (tfHistory) {
            await this.neuralService.saveTensorFlowModel(this.tfModelName);
          }
        } catch (error) {
          console.warn('Failed to save models:', error.message);
        }

        this.isModelTrained = true;
        
        // Save training metadata
        await this.saveTrainingMetadata({
          timestamp: new Date().toISOString(),
          sampleCount: validData.length,
          brainStats,
          tfHistory: tfHistory ? tfHistory.history : null,
          modelVersions: {
            brain: this.brainModelName,
            tensorflow: this.tfModelName
          }
        });

        console.log('Neural network training completed successfully');
        return {
          success: true,
          brainStats,
          tfHistory: tfHistory ? tfHistory.history : null,
          sampleCount: validData.length
        };
      } else {
        throw new Error('Both model training attempts failed');
      }
    } catch (error) {
      console.error('Failed to train neural networks:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Normalize features for neural network input
   */
  normalizeFeatures(features) {
    if (!Array.isArray(features)) {
      return features;
    }
    
    // Ensure all features are numbers and within [0, 1] range
    return features.map(feature => {
      const num = parseFloat(feature) || 0;
      return Math.max(0, Math.min(1, num));
    });
  }

  /**
   * Save training metadata
   */
  async saveTrainingMetadata(metadata) {
    try {
      const metadataPath = path.join(this.dataPath, 'training_metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Failed to save training metadata:', error);
    }
  }

  /**
   * Predict element interaction success using ensemble of neural networks
   */
  async predictElementSuccess(element) {
    if (!this.isModelTrained) {
      return {
        confidence: 0.5,
        brainPrediction: 0.5,
        tfPrediction: 0.5,
        ensemble: 0.5,
        features: null
      };
    }

    try {
      const features = this.extractElementFeatures(element);
      const normalizedFeatures = this.normalizeFeatures(features);
      
      let brainPrediction = 0.5;
      let tfPrediction = 0.5;
      
      // Get prediction from Brain.js (fast)
      try {
        const brainResult = this.neuralService.predictWithBrain(
          this.brainModelName, 
          normalizedFeatures
        );
        brainPrediction = brainResult.success || brainResult || 0.5;
      } catch (error) {
        console.warn('Brain.js prediction failed:', error.message);
      }
      
      // Get prediction from TensorFlow.js (deep learning)
      try {
        const tfResult = await this.neuralService.predictWithTensorFlow(
          this.tfModelName, 
          normalizedFeatures
        );
        tfPrediction = tfResult[0] || 0.5;
      } catch (error) {
        console.warn('TensorFlow.js prediction failed:', error.message);
      }
      
      // Ensemble prediction (weighted average)
      const ensemble = (brainPrediction * 0.4) + (tfPrediction * 0.6);
      
      return {
        confidence: ensemble,
        brainPrediction,
        tfPrediction,
        ensemble,
        features: normalizedFeatures,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Prediction error:', error);
      return {
        confidence: 0.5,
        brainPrediction: 0.5,
        tfPrediction: 0.5,
        ensemble: 0.5,
        features: null,
        error: error.message
      };
    }
  }

  /**
   * Predict element success synchronously (Brain.js only for speed)
   */
  predictElementSuccessSync(element) {
    if (!this.isModelTrained) {
      return 0.5;
    }

    try {
      const features = this.extractElementFeatures(element);
      const normalizedFeatures = this.normalizeFeatures(features);
      
      const brainResult = this.neuralService.predictWithBrain(
        this.brainModelName, 
        normalizedFeatures
      );
      
      return brainResult.success || brainResult || 0.5;
    } catch (error) {
      console.warn('Sync prediction error:', error.message);
      return 0.5;
    }
  }

  /**
   * Find similar elements using AI with neural network predictions
   */
  async findSimilarElements(targetElement, candidateElements) {
    if (!targetElement || !candidateElements || candidateElements.length === 0) {
      return [];
    }

    try {
      const targetFeatures = this.extractElementFeatures(targetElement);
      const targetText = this.getElementText(targetElement);
      
      const similarities = await Promise.all(candidateElements.map(async candidate => {
        try {
          const candidateFeatures = this.extractElementFeatures(candidate);
          const candidateText = this.getElementText(candidate);
          
          // Calculate feature similarity using cosine similarity
          const featureSimilarity = this.cosineSimilarity(targetFeatures, candidateFeatures);
          
          // Calculate text similarity
          const textSimilarity = this.calculateSemanticSimilarity(targetElement, candidate);
          
          // AI prediction confidence (use sync version for performance)
          const aiConfidence = this.predictElementSuccessSync(candidate);
          
          // Combined score with enhanced weighting
          const combinedScore = (featureSimilarity * 0.35) + (textSimilarity * 0.35) + (aiConfidence * 0.3);
          
          return {
            element: candidate,
            similarity: combinedScore,
            featureSimilarity,
            textSimilarity,
            aiConfidence,
            features: candidateFeatures
          };
        } catch (error) {
          console.warn('Error processing candidate element:', error.message);
          return {
            element: candidate,
            similarity: 0,
            featureSimilarity: 0,
            textSimilarity: 0,
            aiConfidence: 0,
            features: null
          };
        }
      }));

      // Sort by similarity score and return top matches
      return similarities
        .filter(sim => sim.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 8); // Return top 8 matches for better options
    } catch (error) {
      console.error('Error finding similar elements:', error);
      return [];
    }
  }

  /**
   * Get detailed AI analysis for an element
   */
  async getElementAnalysis(element) {
    if (!element) {
      return {
        element: null,
        features: null,
        prediction: { confidence: 0 },
        analysis: null,
        timestamp: new Date().toISOString(),
        error: 'Element is null or undefined'
      };
    }

    try {
      const features = this.extractElementFeatures(element);
      const prediction = await this.predictElementSuccess(element);
      const text = this.getElementText(element);
      
      return {
        element: {
          tagName: element.tagName || 'UNKNOWN',
          id: element.id || '',
          className: element.className || '',
          text: text.substring(0, 100) // Truncate for readability
        },
        features,
        prediction,
        analysis: {
          isInteractive: this.isInteractiveElement(element),
          isVisible: this.isElementVisible(element),
          isClickable: this.isElementClickable(element),
          complexity: this.calculateTextComplexity(text),
          depth: this.getElementDepth(element)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing element:', error);
      return {
        element: {
          tagName: element.tagName || 'UNKNOWN',
          id: element.id || '',
          className: element.className || '',
          text: ''
        },
        features: null,
        prediction: { confidence: 0 },
        analysis: null,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Calculate cosine similarity between two feature vectors
  cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) return 0;
    
    try {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < vectorA.length; i++) {
        const a = parseFloat(vectorA[i]) || 0;
        const b = parseFloat(vectorB[i]) || 0;
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
      }
      
      if (normA === 0 || normB === 0) return 0;
      
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    } catch (error) {
      console.warn('Error calculating cosine similarity:', error.message);
      return 0;
    }
  }

  // Learn from interaction results
  async learnFromInteraction(element, success, strategy) {
    if (!element || typeof success !== 'boolean' || !strategy) {
      console.warn('Invalid parameters for learnFromInteraction');
      return;
    }

    try {
      const features = this.extractElementFeatures(element);
      
      const trainingExample = {
        features,
        success,
        strategy,
        timestamp: Date.now(),
        elementInfo: {
          tagName: element.tagName || 'UNKNOWN',
          text: this.getElementText(element),
          selector: this.generateSelector(element)
        }
      };

      this.trainingData.push(trainingExample);
      
      // Retrain model periodically
      if (this.trainingData.length % 50 === 0) {
        console.log(`Retraining model with ${this.trainingData.length} examples`);
        await this.trainModel(this.trainingData);
      }
      
      await this.saveTrainingData();
    } catch (error) {
      console.error('Error learning from interaction:', error);
    }
  }

  // Generate a robust selector for an element
  generateSelector(element) {
    if (!element) return [];

    const selectors = [];
    
    try {
      // ID selector (highest priority)
      if (element.id && element.id.trim()) {
        selectors.push(`#${element.id}`);
      }
      
      // Data-testid selector
      if (element.getAttribute && element.getAttribute('data-testid')) {
        selectors.push(`[data-testid="${element.getAttribute('data-testid')}"]`);
      }
      
      // Class selector
      if (element.className && element.className.trim()) {
        const classes = element.className.split(' ').filter(c => c.length > 0);
        if (classes.length > 0) {
          selectors.push(`.${classes.join('.')}`);
        }
      }
      
      // Attribute selectors
      if (element.name && element.name.trim()) {
        selectors.push(`[name="${element.name}"]`);
      }
      
      if (element.getAttribute && element.getAttribute('aria-label')) {
        selectors.push(`[aria-label="${element.getAttribute('aria-label')}"]`);
      }
      
      // Text-based selector
      const text = this.getElementText(element);
      if (text && text.length < 50) {
        selectors.push(`text=${text}`);
      }
      
      // Tag with position
      const tagName = element.tagName ? element.tagName.toLowerCase() : 'div';
      selectors.push(`${tagName}:nth-of-type(${this.getElementIndex(element)})`);
      
    } catch (error) {
      console.warn('Error generating selector:', error.message);
    }
    
    return selectors;
  }

  getElementIndex(element) {
    if (!element || !element.parentNode) return 1;
    
    try {
      const siblings = Array.from(element.parentNode.children || []);
      return siblings.indexOf(element) + 1;
    } catch (error) {
      return 1;
    }
  }

  /**
   * Save models using neural network service
   */
  async saveModel() {
    try {
      // Save both models
      await this.neuralService.saveBrainModel(this.brainModelName);
      await this.neuralService.saveTensorFlowModel(this.tfModelName);
      
      // Save additional metadata
      const metadata = {
        patterns: Array.from(this.elementPatterns.entries()),
        featureConfig: this.featureConfig,
        timestamp: Date.now(),
        trainingDataSize: this.trainingData.length
      };
      
      await fs.writeFile(
        path.join(this.dataPath, 'element-detection-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log('AI models and metadata saved successfully');
    } catch (error) {
      console.error('Error saving AI models:', error);
    }
  }

  /**
   * Load models using neural network service
   */
  async loadModel() {
    try {
      // Load both models
      const brainModel = await this.neuralService.loadBrainModel(this.brainModelName);
      const tfModel = await this.neuralService.loadTensorFlowModel(this.tfModelName);
      
      // Load metadata
      try {
        const metadataFile = path.join(this.dataPath, 'element-detection-metadata.json');
        const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
        
        this.elementPatterns = new Map(metadata.patterns || []);
        this.featureConfig = { ...this.featureConfig, ...metadata.featureConfig };
      } catch (metadataError) {
        console.log('No metadata file found, using defaults');
      }
      
      // Check if at least one model was loaded
      if (brainModel || tfModel) {
        this.isModelTrained = true;
        console.log('AI models loaded successfully');
      } else {
        this.isModelTrained = false;
        console.log('No existing AI models found, will train new ones');
      }
    } catch (error) {
      console.log('No existing AI models found, will train new ones:', error.message);
      this.isModelTrained = false;
    }
  }

  /**
   * Save training data to disk
   */
  async saveTrainingData() {
    try {
      await fs.writeFile(
        path.join(this.dataPath, 'training-data.json'),
        JSON.stringify(this.trainingData, null, 2)
      );
    } catch (error) {
      console.error('Error saving training data:', error);
    }
  }

  /**
   * Load training data from disk
   */
  async loadTrainingData() {
    try {
      const dataFile = path.join(this.dataPath, 'training-data.json');
      const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
      this.trainingData = data || [];
      
      console.log(`Loaded ${this.trainingData.length} training examples`);
      
      if (this.trainingData.length > 0) {
        await this.trainModel(this.trainingData);
      }
    } catch (error) {
      console.log('No existing training data found');
      this.trainingData = [];
    }
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics() {
    try {
      return {
        brainModel: this.neuralService.getModelInfo(this.brainModelName),
        tfModel: this.neuralService.getModelInfo(this.tfModelName),
        memoryUsage: this.neuralService.getMemoryUsage(),
        isModelTrained: this.isModelTrained,
        trainingDataSize: this.trainingData.length,
        featureCount: Object.keys(this.featureConfig).length
      };
    } catch (error) {
      console.error('Error getting model metrics:', error);
      return {
        brainModel: null,
        tfModel: null,
        memoryUsage: null,
        isModelTrained: this.isModelTrained,
        trainingDataSize: this.trainingData.length,
        featureCount: Object.keys(this.featureConfig).length,
        error: error.message
      };
    }
  }

  // Get element detection analytics
  getAnalytics() {
    const totalInteractions = this.trainingData.length;
    const successfulInteractions = this.trainingData.filter(d => d.success).length;
    const successRate = totalInteractions > 0 ? (successfulInteractions / totalInteractions) * 100 : 0;
    
    const strategyStats = this.trainingData.reduce((acc, data) => {
      acc[data.strategy] = (acc[data.strategy] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalInteractions,
      successfulInteractions,
      successRate: Math.round(successRate * 100) / 100,
      isModelTrained: this.isModelTrained,
      strategyStats,
      lastTraining: this.trainingData.length > 0 ? 
        new Date(Math.max(...this.trainingData.map(d => d.timestamp))) : null
    };
  }
}

export default AIElementDetection;