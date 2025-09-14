import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { v4 as uuidv4 } from 'uuid';

// Mock Redis for testing
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(),
    disconnect: vi.fn().mockResolvedValue(),
    on: vi.fn(),
    duplicate: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(),
      disconnect: vi.fn().mockResolvedValue(),
      on: vi.fn()
    }))
  }))
}));

// Mock services
vi.mock('../../services/CodegenService.js', () => ({
  default: class MockCodegenService {
    constructor() {
      this.sessions = new Map();
    }
    
    startRecording = vi.fn().mockImplementation(async (options) => {
      const sessionId = uuidv4();
      const session = {
        sessionId,
        status: 'recording',
        actions: [],
        startTime: Date.now()
      };
      this.sessions.set(sessionId, session);
      return session;
    });
    
    stopRecording = vi.fn().mockImplementation(async (sessionId) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'stopped';
        session.endTime = Date.now();
      }
      return session;
    });
    
    getRecordingStatus = vi.fn().mockImplementation((sessionId) => {
      return this.sessions.get(sessionId);
    });
    
    addAction = vi.fn().mockImplementation((sessionId, action) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.actions.push({
          ...action,
          timestamp: Date.now()
        });
      }
    });
    
    generateCode = vi.fn().mockImplementation((sessionId) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        return {
          code: `// Generated test for session ${sessionId}\ntest('recorded test', async () => {\n  // Test actions\n});`,
          language: 'javascript'
        };
      }
      return null;
    });
    
    // EventEmitter methods
    on = vi.fn();
    emit = vi.fn();
  }
}));

vi.mock('../../services/HealingEngine.js', () => ({
  default: class MockHealingEngine {
    analyzeFailure = vi.fn().mockResolvedValue({
      type: 'element-not-found',
      confidence: 0.85,
      suggestions: [
        {
          strategy: 'wait-for-element',
          confidence: 0.9,
          code: 'await page.waitForSelector(selector, { timeout: 5000 });'
        }
      ]
    });
    
    healTest = vi.fn().mockResolvedValue({
      success: true,
      healedCode: 'healed test code',
      appliedStrategies: ['wait-for-element']
    });
    
    getStats = vi.fn().mockReturnValue({
      totalAttempts: 15,
      successfulHealing: 12,
      successRate: 0.8
    });
  }
}));

