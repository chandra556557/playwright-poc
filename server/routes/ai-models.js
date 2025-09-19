import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

// Import AI services
import AIModelManager from '../services/AIModelManager.js';
import NeuralNetworkService from '../services/NeuralNetworkService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize AI services
let aiModelManager;
let neuralNetworkService;

// Initialize services
async function initializeServices() {
  try {
    neuralNetworkService = new NeuralNetworkService();
    await neuralNetworkService.initialize();
    
    aiModelManager = new AIModelManager(neuralNetworkService);
    await aiModelManager.init();
    
    console.log('AI model services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AI model services:', error);
  }
}

// Initialize on module load
initializeServices();

// Middleware to ensure services are initialized
const ensureInitialized = (req, res, next) => {
  if (!aiModelManager || !neuralNetworkService) {
    return res.status(503).json({
      success: false,
      error: 'AI services not initialized'
    });
  }
  next();
};

// Get all registered models
router.get('/models', ensureInitialized, async (req, res) => {
  try {
    const models = aiModelManager.getRegisteredModels();
    res.json({
      success: true,
      models: models
    });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get model status
router.get('/models/:modelName/status', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const status = await aiModelManager.getModelStatus(modelName);
    
    res.json({
      success: true,
      modelName,
      status
    });
  } catch (error) {
    console.error('Error getting model status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Train a model
router.post('/models/:modelName/train', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const { trainingData, options = {} } = req.body;
    
    if (!trainingData || !Array.isArray(trainingData)) {
      return res.status(400).json({
        success: false,
        error: 'Training data must be provided as an array'
      });
    }
    
    console.log(`Starting training for model: ${modelName}`);
    const result = await aiModelManager.trainModel(modelName, trainingData, options);
    
    res.json({
      success: true,
      modelName,
      trainingResult: result
    });
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Make predictions with a model
router.post('/models/:modelName/predict', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const { inputData } = req.body;
    
    if (!inputData) {
      return res.status(400).json({
        success: false,
        error: 'Input data must be provided'
      });
    }
    
    const predictions = await aiModelManager.predict(modelName, inputData);
    
    res.json({
      success: true,
      modelName,
      predictions
    });
  } catch (error) {
    console.error('Error making predictions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save a model
router.post('/models/:modelName/save', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const { filePath } = req.body;
    
    const savedPath = await aiModelManager.saveModel(modelName, filePath);
    
    res.json({
      success: true,
      modelName,
      savedPath
    });
  } catch (error) {
    console.error('Error saving model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Load a model
router.post('/models/:modelName/load', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path must be provided'
      });
    }
    
    await aiModelManager.loadModel(modelName, filePath);
    
    res.json({
      success: true,
      modelName,
      message: 'Model loaded successfully'
    });
  } catch (error) {
    console.error('Error loading model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get model performance metrics
router.get('/models/:modelName/metrics', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const metrics = await aiModelManager.getModelMetrics(modelName);
    
    res.json({
      success: true,
      modelName,
      metrics
    });
  } catch (error) {
    console.error('Error getting model metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch train multiple models
router.post('/models/batch-train', ensureInitialized, async (req, res) => {
  try {
    const { models } = req.body;
    
    if (!models || !Array.isArray(models)) {
      return res.status(400).json({
        success: false,
        error: 'Models array must be provided'
      });
    }
    
    const results = [];
    
    for (const modelConfig of models) {
      try {
        const { modelName, trainingData, options = {} } = modelConfig;
        console.log(`Batch training model: ${modelName}`);
        
        const result = await aiModelManager.trainModel(modelName, trainingData, options);
        results.push({
          modelName,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          modelName: modelConfig.modelName,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in batch training:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get training data statistics
router.get('/training-data/stats', ensureInitialized, async (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../../data/ai-models');
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      modelData: {}
    };
    
    try {
      const files = await fs.readdir(dataDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dataDir, file);
          const fileStat = await fs.stat(filePath);
          
          stats.totalFiles++;
          stats.totalSize += fileStat.size;
          
          const modelName = file.replace('.json', '');
          stats.modelData[modelName] = {
            size: fileStat.size,
            lastModified: fileStat.mtime
          };
        }
      }
    } catch (error) {
      console.warn('Training data directory not found:', error.message);
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting training data stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new model
router.post('/models', ensureInitialized, async (req, res) => {
  try {
    const { modelName, modelType, config = {} } = req.body;
    
    if (!modelName || !modelType) {
      return res.status(400).json({
        success: false,
        error: 'Model name and type are required'
      });
    }
    
    const result = await aiModelManager.createModel(modelName, modelType, config);
    
    res.json({
      success: true,
      modelName,
      modelType,
      result
    });
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a model
router.delete('/models/:modelName', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    
    await aiModelManager.deleteModel(modelName);
    
    res.json({
      success: true,
      modelName,
      message: 'Model deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get model configuration
router.get('/models/:modelName/config', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const config = await aiModelManager.getModelConfig(modelName);
    
    res.json({
      success: true,
      modelName,
      config
    });
  } catch (error) {
    console.error('Error getting model config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update model configuration
router.put('/models/:modelName/config', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration must be provided'
      });
    }
    
    await aiModelManager.updateModelConfig(modelName, config);
    
    res.json({
      success: true,
      modelName,
      message: 'Model configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating model config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get model training history
router.get('/models/:modelName/history', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const history = await aiModelManager.getTrainingHistory(modelName);
    
    res.json({
      success: true,
      modelName,
      history
    });
  } catch (error) {
    console.error('Error getting training history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export model
router.get('/models/:modelName/export', ensureInitialized, async (req, res) => {
  try {
    const { modelName } = req.params;
    const { format = 'json' } = req.query;
    
    const exportData = await aiModelManager.exportModel(modelName, format);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${modelName}.${format}"`);
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Import model
router.post('/models/import', ensureInitialized, async (req, res) => {
  try {
    const { modelName, modelData, format = 'json' } = req.body;
    
    if (!modelName || !modelData) {
      return res.status(400).json({
        success: false,
        error: 'Model name and data are required'
      });
    }
    
    const result = await aiModelManager.importModel(modelName, modelData, format);
    
    res.json({
      success: true,
      modelName,
      result
    });
  } catch (error) {
    console.error('Error importing model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get AI service statistics
router.get('/stats', ensureInitialized, async (req, res) => {
  try {
    const stats = {
      totalModels: aiModelManager.getRegisteredModels().length,
      activeModels: 0,
      totalTrainingSessions: 0,
      totalPredictions: 0,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    // Get additional stats from services
    const models = aiModelManager.getRegisteredModels();
    for (const model of models) {
      try {
        const status = await aiModelManager.getModelStatus(model.name);
        if (status.isActive) stats.activeModels++;
        if (status.trainingSessions) stats.totalTrainingSessions += status.trainingSessions;
        if (status.predictions) stats.totalPredictions += status.predictions;
      } catch (error) {
        console.warn(`Error getting stats for model ${model.name}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting AI service stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      aiModelManager: !!aiModelManager,
      neuralNetworkService: !!neuralNetworkService
    },
    models: aiModelManager ? aiModelManager.getRegisteredModels().length : 0
  };
  
  res.json(health);
});

export default router;