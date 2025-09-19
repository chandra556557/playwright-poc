import * as tf from '@tensorflow/tfjs';
import brain from 'brain.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Comprehensive Neural Network Service
 * Provides unified interface for Brain.js and TensorFlow.js implementations
 */
class NeuralNetworkService {
  constructor() {
    this.modelsDir = path.join(__dirname, '../data/neural-models');
    this.brainNetworks = new Map();
    this.tfModels = new Map();
    this.modelConfigs = new Map();
    this.isInitialized = false;
    
    // Default configurations
    this.defaultBrainConfig = {
      hiddenLayers: [10, 8, 6],
      activation: 'sigmoid',
      learningRate: 0.3,
      iterations: 20000,
      errorThresh: 0.005,
      log: false,
      logPeriod: 1000,
      timeout: 300000
    };
    
    this.defaultTfConfig = {
      inputShape: [10],
      hiddenLayers: [
        { units: 64, activation: 'relu' },
        { units: 32, activation: 'relu' },
        { units: 16, activation: 'relu' }
      ],
      outputUnits: 1,
      outputActivation: 'sigmoid',
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2
    };
  }

  async initialize() {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
      await this.loadExistingModels();
      this.isInitialized = true;
      console.log('NeuralNetworkService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NeuralNetworkService:', error);
      throw error;
    }
  }

  /**
   * Create a new model with the specified type
   * @param {string} modelName - Name of the model
   * @param {Object} model - The model instance (TensorFlow or Brain.js)
   * @param {string} type - Type of model ('tensorflow' or 'brain')
   * @param {Object} config - Model configuration
   */
  async createModel(modelName, model, type, config = {}) {
    try {
      if (type === 'tensorflow') {
        this.tfModels.set(modelName, model);
        this.modelConfigs.set(modelName, { ...this.defaultTfConfig, ...config, type: 'tensorflow' });
        console.log(`Model '${modelName}' created successfully`);
      } else if (type === 'brain') {
        this.brainNetworks.set(modelName, model);
        this.modelConfigs.set(modelName, { ...this.defaultBrainConfig, ...config, type: 'brain' });
        console.log(`Created Brain.js network: ${modelName}`);
      } else {
        throw new Error(`Unsupported model type: ${type}`);
      }
    } catch (error) {
      console.error(`Error creating model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Create a Brain.js neural network
   */
  createBrainNetwork(modelName, config = {}) {
    const networkConfig = { ...this.defaultBrainConfig, ...config };
    
    const network = new brain.NeuralNetwork({
      hiddenLayers: networkConfig.hiddenLayers,
      activation: networkConfig.activation,
      learningRate: networkConfig.learningRate
    });
    
    this.brainNetworks.set(modelName, network);
    this.modelConfigs.set(modelName, {
      type: 'brain',
      config: networkConfig,
      created: new Date().toISOString(),
      trained: false
    });
    
    console.log(`Created Brain.js network: ${modelName}`);
    return network;
  }

  /**
   * Create a TensorFlow.js model
   */
  createTensorFlowModel(modelName, config = {}) {
    const modelConfig = { ...this.defaultTfConfig, ...config };
    
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.dense({
      inputShape: modelConfig.inputShape,
      units: modelConfig.hiddenLayers[0].units,
      activation: modelConfig.hiddenLayers[0].activation
    }));
    
    // Hidden layers
    for (let i = 1; i < modelConfig.hiddenLayers.length; i++) {
      const layer = modelConfig.hiddenLayers[i];
      model.add(tf.layers.dense({
        units: layer.units,
        activation: layer.activation
      }));
      
      // Add dropout for regularization
      if (layer.dropout) {
        model.add(tf.layers.dropout({ rate: layer.dropout }));
      }
    }
    
    // Output layer
    model.add(tf.layers.dense({
      units: modelConfig.outputUnits,
      activation: modelConfig.outputActivation
    }));
    
    // Compile model
    model.compile({
      optimizer: modelConfig.optimizer,
      loss: modelConfig.loss,
      metrics: modelConfig.metrics
    });
    
    this.tfModels.set(modelName, model);
    this.modelConfigs.set(modelName, {
      type: 'tensorflow',
      config: modelConfig,
      created: new Date().toISOString(),
      trained: false
    });
    
    console.log(`Created TensorFlow.js model: ${modelName}`);
    return model;
  }

  /**
   * Train a Brain.js network
   */
  async trainBrainNetwork(modelName, trainingData, config = {}) {
    const network = this.brainNetworks.get(modelName);
    if (!network) {
      throw new Error(`Brain network '${modelName}' not found`);
    }

    const trainConfig = { ...this.defaultBrainConfig, ...config };
    
    console.log(`Training Brain.js network '${modelName}' with ${trainingData.length} samples`);
    
    const startTime = Date.now();
    const stats = network.train(trainingData, {
      iterations: trainConfig.iterations,
      errorThresh: trainConfig.errorThresh,
      log: trainConfig.log,
      logPeriod: trainConfig.logPeriod,
      timeout: trainConfig.timeout
    });
    
    const trainingTime = Date.now() - startTime;
    
    // Update model config
    const modelConfig = this.modelConfigs.get(modelName);
    modelConfig.trained = true;
    modelConfig.lastTrained = new Date().toISOString();
    modelConfig.trainingStats = {
      ...stats,
      trainingTime,
      sampleCount: trainingData.length
    };
    
    console.log(`Brain.js network '${modelName}' trained in ${trainingTime}ms`);
    console.log('Training stats:', stats);
    
    return stats;
  }

  /**
   * Train a TensorFlow.js model
   */
  async trainTensorFlowModel(modelName, trainingData, validationData = null, config = {}) {
    const model = this.tfModels.get(modelName);
    if (!model) {
      throw new Error(`TensorFlow model '${modelName}' not found`);
    }

    const trainConfig = { ...this.defaultTfConfig, ...config };
    
    // Prepare training data
    const xs = tf.tensor2d(trainingData.inputs);
    const ys = tf.tensor2d(trainingData.outputs);
    
    let validationXs, validationYs;
    if (validationData) {
      validationXs = tf.tensor2d(validationData.inputs);
      validationYs = tf.tensor2d(validationData.outputs);
    }
    
    console.log(`Training TensorFlow.js model '${modelName}' with ${trainingData.inputs.length} samples`);
    
    const startTime = Date.now();
    
    const history = await model.fit(xs, ys, {
      epochs: trainConfig.epochs,
      batchSize: trainConfig.batchSize,
      validationSplit: validationData ? 0 : trainConfig.validationSplit,
      validationData: validationData ? [validationXs, validationYs] : null,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc?.toFixed(4) || 'N/A'}`);
          }
        }
      }
    });
    
    const trainingTime = Date.now() - startTime;
    
    // Clean up tensors
    xs.dispose();
    ys.dispose();
    if (validationXs) validationXs.dispose();
    if (validationYs) validationYs.dispose();
    
    // Update model config
    const modelConfig = this.modelConfigs.get(modelName);
    modelConfig.trained = true;
    modelConfig.lastTrained = new Date().toISOString();
    modelConfig.trainingStats = {
      history: history.history,
      trainingTime,
      sampleCount: trainingData.inputs.length
    };
    
    console.log(`TensorFlow.js model '${modelName}' trained in ${trainingTime}ms`);
    
    return history;
  }

  /**
   * Make prediction with Brain.js network
   */
  predictWithBrain(modelName, input) {
    const network = this.brainNetworks.get(modelName);
    if (!network) {
      throw new Error(`Brain network '${modelName}' not found`);
    }

    const modelConfig = this.modelConfigs.get(modelName);
    if (!modelConfig.trained) {
      throw new Error(`Brain network '${modelName}' is not trained`);
    }

    return network.run(input);
  }

  /**
   * Make prediction with TensorFlow.js model
   */
  async predictWithTensorFlow(modelName, input) {
    const model = this.tfModels.get(modelName);
    if (!model) {
      throw new Error(`TensorFlow model '${modelName}' not found`);
    }

    const modelConfig = this.modelConfigs.get(modelName);
    if (!modelConfig.trained) {
      throw new Error(`TensorFlow model '${modelName}' is not trained`);
    }

    const inputTensor = tf.tensor2d([input]);
    const prediction = model.predict(inputTensor);
    const result = await prediction.data();
    
    inputTensor.dispose();
    prediction.dispose();
    
    return Array.from(result);
  }

  /**
   * Save Brain.js model
   */
  async saveBrainModel(modelName) {
    const network = this.brainNetworks.get(modelName);
    const config = this.modelConfigs.get(modelName);
    
    if (!network || !config) {
      throw new Error(`Brain network '${modelName}' not found`);
    }

    const modelData = {
      type: 'brain',
      network: network.toJSON(),
      config: config,
      savedAt: new Date().toISOString()
    };

    const filePath = path.join(this.modelsDir, `${modelName}_brain.json`);
    await fs.writeFile(filePath, JSON.stringify(modelData, null, 2));
    
    console.log(`Brain.js model '${modelName}' saved to ${filePath}`);
  }

  /**
   * Save TensorFlow.js model
   */
  async saveTensorFlowModel(modelName) {
    const model = this.tfModels.get(modelName);
    const config = this.modelConfigs.get(modelName);
    
    if (!model || !config) {
      throw new Error(`TensorFlow model '${modelName}' not found`);
    }

    const modelPath = path.join(this.modelsDir, `${modelName}_tensorflow`);
    await model.save(`file://${modelPath}`);
    
    // Save config separately
    const configPath = path.join(this.modelsDir, `${modelName}_tensorflow_config.json`);
    await fs.writeFile(configPath, JSON.stringify({
      ...config,
      savedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`TensorFlow.js model '${modelName}' saved to ${modelPath}`);
  }

  /**
   * Load Brain.js model
   */
  async loadBrainModel(modelName) {
    const filePath = path.join(this.modelsDir, `${modelName}_brain.json`);
    
    try {
      const modelData = JSON.parse(await fs.readFile(filePath, 'utf8'));
      
      const network = new brain.NeuralNetwork();
      network.fromJSON(modelData.network);
      
      this.brainNetworks.set(modelName, network);
      this.modelConfigs.set(modelName, modelData.config);
      
      console.log(`Brain.js model '${modelName}' loaded from ${filePath}`);
      return network;
    } catch (error) {
      console.log(`Brain.js model '${modelName}' not found, will create new model when needed`);
      return null;
    }
  }

  /**
   * Load TensorFlow.js model
   */
  async loadTensorFlowModel(modelName) {
    const modelPath = path.join(this.modelsDir, `${modelName}_tensorflow`);
    const configPath = path.join(this.modelsDir, `${modelName}_tensorflow_config.json`);
    
    try {
      const model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      this.tfModels.set(modelName, model);
      this.modelConfigs.set(modelName, config);
      
      console.log(`TensorFlow.js model '${modelName}' loaded from ${modelPath}`);
      return model;
    } catch (error) {
      console.log(`TensorFlow.js model '${modelName}' not found, will create new model when needed`);
      return null;
    }
  }

  /**
   * Load all existing models
   */
  async loadExistingModels() {
    try {
      const files = await fs.readdir(this.modelsDir);
      
      for (const file of files) {
        if (file.endsWith('_brain.json')) {
          const modelName = file.replace('_brain.json', '');
          await this.loadBrainModel(modelName);
        } else if (file.endsWith('_tensorflow_config.json')) {
          const modelName = file.replace('_tensorflow_config.json', '');
          await this.loadTensorFlowModel(modelName);
        }
      }
    } catch (error) {
      console.log('No existing models found or failed to load:', error.message);
    }
  }

  /**
   * Get model information
   */
  getModelInfo(modelName) {
    const config = this.modelConfigs.get(modelName);
    if (!config) {
      return null;
    }

    return {
      name: modelName,
      type: config.type,
      trained: config.trained,
      created: config.created,
      lastTrained: config.lastTrained,
      trainingStats: config.trainingStats
    };
  }

  /**
   * List all models
   */
  listModels() {
    const models = [];
    
    for (const [name, config] of this.modelConfigs) {
      models.push(this.getModelInfo(name));
    }
    
    return models;
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName) {
    const config = this.modelConfigs.get(modelName);
    if (!config) {
      throw new Error(`Model '${modelName}' not found`);
    }

    // Remove from memory
    this.brainNetworks.delete(modelName);
    this.tfModels.delete(modelName);
    this.modelConfigs.delete(modelName);

    // Remove files
    try {
      if (config.type === 'brain') {
        const filePath = path.join(this.modelsDir, `${modelName}_brain.json`);
        await fs.unlink(filePath);
      } else if (config.type === 'tensorflow') {
        const modelPath = path.join(this.modelsDir, `${modelName}_tensorflow`);
        const configPath = path.join(this.modelsDir, `${modelName}_tensorflow_config.json`);
        
        await fs.rm(modelPath, { recursive: true, force: true });
        await fs.unlink(configPath);
      }
      
      console.log(`Model '${modelName}' deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete model files for '${modelName}':`, error);
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    return {
      brainNetworks: this.brainNetworks.size,
      tfModels: this.tfModels.size,
      totalModels: this.modelConfigs.size,
      tfMemory: tf.memory()
    };
  }

  /**
   * Get memory usage (alias for compatibility)
   */
  getMemoryUsage() {
    return this.getMemoryStats();
  }

  /**
   * Get model info (alias for compatibility)
   */
  getModelInfoCompat(modelName) {
    return this.getModelInfo(modelName);
  }

  /**
   * Save model (unified interface)
   */
  async saveModel(modelName, type) {
    if (type === 'brain') {
      return await this.saveBrainModel(modelName);
    } else if (type === 'tensorflow') {
      return await this.saveTensorFlowModel(modelName);
    } else {
      throw new Error(`Unsupported model type: ${type}`);
    }
  }

  /**
   * Load model (unified interface)
   */
  async loadModel(modelName, type) {
    if (type === 'brain') {
      return await this.loadBrainModel(modelName);
    } else if (type === 'tensorflow') {
      return await this.loadTensorFlowModel(modelName);
    } else {
      throw new Error(`Unsupported model type: ${type}`);
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    // Dispose TensorFlow models
    for (const model of this.tfModels.values()) {
      model.dispose();
    }
    
    this.brainNetworks.clear();
    this.tfModels.clear();
    this.modelConfigs.clear();
    
    console.log('NeuralNetworkService disposed');
  }
}

export default NeuralNetworkService;