describe('WebSocket Integration Tests', () => {
  let app;
  let server;
  let io;
  let clientSocket;
  let serverSocket;
  let port;
  
  beforeAll(async () => {
    // Create Express app and HTTP server
    app = express();
    server = createServer(app);
    
    // Create Socket.IO server
    io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });
    
    // Mock services
    const mockCodegenService = new (await import('../../services/CodegenService.js')).default();
    const mockHealingEngine = new (await import('../../services/HealingEngine.js')).default();
    
    // Set up Socket.IO event handlers
    io.on('connection', (socket) => {
      serverSocket = socket;
      
      // Recording events
      socket.on('start-recording', async (data, callback) => {
        try {
          const session = await mockCodegenService.startRecording(data.options);
          socket.join(`session-${session.sessionId}`);
          
          // Broadcast to room
          io.to(`session-${session.sessionId}`).emit('recording-started', {
            sessionId: session.sessionId,
            status: session.status,
            timestamp: Date.now()
          });
          
          callback({ success: true, session });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });
      
      socket.on('stop-recording', async (data, callback) => {
        try {
          const session = await mockCodegenService.stopRecording(data.sessionId);
          
          // Generate code
          const generatedCode = mockCodegenService.generateCode(data.sessionId);
          
          // Broadcast to room
          io.to(`session-${data.sessionId}`).emit('recording-stopped', {
            sessionId: data.sessionId,
            status: 'stopped',
            generatedCode,
            timestamp: Date.now()
          });
          
          callback({ success: true, session, generatedCode });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });
      
      socket.on('get-recording-status', (data, callback) => {
        const session = mockCodegenService.getRecordingStatus(data.sessionId);
        callback({ success: !!session, session });
      });
      
      // Action recording events
      socket.on('record-action', (data) => {
        mockCodegenService.addAction(data.sessionId, data.action);
        
        // Broadcast action to all clients in the session room
        socket.to(`session-${data.sessionId}`).emit('action-recorded', {
          sessionId: data.sessionId,
          action: data.action,
          timestamp: Date.now()
        });
      });
      
      // Code generation events
      socket.on('generate-code', (data, callback) => {
        const result = mockCodegenService.generateCode(data.sessionId);
        
        if (result) {
          // Broadcast code update
          io.to(`session-${data.sessionId}`).emit('code-generated', {
            sessionId: data.sessionId,
            code: result.code,
            language: result.language,
            timestamp: Date.now()
          });
          
          callback({ success: true, ...result });
        } else {
          callback({ success: false, error: 'Session not found' });
        }
      });
      
      // Healing events
      socket.on('analyze-failure', async (data, callback) => {
        try {
          const analysis = await mockHealingEngine.analyzeFailure(data.error, data.context);
          
          // Broadcast analysis result
          socket.emit('failure-analyzed', {
            sessionId: data.sessionId,
            analysis,
            timestamp: Date.now()
          });
          
          callback({ success: true, analysis });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });
      
      socket.on('heal-test', async (data, callback) => {
        try {
          const result = await mockHealingEngine.healTest(data.testCode, data.error);
          
          // Broadcast healing result
          io.to(`session-${data.sessionId}`).emit('test-healed', {
            sessionId: data.sessionId,
            result,
            timestamp: Date.now()
          });
          
          callback({ success: true, ...result });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });
      
      // Room management
      socket.on('join-session', (data, callback) => {
        socket.join(`session-${data.sessionId}`);
        
        // Notify others in the room
        socket.to(`session-${data.sessionId}`).emit('user-joined', {
          sessionId: data.sessionId,
          userId: data.userId || socket.id,
          timestamp: Date.now()
        });
        
        callback({ success: true, message: 'Joined session' });
      });
      
      socket.on('leave-session', (data, callback) => {
        socket.leave(`session-${data.sessionId}`);
        
        // Notify others in the room
        socket.to(`session-${data.sessionId}`).emit('user-left', {
          sessionId: data.sessionId,
          userId: data.userId || socket.id,
          timestamp: Date.now()
        });
        
        callback({ success: true, message: 'Left session' });
      });
      
      // Error handling
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', { message: error.message, timestamp: Date.now() });
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', reason);
      });
    });
    
    // Start server
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });
  
  afterAll(async () => {
    if (clientSocket) {
      clientSocket.close();
    }
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });
  
  beforeEach(async () => {
    // Create client socket for each test
    clientSocket = new WebSocket(`ws://localhost:${port}/socket.io/?EIO=4&transport=websocket`);
    
    await new Promise((resolve, reject) => {
      clientSocket.on('open', resolve);
      clientSocket.on('error', reject);
    });
  });
  
  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
      clientSocket = null;
    }
    vi.clearAllMocks();
  });
  
  describe('Connection Management', () => {
    it('establishes WebSocket connection successfully', async () => {
      expect(clientSocket.readyState).toBe(WebSocket.OPEN);
    });
    
    it('handles connection errors gracefully', async () => {
      const errorSocket = new WebSocket('ws://localhost:99999/socket.io/?EIO=4&transport=websocket');
      
      await expect(new Promise((resolve, reject) => {
        errorSocket.on('open', resolve);
        errorSocket.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 1000);
      })).rejects.toThrow();
    });
    
    it('handles client disconnection', async () => {
      let disconnected = false;
      
      if (serverSocket) {
        serverSocket.on('disconnect', () => {
          disconnected = true;
        });
      }
      
      clientSocket.close();
      
      // Wait for disconnect event
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(disconnected).toBe(true);
    });
  });
  
  describe('Recording Session Events', () => {
    it('starts recording session via WebSocket', (done) => {
      const sessionOptions = {
        language: 'javascript',
        browserName: 'chromium',
        url: 'https://example.com'
      };
      
      // Listen for recording started event
      const handleRecordingStarted = (data) => {
        expect(data).toHaveProperty('sessionId');
        expect(data).toHaveProperty('status', 'recording');
        expect(data).toHaveProperty('timestamp');
        done();
      };
      
      // Send start recording message
      const message = JSON.stringify([
        'start-recording',
        { options: sessionOptions },
        (response) => {
          expect(response.success).toBe(true);
          expect(response.session).toHaveProperty('sessionId');
        }
      ]);
      
      clientSocket.send(`42${message}`);
      
      // Set up event listener
      clientSocket.on('message', (data) => {
        const parsed = data.toString();
        if (parsed.includes('recording-started')) {
          const eventData = JSON.parse(parsed.slice(2))[1];
          handleRecordingStarted(eventData);
        }
      });
    });
    
    it('stops recording session and generates code', (done) => {
      const sessionId = uuidv4();
      
      // Listen for recording stopped event
      const handleRecordingStopped = (data) => {
        expect(data).toHaveProperty('sessionId', sessionId);
        expect(data).toHaveProperty('status', 'stopped');
        expect(data).toHaveProperty('generatedCode');
        expect(data.generatedCode).toHaveProperty('code');
        expect(data.generatedCode).toHaveProperty('language');
        done();
      };
      
      // Send stop recording message
      const message = JSON.stringify([
        'stop-recording',
        { sessionId },
        (response) => {
          expect(response.success).toBe(true);
        }
      ]);
      
      clientSocket.send(`42${message}`);
      
      // Set up event listener
      clientSocket.on('message', (data) => {
        const parsed = data.toString();
        if (parsed.includes('recording-stopped')) {
          const eventData = JSON.parse(parsed.slice(2))[1];
          handleRecordingStopped(eventData);
        }
      });
    });
    
    it('gets recording status', (done) => {
      const sessionId = uuidv4();
      
      const message = JSON.stringify([
        'get-recording-status',
        { sessionId },
        (response) => {
          expect(response).toHaveProperty('success');
          expect(response).toHaveProperty('session');
          done();
        }
      ]);
      
      clientSocket.send(`42${message}`);
    });
  });
  
  describe('Action Recording Events', () => {
    it('records and broadcasts user actions', (done) => {
      const sessionId = uuidv4();
      const action = {
        type: 'click',
        selector: '#submit-button',
        coordinates: { x: 100, y: 200 },
        timestamp: Date.now()
      };
      
      // Listen for action recorded event
      const handleActionRecorded = (data) => {
        expect(data).toHaveProperty('sessionId', sessionId);
        expect(data).toHaveProperty('action');
        expect(data.action).toHaveProperty('type', 'click');
        expect(data.action).toHaveProperty('selector', '#submit-button');
        done();
      };
      
      // Send record action message
      const message = JSON.stringify([
        'record-action',
        { sessionId, action }
      ]);
      
      clientSocket.send(`42${message}`);
      
      // Set up event listener
      clientSocket.on('message', (data) => {
        const parsed = data.toString();
        if (parsed.includes('action-recorded')) {
          const eventData = JSON.parse(parsed.slice(2))[1];
          handleActionRecorded(eventData);
        }
      });
    });
  });
  
  describe('Code Generation Events', () => {
    it('generates and broadcasts code updates', (done) => {
      const sessionId = uuidv4();
      
      // Listen for code generated event
      const handleCodeGenerated = (data) => {
        expect(data).toHaveProperty('sessionId', sessionId);
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('language');
        expect(data.code).toContain('Generated test');
        done();
      };
      
      // Send generate code message
      const message = JSON.stringify([
        'generate-code',
        { sessionId },
        (response) => {
          expect(response.success).toBe(true);
          expect(response).toHaveProperty('code');
        }
      ]);
      
      clientSocket.send(`42${message}`);
      
      // Set up event listener
      clientSocket.on('message', (data) => {
        const parsed = data.toString();
        if (parsed.includes('code-generated')) {
          const eventData = JSON.parse(parsed.slice(2))[1];
          handleCodeGenerated(eventData);
        }
      });
    });
  });
  
  describe('Healing Events', () => {
    it('analyzes test failures', (done) => {
      const sessionId = uuidv4();
      const error = {
        message: 'Element not found',
        selector: '#missing-element',
        type: 'TimeoutError'
      };
      
      // Listen for failure analyzed event
      const handleFailureAnalyzed = (data) => {
        expect(data).toHaveProperty('sessionId', sessionId);
        expect(data).toHaveProperty('analysis');
        expect(data.analysis).toHaveProperty('type');
        expect(data.analysis).toHaveProperty('confidence');
        expect(data.analysis).toHaveProperty('suggestions');
        done();
      };
      
      // Send analyze failure message
      const message = JSON.stringify([
        'analyze-failure',
        { sessionId, error, context: {} },
        (response) => {
          expect(response.success).toBe(true);
          expect(response).toHaveProperty('analysis');
        }
      ]);
      
      clientSocket.send(`42${message}`);
      
      // Set up event listener
      clientSocket.on('message', (data) => {
        const parsed = data.toString();
        if (parsed.includes('failure-analyzed')) {
          const eventData = JSON.parse(parsed.slice(2))[1];
          handleFailureAnalyzed(eventData);
        }
      });
    });
    
    it('heals failing tests', (done) => {
      const sessionId = uuidv4();
      const testCode = 'await page.click("#submit");';
      const error = { message: 'Element not found' };
      
      // Listen for test healed event
      const handleTestHealed = (data) => {
        expect(data).toHaveProperty('sessionId', sessionId);
        expect(data).toHaveProperty('result');
        expect(data.result).toHaveProperty('success', true);
        expect(data.result).toHaveProperty('healedCode');
        done();
      };
      
      // Send heal test message
      const message = JSON.stringify([
        'heal-test',
        { sessionId, testCode, error },
        (response) => {
          expect(response.success).toBe(true);
          expect(response).toHaveProperty('healedCode');
        }
      ]);
      
      clientSocket.send(`42${message}`);
      
      // Set up event listener
      clientSocket.on('message', (data) => {
        const parsed = data.toString();
        if (parsed.includes('test-healed')) {
          const eventData = JSON.parse(parsed.slice(2))[1];
          handleTestHealed(eventData);
        }
      });
    });
  });
  
  describe('Room Management', () => {
    it('joins and leaves session rooms', (done) => {
      const sessionId = uuidv4();
      const userId = 'test-user-123';
      
      let joinedReceived = false;
      
      // Listen for user joined event
      const handleUserJoined = (data) => {
        expect(data).toHaveProperty('sessionId', sessionId);
        expect(data).toHaveProperty('userId');
        joinedReceived = true;
      };
      
      // Send join session message
      const joinMessage = JSON.stringify([
        'join-session',
        { sessionId, userId },
        (response) => {
          expect(response.success).toBe(true);
          expect(response.message).toBe('Joined session');
          
          // Now leave the session
          const leaveMessage = JSON.stringify([
            'leave-session',
            { sessionId, userId },
            (response) => {
              expect(response.success).toBe(true);
              expect(response.message).toBe('Left session');
              done();
            }
          ]);
          
          clientSocket.send(`42${leaveMessage}`);
        }
      ]);
      
      clientSocket.send(`42${joinMessage}`);
      
      // Set up event listener
      clientSocket.on('message', (data) => {
        const parsed = data.toString();
        if (parsed.includes('user-joined')) {
          const eventData = JSON.parse(parsed.slice(2))[1];
          handleUserJoined(eventData);
        }
      });
    });
  });
  
  describe('Error Handling', () => {
    it('handles invalid message format', (done) => {
      // Send invalid message
      clientSocket.send('invalid-message-format');
      
      // Should not crash the server
      setTimeout(() => {
        expect(clientSocket.readyState).toBe(WebSocket.OPEN);
        done();
      }, 100);
    });
    
    it('handles service errors gracefully', (done) => {
      const sessionId = 'non-existent-session';
      
      const message = JSON.stringify([
        'generate-code',
        { sessionId },
        (response) => {
          expect(response.success).toBe(false);
          expect(response).toHaveProperty('error');
          done();
        }
      ]);
      
      clientSocket.send(`42${message}`);
    });
  });
  
  describe('Performance and Scalability', () => {
    it('handles multiple concurrent connections', async () => {
      const connections = [];
      const numConnections = 5;
      
      // Create multiple connections
      for (let i = 0; i < numConnections; i++) {
        const socket = new WebSocket(`ws://localhost:${port}/socket.io/?EIO=4&transport=websocket`);
        connections.push(socket);
        
        await new Promise((resolve, reject) => {
          socket.on('open', resolve);
          socket.on('error', reject);
        });
      }
      
      // Verify all connections are open
      connections.forEach(socket => {
        expect(socket.readyState).toBe(WebSocket.OPEN);
      });
      
      // Clean up
      connections.forEach(socket => socket.close());
    });
    
    it('handles rapid message sending', (done) => {
      const sessionId = uuidv4();
      let messagesReceived = 0;
      const totalMessages = 10;
      
      // Listen for action recorded events
      clientSocket.on('message', (data) => {
        const parsed = data.toString();
        if (parsed.includes('action-recorded')) {
          messagesReceived++;
          if (messagesReceived === totalMessages) {
            done();
          }
        }
      });
      
      // Send multiple messages rapidly
      for (let i = 0; i < totalMessages; i++) {
        const action = {
          type: 'click',
          selector: `#button-${i}`,
          timestamp: Date.now()
        };
        
        const message = JSON.stringify([
          'record-action',
          { sessionId, action }
        ]);
        
        clientSocket.send(`42${message}`);
      }
    });
  });
});