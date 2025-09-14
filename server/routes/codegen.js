import express from 'express';
import CodegenService from '../services/CodegenService.js';

const router = express.Router();
const codegenService = new CodegenService();

// Initialize the codegen service
codegenService.initialize().catch(console.error);

// WebSocket events for real-time updates
let wsClients = new Set();

// Set up WebSocket client tracking
export const setupCodegenWebSocket = (ws, req) => {
  wsClients.add(ws);
  
  ws.on('close', () => {
    wsClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected', path: '/codegen' }));
};

// Broadcast to all connected WebSocket clients
const broadcast = (data) => {
  const message = JSON.stringify(data);
  wsClients.forEach(ws => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(message);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        wsClients.delete(ws);
      }
    }
  });
};

// Set up event listeners for real-time updates
codegenService.on('recordingStarted', (data) => {
  broadcast({ type: 'recordingStarted', data });
});

codegenService.on('actionsRecorded', (data) => {
  broadcast({ type: 'actionsRecorded', data });
});

codegenService.on('recordingStopped', (data) => {
  broadcast({ type: 'recordingStopped', data });
});

// GET /api/codegen/status - Check service status
router.get('/status', (req, res) => {
  try {
    res.json({
      status: 'success',
      ready: codegenService.isReady(),
      supportedLanguages: codegenService.supportedLanguages,
      activeSessions: codegenService.recorderSessions.size,
      recordingMethods: {
        native: {
          name: 'Native Playwright Recording',
          description: 'Uses Playwright\'s built-in page.pause() and inspector for recording',
          advantages: ['Professional UI', 'Built-in selector generation', 'Real-time code preview', 'Stable and reliable'],
          supported: true
        },
        custom: {
          name: 'Custom Recording Engine',
          description: 'Uses custom JavaScript injection for recording user interactions',
          advantages: ['Customizable', 'Integrated with healing engine', 'Multi-language support'],
          supported: true
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// POST /api/codegen/start - Start a new recording session
router.post('/start', async (req, res) => {
  try {
    const {
      browserName = 'chromium',
      language = 'javascript',
      url = 'about:blank',
      viewport = { width: 1280, height: 720 },
      testIdAttribute = 'data-testid',
      generateAssertions = true,
      healingMode = true,
      useNativeRecording = true // Default to native Playwright recording
    } = req.body;

    if (!codegenService.isReady()) {
      return res.status(503).json({
        status: 'error',
        message: 'Codegen service is not ready'
      });
    }

    const result = await codegenService.startRecording({
      browserName,
      language,
      url,
      viewport,
      testIdAttribute,
      generateAssertions,
      healingMode,
      useNativeRecording
    });

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// POST /api/codegen/stop/:sessionId - Stop recording session
router.post('/stop/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await codegenService.stopRecording(sessionId);
    
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET /api/codegen/session/:sessionId - Get recording session status
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const status = codegenService.getRecordingStatus(sessionId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({
        status: 'error',
        message: 'Recording session not found'
      });
    }
    
    res.json({
      status: 'success',
      data: status
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET /api/codegen/code/:sessionId - Get generated code
router.get('/code/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { language } = req.query;
    
    const code = codegenService.getGeneratedCode(sessionId, language);
    
    res.json({
      status: 'success',
      data: {
        sessionId,
        language: language || 'current',
        code
      }
    });
  } catch (error) {
    console.error('Error getting generated code:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// POST /api/codegen/export/:sessionId - Export generated test
router.post('/export/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      language,
      filename,
      includeComments = true,
      includeHealing = true
    } = req.body;
    
    const result = await codegenService.exportTest(sessionId, {
      language,
      filename,
      includeComments,
      includeHealing
    });
    
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error exporting test:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET /api/codegen/sessions - List all active sessions
router.get('/sessions', (req, res) => {
  try {
    const sessions = [];
    
    for (const [sessionId, session] of codegenService.recorderSessions) {
      sessions.push({
        sessionId: session.id,
        status: session.status,
        language: session.language,
        actionsCount: session.actions.length,
        startTime: session.startTime,
        duration: session.status === 'completed' 
          ? session.duration 
          : Date.now() - session.startTime
      });
    }
    
    res.json({
      status: 'success',
      data: {
        sessions,
        total: sessions.length
      }
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// DELETE /api/codegen/session/:sessionId - Delete recording session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = codegenService.recorderSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Recording session not found'
      });
    }
    
    // Stop recording if still active
    if (session.status === 'recording') {
      await codegenService.stopRecording(sessionId);
    }
    
    // Clean up session
    if (session.pollInterval) {
      clearInterval(session.pollInterval);
    }
    if (session.context) {
      await session.context.close();
    }
    
    codegenService.recorderSessions.delete(sessionId);
    
    res.json({
      status: 'success',
      message: 'Recording session deleted'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// POST /api/codegen/pause/:sessionId - Pause recording
router.post('/pause/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = codegenService.recorderSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Recording session not found'
      });
    }
    
    if (session.status !== 'recording') {
      return res.status(400).json({
        status: 'error',
        message: 'Session is not currently recording'
      });
    }
    
    // Pause by clearing the polling interval
    if (session.pollInterval) {
      clearInterval(session.pollInterval);
      session.pollInterval = null;
    }
    
    session.status = 'paused';
    
    broadcast({
      type: 'recordingPaused',
      data: { sessionId }
    });
    
    res.json({
      status: 'success',
      message: 'Recording paused'
    });
  } catch (error) {
    console.error('Error pausing recording:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// POST /api/codegen/resume/:sessionId - Resume recording
router.post('/resume/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = codegenService.recorderSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Recording session not found'
      });
    }
    
    if (session.status !== 'paused') {
      return res.status(400).json({
        status: 'error',
        message: 'Session is not paused'
      });
    }
    
    // Resume by restarting the polling interval
    const pollActions = async () => {
      try {
        const actions = await session.page.evaluate(() => {
          if (!window.__playwrightRecorder) {
            return [];
          }
          const recorded = window.__playwrightRecorder.actions || [];
          window.__playwrightRecorder.actions = [];
          return recorded;
        });

        if (actions.length > 0) {
          session.actions.push(...actions);
          await codegenService.generateCodeFromActions(session);
          
          codegenService.emit('actionsRecorded', {
            sessionId: session.id,
            actions,
            generatedCode: session.generatedCode
          });
        }
      } catch (error) {
        console.error('Error polling actions:', error);
      }
    };
    
    session.pollInterval = setInterval(pollActions, 500);
    session.status = 'recording';
    
    broadcast({
      type: 'recordingResumed',
      data: { sessionId }
    });
    
    res.json({
      status: 'success',
      message: 'Recording resumed'
    });
  } catch (error) {
    console.error('Error resuming recording:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET /api/codegen/languages - Get supported languages
router.get('/languages', (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        languages: codegenService.supportedLanguages,
        default: 'javascript'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Template management endpoints
router.get('/templates', (req, res) => {
  try {
    const templates = codegenService.getAvailableTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

router.get('/templates/:language', (req, res) => {
  try {
    const { language } = req.params;
    const templates = codegenService.getAvailableTemplates()
      .filter(template => template.language === language);
    res.json({ templates });
  } catch (error) {
    console.error('Error getting templates by language:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

router.post('/templates', (req, res) => {
  try {
    const { name, template } = req.body;
    if (!name || !template) {
      return res.status(400).json({ error: 'Name and template are required' });
    }
    
    codegenService.addCustomTemplate(name, template);
    res.json({ success: true, message: 'Template added successfully' });
  } catch (error) {
    console.error('Error adding template:', error);
    res.status(500).json({ error: 'Failed to add template' });
  }
});

router.delete('/templates/:name', (req, res) => {
  try {
    const { name } = req.params;
    const success = codegenService.removeTemplate(name);
    
    if (success) {
      res.json({ success: true, message: 'Template removed successfully' });
    } else {
      res.status(404).json({ error: 'Template not found' });
    }
  } catch (error) {
    console.error('Error removing template:', error);
    res.status(500).json({ error: 'Failed to remove template' });
  }
});

// Healing engine endpoints
router.get('/healing/stats', (req, res) => {
  try {
    const stats = codegenService.getHealingStats();
    if (stats) {
      res.json({ stats });
    } else {
      res.json({ stats: null, message: 'Healing engine not available' });
    }
  } catch (error) {
    console.error('Error getting healing stats:', error);
    res.status(500).json({ error: 'Failed to get healing statistics' });
  }
});

router.post('/healing/mode', (req, res) => {
  try {
    const { enabled } = req.body;
    const healingMode = codegenService.setHealingMode(enabled);
    res.json({ healingMode, message: `Healing mode ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Error setting healing mode:', error);
    res.status(500).json({ error: 'Failed to set healing mode' });
  }
});

router.post('/healing/generate', (req, res) => {
  try {
    const { testSteps, language = 'javascript' } = req.body;
    if (!testSteps || !Array.isArray(testSteps)) {
      return res.status(400).json({ error: 'Test steps are required' });
    }
    
    const healingCode = codegenService.generateHealingAwareCode(testSteps, language);
    res.json({ healingCode, language });
  } catch (error) {
    console.error('Error generating healing code:', error);
    res.status(500).json({ error: 'Failed to generate healing-aware code' });
  }
});

// Export endpoints
router.get('/export/formats', (req, res) => {
  try {
    const formats = codegenService.getSupportedExportFormats();
    res.json({ formats });
  } catch (error) {
    console.error('Error getting export formats:', error);
    res.status(500).json({ error: 'Failed to get export formats' });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { testCode, language, format, options = {} } = req.body;
    
    if (!testCode || !language || !format) {
      return res.status(400).json({ 
        error: 'Test code, language, and format are required' 
      });
    }
    
    const exportResult = await codegenService.exportCode(testCode, language, format, options);
    
    // Handle different export types
    if (exportResult.type === 'zip-archive' || exportResult.mimeType === 'application/zip') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
      res.send(exportResult.content);
    } else if (exportResult.type === 'single-file') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
      res.send(exportResult.content);
    } else if (exportResult.type === 'project-structure') {
      res.json(exportResult);
    } else {
      res.setHeader('Content-Type', exportResult.mimeType || 'text/plain');
      if (exportResult.fileName) {
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
      }
      res.send(exportResult.content);
    }
  } catch (error) {
    console.error('Error exporting code:', error);
    res.status(500).json({ error: 'Failed to export code' });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Codegen API Error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('Cleaning up codegen service...');
  await codegenService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Cleaning up codegen service...');
  await codegenService.cleanup();
  process.exit(0);
});

export default router;