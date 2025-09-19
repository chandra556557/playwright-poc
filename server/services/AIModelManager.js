/**
 * AIModelManager - Centralized AI model management service
 * Handles training, saving, loading, and coordination of all AI models
 * Integrates Brain.js and TensorFlow.js models through NeuralNetworkService
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import NeuralNetworkService from './NeuralNetworkService.js';
import tf from '@tensorflow/tfjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIModelManager {
  constructor(neuralService = null) {
    this.neuralService = neuralService || new NeuralNetworkService();
    this.modelsDir = path.join(__dirname, '../data/ai_models');
    this.configDir = path.join(__dirname, '../data/model_configs');
    
    // Model registry
    this.modelRegistry = new Map();
    this.trainingQueue = [];
    this.isTraining = false;
    
    // Model configurations
    this.modelConfigs = {
      elementDetection: {
        type: 'tensorflow',
        architecture: 'feedforward',
        inputSize: 20,
        hiddenLayers: [64, 32, 16],
        outputSize: 1,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
        validationSplit: 0.2
      },
      strategyEffectiveness: {
        type: 'tensorflow',
        architecture: 'feedforward',
        inputSize: 25,
        hiddenLayers: [128, 64, 32],
        outputSize: 1,
        learningRate: 0.001,
        batchSize: 64,
        epochs: 150,
        validationSplit: 0.2
      },
      healingSuccess: {
        type: 'tensorflow',
        architecture: 'feedforward',
        inputSize: 25,
        hiddenLayers: [64, 32],
        outputSize: 1,
        learningRate: 0.002,
        batchSize: 32,
        epochs: 100,
        validationSplit: 0.2
      },
      patternRecognition: {
        type: 'tensorflow',
        architecture: 'feedforward',
        inputSize: 25,
        hiddenLayers: [128, 64, 32],
        outputSize: 8,
        learningRate: 0.001,
        batchSize: 64,
        epochs: 200,
        validationSplit: 0.2
      },
      selectorOptimization: {
        type: 'brainjs',
        architecture: 'lstm',
        hiddenLayers: [20, 15],
        learningRate: 0.01,
        iterations: 1000,
        errorThresh: 0.005
      }
    };
    
    // Performance metrics
    this.modelMetrics = new Map();
    this.trainingHistory = [];
  }

  /**
   * Initialize the AI Model Manager
   */
  async init() {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
      await fs.mkdir(this.configDir, { recursive: true });
      
      await this.neuralService.initialize();
      await this.loadModelRegistry();
      await this.loadModelConfigurations();
      
      console.log('AIModelManager initialized successfully');
    } catch (error) {
      console.error('Error initializing AIModelManager:', error);
      throw error;
    }
  }

  /**
   * Register a new model for management
   */
  registerModel(modelName, config = {}) {
    const modelConfig = {
      ...this.modelConfigs[modelName] || this.modelConfigs.elementDetection,
      ...config,
      name: modelName,
      registeredAt: new Date().toISOString(),
      status: 'registered'
    };
    
    this.modelRegistry.set(modelName, modelConfig);
    console.log(`Model '${modelName}' registered successfully`);
    
    return modelConfig;
  }

  /**
   * Create and initialize a model
   */
  async createModel(modelName, config = {}) {
    try {
      const modelConfig = this.modelRegistry.get(modelName) || this.registerModel(modelName, config);
      
      if (modelConfig.type === 'tensorflow') {
        await this.createTensorFlowModel(modelName, modelConfig);
      } else if (modelConfig.type === 'brainjs') {
        await this.createBrainJSModel(modelName, modelConfig);
      }
      
      modelConfig.status = 'created';
      modelConfig.createdAt = new Date().toISOString();
      
      console.log(`Model '${modelName}' created successfully`);
      return true;
    } catch (error) {
      console.error(`Error creating model '${modelName}':`, error);
      return false;
    }
  }

  /**
   * Create TensorFlow.js model
   */
  async createTensorFlowModel(modelName, config) {
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
      inputShape: [config.inputSize],
      units: config.hiddenLayers[0],
      activation: 'relu',
      kernelInitializer: 'glorotUniform'
    }));
    
    for (let i = 1; i < config.hiddenLayers.length; i++) {
      model.add(tf.layers.dense({
        units: config.hiddenLayers[i],
        activation: 'relu',
        kernelInitializer: 'glorotUniform'
      }));
      
      model.add(tf.layers.dropout({ rate: 0.2 }));
    }
    
    const outputActivation = config.outputSize === 1 ? 'sigmoid' : 'softmax';
    model.add(tf.layers.dense({
      units: config.outputSize,
      activation: outputActivation
    }));
    
    const optimizer = tf.train.adam(config.learningRate);
    const loss = config.outputSize === 1 ? 'binaryCrossentropy' : 'categoricalCrossentropy';
    
    model.compile({
      optimizer,
      loss,
      metrics: ['accuracy']
    });
    
    // Model is automatically registered in NeuralNetworkService when created
    
    return model;
  }

  /**
   * Create Brain.js model
   */
  async createBrainJSModel(modelName, config) {
    const modelConfig = {
      hiddenLayers: config.hiddenLayers,
      learningRate: config.learningRate,
      iterations: config.iterations,
      errorThresh: config.errorThresh
    };
    
    const model = this.neuralService.createBrainNetwork(modelName, config.architecture, modelConfig);
    return model;
  }

  /**
   * Train a model with provided data
   */
  async trainModel(modelName, trainingData, validationData = null) {
    try {
      const modelConfig = this.modelRegistry.get(modelName);
      if (!modelConfig) {
        throw new Error(`Model '${modelName}' not registered`);
      }
      
      if (this.isTraining) {
        this.trainingQueue.push({ modelName, trainingData, validationData });
        console.log(`Model '${modelName}' added to training queue`);
        return { queued: true };
      }
      
      this.isTraining = true;
      modelConfig.status = 'training';
      
      const startTime = Date.now();
      let result;
      
      if (modelConfig.type === 'tensorflow') {
        result = await this.trainTensorFlowModel(modelName, modelConfig, trainingData, validationData);
      } else if (modelConfig.type === 'brainjs') {
        result = await this.trainBrainJSModel(modelName, modelConfig, trainingData);
      }
      
      const trainingTime = Date.now() - startTime;
      
      modelConfig.status = 'trained';
      modelConfig.lastTraining = new Date().toISOString();
      modelConfig.trainingTime = trainingTime;
      
      this.trainingHistory.push({
        modelName,
        timestamp: new Date().toISOString(),
        trainingTime,
        dataSize: trainingData.length,
        metrics: result.metrics
      });
      
      this.modelMetrics.set(modelName, result.metrics);
      
      this.isTraining = false;
      
      if (this.trainingQueue.length > 0) {
        const next = this.trainingQueue.shift();
        setTimeout(() => this.trainModel(next.modelName, next.trainingData, next.validationData), 1000);
      }
      
      console.log(`Model '${modelName}' trained successfully in ${trainingTime}ms`);
      return result;
      
    } catch (error) {
      this.isTraining = false;
      console.error(`Error training model '${modelName}':`, error);
      throw error;
    }
  }

  /**
   * Train TensorFlow.js model
   */
  async trainTensorFlowModel(modelName, config, trainingData, validationData) {
    const model = this.neuralService.getModel(modelName);
    if (!model) {
      throw new Error(`TensorFlow model '${modelName}' not found`);
    }
    
    const { inputs, outputs } = this.prepareTensorFlowData(trainingData, config);
    
    let validationInputs, validationOutputs;
    if (validationData) {
      const validation = this.prepareTensorFlowData(validationData, config);
      validationInputs = validation.inputs;
      validationOutputs = validation.outputs;
    }
    
    const trainConfig = {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationSplit: validationData ? 0 : config.validationSplit,
      validationData: validationData ? [validationInputs, validationOutputs] : null,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc?.toFixed(4) || 'N/A'}`);
          }
        }
      }
    };
    
    const history = await model.fit(inputs, outputs, trainConfig);
    
    const evaluation = await model.evaluate(inputs, outputs);
    const loss = await evaluation[0].data();
    const accuracy = evaluation[1] ? await evaluation[1].data() : [0];
    
    inputs.dispose();
    outputs.dispose();
    if (validationInputs) validationInputs.dispose();
    if (validationOutputs) validationOutputs.dispose();
    evaluation.forEach(tensor => tensor.dispose());
    
    return {
      success: true,
      metrics: {
        loss: loss[0],
        accuracy: accuracy[0],
        epochs: config.epochs,
        finalLoss: history.history.loss[history.history.loss.length - 1],
        finalAccuracy: history.history.acc ? history.history.acc[history.history.acc.length - 1] : null
      },
      history: history.history
    };
  }

  /**
   * Train Brain.js model
   */
  async trainBrainJSModel(modelName, config, trainingData) {
    const result = await this.neuralService.trainBrainJSModel(modelName, trainingData, {
      iterations: config.iterations,
      errorThresh: config.errorThresh,
      learningRate: config.learningRate
    });
    
    return {
      success: true,
      metrics: {
        error: result.error,
        iterations: result.iterations,
        accuracy: 1 - result.error
      }
    };
  }

  /**
   * Prepare data for TensorFlow.js training
   */
  prepareTensorFlowData(data, config) {
    const inputs = data.map(item => item.input || item.features);
    const outputs = data.map(item => {
      const output = item.output || item.label;
      if (config.outputSize === 1) {
        return [typeof output === 'number' ? output : (output ? 1 : 0)];
      } else {
        if (Array.isArray(output)) {
          return output;
        } else {
          const oneHot = new Array(config.outputSize).fill(0);
          oneHot[output] = 1;
          return oneHot;
        }
      }
    });
    
    return {
      inputs: tf.tensor2d(inputs),
      outputs: tf.tensor2d(outputs)
    };
  }

  /**
   * Get model information
   */
  getModelInfo(modelName) {
    const config = this.modelRegistry.get(modelName);
    const metrics = this.modelMetrics.get(modelName);
    const model = this.neuralService.getModel(modelName);
    
    return {
      config,
      metrics,
      exists: !!model,
      isLoaded: !!model
    };
  }

  /**
   * Get all registered models
   */
  getAllModels() {
    const models = {};
    for (const [name, config] of this.modelRegistry) {
      models[name] = this.getModelInfo(name);
    }
    return models;
  }

  /**
   * Save model registry
   */
  async saveModelRegistry() {
    try {
      const registryPath = path.join(this.configDir, 'model_registry.json');
      const registry = Object.fromEntries(this.modelRegistry);
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    } catch (error) {
      console.error('Error saving model registry:', error);
    }
  }

  /**
   * Load model registry
   */
  async loadModelRegistry() {
    try {
      const registryPath = path.join(this.configDir, 'model_registry.json');
      const data = await fs.readFile(registryPath, 'utf8');
      const registry = JSON.parse(data);
      this.modelRegistry = new Map(Object.entries(registry));
      console.log(`Loaded ${this.modelRegistry.size} models from registry`);
    } catch (error) {
      console.log('No existing model registry found, starting fresh');
    }
  }

  /**
   * Load model configurations
   */
  async loadModelConfigurations() {
    try {
      const configFiles = await fs.readdir(this.configDir);
      for (const file of configFiles) {
        if (file.endsWith('.json') && file !== 'model_registry.json') {
          const modelName = file.replace('.json', '');
          const config = await this.loadModelConfig(modelName);
          if (config && !this.modelRegistry.has(modelName)) {
            this.modelRegistry.set(modelName, config);
          }
        }
      }
    } catch (error) {
      console.log('No existing model configurations found');
    }
  }

  /**
   * Load model configuration
   */
  async loadModelConfig(modelName) {
    try {
      const configPath = path.join(this.configDir, `${modelName}.json`);
      const data = await fs.readFile(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  // Get all registered models
  getRegisteredModels() {
    const models = [];
    for (const [name, config] of this.modelRegistry) {
      models.push({
        name,
        type: config.type,
        isActive: this.neuralService.isModelActive ? this.neuralService.isModelActive(name) : false,
        config
      });
    }
    return models;
  }

  // Get model status
  async getModelStatus(modelName) {
    const config = this.modelRegistry.get(modelName);
    if (!config) {
      throw new Error(`Model ${modelName} not found`);
    }

    return {
      name: modelName,
      type: config.type,
      isActive: this.neuralService.isModelActive ? this.neuralService.isModelActive(modelName) : false,
      isTraining: this.isTraining,
      config,
      lastTrained: config.lastTrained || null,
      trainingSessions: config.trainingSessions || 0,
      predictions: config.predictions || 0
    };
  }

  // Get model configuration
  async getModelConfig(modelName) {
    const config = this.modelRegistry.get(modelName);
    if (!config) {
      throw new Error(`Model ${modelName} not found`);
    }
    return config;
  }

  // Update model configuration
  async updateModelConfig(modelName, newConfig) {
    const existingConfig = this.modelRegistry.get(modelName);
    if (!existingConfig) {
      throw new Error(`Model ${modelName} not found`);
    }

    const updatedConfig = { ...existingConfig, ...newConfig };
    this.modelRegistry.set(modelName, updatedConfig);
    
    // Save updated config
    await this.saveModelConfig(modelName, updatedConfig);
  }

  // Get training history
  async getTrainingHistory(modelName) {
    const config = this.modelRegistry.get(modelName);
    if (!config) {
      throw new Error(`Model ${modelName} not found`);
    }

    return {
      modelName,
      trainingSessions: config.trainingSessions || 0,
      lastTrained: config.lastTrained || null,
      history: config.trainingHistory || []
    };
  }

  // Export model
  async exportModel(modelName, format = 'json') {
    const config = this.modelRegistry.get(modelName);
    if (!config) {
      throw new Error(`Model ${modelName} not found`);
    }

    const modelData = {
      name: modelName,
      config,
      type: config.type,
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      return modelData;
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Import model
  async importModel(modelName, modelData, format = 'json') {
    if (format !== 'json') {
      throw new Error(`Unsupported import format: ${format}`);
    }

    this.modelRegistry.set(modelName, modelData.config);
    await this.saveModelConfig(modelName, modelData.config);
    
    return {
      modelName,
      imported: true,
      importedAt: new Date().toISOString()
    };
  }

  // Delete model
  async deleteModel(modelName) {
    if (!this.modelRegistry.has(modelName)) {
      throw new Error(`Model ${modelName} not found`);
    }

    this.modelRegistry.delete(modelName);
    
    // Remove config file
    try {
      const configPath = path.join(this.configDir, `${modelName}.json`);
      await fs.unlink(configPath);
    } catch (error) {
      console.warn(`Could not delete config file for ${modelName}:`, error.message);
    }

    return { modelName, deleted: true };
  }

  // Save model configuration
  async saveModelConfig(modelName, config) {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      const configPath = path.join(this.configDir, `${modelName}.json`);
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(`Error saving model config for ${modelName}:`, error);
      throw error;
    }
  }
}

export default AIModelManager;