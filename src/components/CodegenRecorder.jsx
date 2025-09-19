import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Pause, Download, Code, Settings, Eye, Edit3, Copy, Trash2, RefreshCw } from 'lucide-react';

const CodegenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [generatedCode, setGeneratedCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [template, setTemplate] = useState('javascript-playwright');
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [exportFormats, setExportFormats] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [recordingOptions, setRecordingOptions] = useState({
    browserName: 'chromium',
    url: 'https://example.com',
    viewport: { width: 1280, height: 720 },
    testIdAttribute: 'data-testid',
    generateAssertions: true,
    healingMode: true,
    useNativeRecording: true // Default to native Playwright recording
  });
  const [actions, setActions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editableCode, setEditableCode] = useState('');
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [pomClassName, setPomClassName] = useState('GeneratedPage');
  const [pomConverting, setPomConverting] = useState(false);
  const [pomResult, setPomResult] = useState(null);
  const [serviceStatus, setServiceStatus] = useState({ ready: false });
  const [wsConnected, setWsConnected] = useState(false);
  const [healingStats, setHealingStats] = useState(null);
  // Run test state
  const [currentRunId, setCurrentRunId] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [runProgress, setRunProgress] = useState(0);
  const [runMessage, setRunMessage] = useState('');
  const [runSummary, setRunSummary] = useState(null);
  const [runReportUrl, setRunReportUrl] = useState(null);
  
  const wsRef = useRef(null);
  const codeEditorRef = useRef(null);

  // Run current code as a Playwright test via backend (top-level)
  const runCurrentCode = async () => {
    try {
      const code = editableCode || generatedCode;
      if (!code || code.trim().length === 0) return;
      setRunStatus('starting');
      setRunProgress(0);
      setRunMessage('Submitting test to runner...');
      setRunSummary(null);
      setCurrentRunId(null);

      // Try proxy first
      let res = await fetch('/api/codegen/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: selectedLanguage })
      });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok || data?.status !== 'success') {
        // Fallback to direct backend
        res = await fetch('http://localhost:3001/api/codegen/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: selectedLanguage })
        });
        data = await res.json();
      }
      if (res.ok && data?.status === 'success') {
        setCurrentRunId(data.executionId);
        setRunStatus('running');
        setRunMessage('Test started...');
        setRunReportUrl(null);
      } else {
        setRunStatus('error');
        setRunMessage(data?.message || 'Failed to start test run');
      }
    } catch (e) {
      setRunStatus('error');
      setRunMessage(e.message || 'Run failed to start');
    }
  };

  // On completion, fetch execution for reportUrl (top-level)
  useEffect(() => {
    const fetchExecution = async (id) => {
      try {
        let res = await fetch(`/api/executions/${id}`);
        if (!res.ok) res = await fetch(`http://localhost:3001/api/executions/${id}`);
        if (!res.ok) return;
        const exec = await res.json();
        if (exec?.reportUrl) setRunReportUrl(exec.reportUrl);
      } catch {}
    };
    if (currentRunId && (runStatus === 'passed' || runStatus === 'failed' || runStatus === 'error')) {
      fetchExecution(currentRunId);
    }
  }, [currentRunId, runStatus]);

  // WebSocket connection and event handlers
  useEffect(() => {
    const connectWebSocket = () => {
      // Use the same protocol and host as the current page
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // This includes the port if specified
      const wsUrl = `${protocol}//${host}/codegen`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('CodeGen WebSocket connected');
        setWsConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
          if (data.type === 'testExecution') {
            const upd = data.data || {};
            if (!currentRunId || upd.executionId !== currentRunId) return;
            setRunStatus(upd.status || 'running');
            if (typeof upd.progress === 'number') setRunProgress(upd.progress);
            if (upd.message) setRunMessage(upd.message);
            if (upd.summary) setRunSummary(upd.summary);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('CodeGen WebSocket disconnected');
        setWsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('CodeGen WebSocket error:', error);
        setWsConnected(false);
      };
    };
    
    connectWebSocket();
    
    // Load available templates
    loadTemplates();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentRunId]);

  // Load templates when language changes
  useEffect(() => {
    loadTemplates();
  }, [selectedLanguage]);

  // Load healing stats periodically
  useEffect(() => {
    const loadHealingStats = async () => {
      try {
        const response = await fetch('/api/codegen/healing/stats');
        if (response.ok) {
          const data = await response.json();
          setHealingStats(data.stats);
        }
      } catch (error) {
        console.error('Error loading healing stats:', error);
      }
    };

    loadHealingStats();
    const interval = setInterval(loadHealingStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Load export formats
  useEffect(() => {
    const loadExportFormats = async () => {
      try {
        const response = await fetch('/api/codegen/export/formats');
        if (response.ok) {
          const data = await response.json();
          setExportFormats(data.formats || []);
        }
      } catch (error) {
        console.error('Error loading export formats:', error);
      }
    };

    loadExportFormats();
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'recordingStarted':
        setCurrentSession(data.data.sessionId);
        setIsRecording(true);
        setIsPaused(false);
        setActions([]);
        setGeneratedCode('');
        break;
        
      case 'actionsRecorded':
        setActions(prev => [...prev, ...data.data.actions]);
        setGeneratedCode(data.data.generatedCode);
        setEditableCode(data.data.generatedCode);
        break;
        
      case 'recordingStopped':
        setIsRecording(false);
        setIsPaused(false);
        setGeneratedCode(data.data.generatedCode);
        setEditableCode(data.data.generatedCode);
        loadSessions();
        break;
        
      case 'recordingPaused':
        setIsPaused(true);
        break;
        
      case 'recordingResumed':
        setIsPaused(false);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  // Load service status and supported languages
  useEffect(() => {
    loadServiceStatus();
    loadSupportedLanguages();
    loadSessions();
  }, []);

  const loadServiceStatus = async () => {
    try {
      const response = await fetch('/api/codegen/status');
      const data = await response.json();
      if (data.status === 'success') {
        setServiceStatus(data);
      }
    } catch (error) {
      console.error('Error loading service status:', error);
    }
  };

  const loadSupportedLanguages = async () => {
    try {
      const response = await fetch('/api/codegen/languages');
      const data = await response.json();
      if (data.status === 'success') {
        setSupportedLanguages(data.data.languages);
      }
    } catch (error) {
      console.error('Error loading supported languages:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/codegen/sessions');
      const data = await response.json();
      if (data.status === 'success') {
        setSessions(data.data.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/codegen/templates/${selectedLanguage}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
        
        // Auto-select first template if current template is not available
        if (data.templates?.length > 0) {
          const templateExists = data.templates.some(t => t.id === template);
          if (!templateExists) {
            setTemplate(data.templates[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const startRecording = async () => {
    try {
      const response = await fetch('/api/codegen/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...recordingOptions,
          language: selectedLanguage,
          template
        })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setCurrentSession(data.data.sessionId);
        setIsRecording(true);
        setIsPaused(false);
        setActions([]);
        setGeneratedCode('');
        setEditableCode('');
      } else {
        alert('Failed to start recording: ' + data.message);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording: ' + error.message);
    }
  };

  const stopRecording = async () => {
    if (!currentSession) return;
    
    try {
      const response = await fetch(`/api/codegen/stop/${currentSession}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setIsRecording(false);
        setIsPaused(false);
        setGeneratedCode(data.data.generatedCode);
        setEditableCode(data.data.generatedCode);
        setCurrentSession(null);
        loadSessions();
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const pauseRecording = async () => {
    if (!currentSession) return;
    
    try {
      const response = await fetch(`/api/codegen/pause/${currentSession}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Error pausing recording:', error);
    }
  };

  const resumeRecording = async () => {
    if (!currentSession) return;
    
    try {
      const response = await fetch(`/api/codegen/resume/${currentSession}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setIsPaused(false);
      }
    } catch (error) {
      console.error('Error resuming recording:', error);
    }
  };

  const exportCode = async (sessionId = currentSession) => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/codegen/export/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language: selectedLanguage,
          template,
          filename: `test-${Date.now()}`,
          includeComments: true,
          includeHealing: recordingOptions.healingMode
        })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        // Create download link
        const blob = new Blob([editableCode || generatedCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting code:', error);
    }
  };

  const copyCode = () => {
    const codeToCopy = editableCode || generatedCode;
    navigator.clipboard.writeText(codeToCopy).then(() => {
      // Show success message
      const button = document.getElementById('copy-button');
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  };

  const deleteSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/codegen/session/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadSessions();
        if (currentSession === sessionId) {
          setCurrentSession(null);
          setIsRecording(false);
          setIsPaused(false);
          setGeneratedCode('');
          setEditableCode('');
          setActions([]);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const loadSessionCode = async (sessionId) => {
    try {
      const response = await fetch(`/api/codegen/code/${sessionId}?language=${selectedLanguage}`);
      const data = await response.json();
      if (data.status === 'success') {
        setGeneratedCode(data.data.code);
        setEditableCode(data.data.code);
      }
    } catch (error) {
      console.error('Error loading session code:', error);
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleExport = async (format, options = {}) => {
    try {
      const exportData = {
        testCode: editableCode || generatedCode,
        language: selectedLanguage,
        format,
        options: {
          fileName: options.fileName || `test.${selectedLanguage === 'javascript' ? 'js' : selectedLanguage === 'python' ? 'py' : 'txt'}`,
          projectName: options.projectName || 'generated-tests',
          description: options.description || 'Generated test code'
        }
      };

      const response = await fetch('/api/codegen/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
      });

      if (response.ok) {
        if (format === 'project-structure') {
          const result = await response.json();
          // Handle project structure display
          console.log('Project structure:', result);
        } else {
          // Handle file download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = exportData.options.fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
        setShowExportModal(false);
      } else {
        console.error('Export failed:', await response.text());
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Convert current code (edited or generated) to POM using backend
  const convertToPOM = async () => {
    try {
      setPomConverting(true);
      setPomResult(null);
      const code = editableCode || generatedCode;
      if (!code || code.trim().length === 0) return;
      let res = await fetch('/api/pom/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: selectedLanguage === 'typescript' ? 'typescript' : 'javascript',
          className: pomClassName,
          testName: 'recorded-test'
        })
      });
      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        // likely HTML (404 from frontend) — fall back
      }
      if (!res.ok || !data?.success) {
        res = await fetch('http://localhost:3001/api/pom/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language: selectedLanguage === 'typescript' ? 'typescript' : 'javascript',
            className: pomClassName,
            testName: 'recorded-test'
          })
        });
        data = await res.json();
      }
      if (res.ok && data?.success) {
        setPomResult(data);
      } else {
        console.error('POM conversion failed:', data?.error || 'Unknown error');
      }
    } catch (e) {
      console.error('POM conversion error:', e);
    } finally {
      setPomConverting(false);
    }
  };

  // Download helper for POM files
  const downloadContent = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                🎬 Test Recorder & Code Generator
              </h1>
              <p className="text-gray-600">
                Record user interactions and generate test code in multiple languages
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                serviceStatus.ready && wsConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  serviceStatus.ready && wsConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {serviceStatus.ready && wsConnected ? 'Connected' : 'Disconnected'}
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recording Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recording Controls</h2>
              
              {/* Language Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isRecording}
                >
                  {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code Template
                </label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isRecording}
                >
                  {availableTemplates.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* URL Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target URL
                </label>
                <input
                  type="url"
                  value={recordingOptions.url}
                  onChange={(e) => setRecordingOptions(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                  disabled={isRecording}
                />
              </div>

              {/* Recording Buttons */}
              <div className="flex space-x-2 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!serviceStatus.ready}
                    className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={pauseRecording}
                        className="flex-1 flex items-center justify-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={resumeRecording}
                        className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Resume</span>
                      </button>
                    )}
                    <button
                      onClick={stopRecording}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Square className="w-4 h-4" />
                      <span>Stop</span>
                    </button>
                  </>
                )}
              </div>

              {/* Recording Status */}
              {isRecording && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-800 font-medium">
                      {isPaused ? 'Recording Paused' : 'Recording Active'}
                    </span>
                  </div>
                  <div className="text-sm text-red-600 mt-1">
                    Actions recorded: {actions.length}
                  </div>
                </div>
              )}

              {/* Actions List */}
              {actions.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Actions</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {actions.slice(-10).map((action, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                        <div className="font-medium text-gray-900">
                          {action.type.toUpperCase()}
                        </div>
                        <div className="text-gray-600 truncate">
                          {action.selector || action.url || JSON.stringify(action).slice(0, 50)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recording Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Browser
                    </label>
                    <select
                      value={recordingOptions.browserName}
                      onChange={(e) => setRecordingOptions(prev => ({ ...prev, browserName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isRecording}
                    >
                      <option value="chromium">Chromium</option>
                      <option value="firefox">Firefox</option>
                      <option value="webkit">WebKit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Test ID Attribute
                    </label>
                    <input
                      type="text"
                      value={recordingOptions.testIdAttribute}
                      onChange={(e) => setRecordingOptions(prev => ({ ...prev, testIdAttribute: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isRecording}
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="generateAssertions"
                      checked={recordingOptions.generateAssertions}
                      onChange={(e) => setRecordingOptions(prev => ({ ...prev, generateAssertions: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isRecording}
                    />
                    <label htmlFor="generateAssertions" className="text-sm text-gray-700">
                      Generate Assertions
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="healingMode"
                      checked={recordingOptions.healingMode}
                      onChange={async (e) => {
                        const enabled = e.target.checked;
                        setRecordingOptions(prev => ({ ...prev, healingMode: enabled }));
                        
                        // Update healing mode on server
                        try {
                          await fetch('/api/codegen/healing/mode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enabled })
                          });
                        } catch (error) {
                          console.error('Error updating healing mode:', error);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isRecording}
                    />
                    <label htmlFor="healingMode" className="text-sm text-gray-700">
                      Enable Healing Mode
                    </label>
                  </div>

                  {/* Recording Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recording Method
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="nativeRecording"
                          name="recordingMethod"
                          checked={recordingOptions.useNativeRecording}
                          onChange={() => setRecordingOptions(prev => ({ ...prev, useNativeRecording: true }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          disabled={isRecording}
                        />
                        <label htmlFor="nativeRecording" className="text-sm text-gray-700">
                          <span className="font-medium">Native Playwright Recording</span>
                          <div className="text-xs text-gray-500 mt-1">
                            Uses Playwright's built-in inspector with professional UI, real-time code preview, and stable selector generation
                          </div>
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="customRecording"
                          name="recordingMethod"
                          checked={!recordingOptions.useNativeRecording}
                          onChange={() => setRecordingOptions(prev => ({ ...prev, useNativeRecording: false }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          disabled={isRecording}
                        />
                        <label htmlFor="customRecording" className="text-sm text-gray-700">
                          <span className="font-medium">Custom Recording Engine</span>
                          <div className="text-xs text-gray-500 mt-1">
                            Uses custom JavaScript injection with integrated healing engine and multi-language support
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Healing Stats */}
                  {healingStats && recordingOptions.healingMode && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Healing Statistics</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                        <div>Healed Selectors: {healingStats.healedSelectors || 0}</div>
                        <div>Success Rate: {healingStats.successRate || 0}%</div>
                        <div>Total Attempts: {healingStats.totalAttempts || 0}</div>
                        <div>Failed Attempts: {healingStats.failedAttempts || 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sessions List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recording Sessions</h2>
                <button
                  onClick={loadSessions}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessions.map(session => (
                  <div key={session.sessionId} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {session.sessionId.slice(-8)}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => loadSessionCode(session.sessionId)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Load Code"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => exportCode(session.sessionId)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Export"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteSession(session.sessionId)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      <div>Status: {session.status}</div>
                      <div>Language: {session.language}</div>
                      <div>Actions: {session.actionsCount}</div>
                      <div>Duration: {formatDuration(session.duration)}</div>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No recording sessions yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Code Preview/Editor */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Generated Test Code</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCodeEditor(!showCodeEditor)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                      showCodeEditor 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{showCodeEditor ? 'Preview' : 'Edit'}</span>
                  </button>
                  <input
                    type="text"
                    value={pomClassName}
                    onChange={(e) => setPomClassName(e.target.value)}
                    placeholder="POM Class Name"
                    title="POM Class Name"
                    className="px-2 py-1 border rounded text-sm"
                    style={{ minWidth: 140 }}
                  />
                  <button
                    onClick={convertToPOM}
                    disabled={pomConverting || !(editableCode || generatedCode)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                      pomConverting ? 'bg-indigo-200 text-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                    title="Convert current code to Page Object Model"
                  >
                    <Code className="w-4 h-4" />
                    <span>{pomConverting ? 'Converting...' : 'Convert to POM'}</span>
                  </button>
                  <button
                    onClick={runCurrentCode}
                    disabled={!(editableCode || generatedCode) || runStatus === 'running' || runStatus === 'starting'}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                      runStatus === 'running' || runStatus === 'starting'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    title="Execute this test via Playwright"
                  >
                    <Play className="w-4 h-4" />
                    <span>{runStatus === 'running' || runStatus === 'starting' ? 'Running...' : 'Run Test'}</span>
                  </button>
                  <button
                    id="copy-button"
                    onClick={copyCode}
                    className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    disabled={!generatedCode && !editableCode}
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    disabled={!generatedCode && !editableCode}
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Code Display */}
              <div className="relative">
                {showCodeEditor ? (
                  <textarea
                    ref={codeEditorRef}
                    value={editableCode}
                    onChange={(e) => setEditableCode(e.target.value)}
                    className="w-full h-96 font-mono text-sm border border-gray-200 rounded p-3"
                  />
                ) : (
                  <pre className="w-full h-96 overflow-auto bg-gray-50 border border-gray-200 rounded p-3 text-sm"><code>{editableCode || generatedCode || '// No code yet'}</code></pre>
                )}

                {/* Live Run Status Panel */}
                {(runStatus || currentRunId) && (
                  <div className="mt-4 p-4 border rounded bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                          runStatus === 'passed' ? 'bg-green-100 text-green-800' :
                          runStatus === 'failed' ? 'bg-red-100 text-red-800' :
                          runStatus === 'error' ? 'bg-red-100 text-red-800' :
                          runStatus === 'running' || runStatus === 'starting' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {runStatus || 'pending'}
                        </div>
                        {currentRunId && (
                          <span className="text-xs text-gray-500">Run ID: {currentRunId.slice(0,8)}...</span>
                        )}
                      </div>
                      {runReportUrl && (
                        <a
                          href={runReportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm px-3 py-1 bg-gray-800 text-white rounded hover:bg-black"
                        >
                          Open Allure Report
                        </a>
                      )}
                    </div>
                    {(runStatus === 'running' || runStatus === 'starting') && (
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded h-2">
                          <div className="h-2 rounded bg-blue-600 transition-all" style={{ width: `${Math.max(5, Math.min(95, runProgress || 5))}%` }} />
                        </div>
                      </div>
                    )}
                    {runMessage && <div className="text-sm text-gray-700">{runMessage}</div>}
                    {runSummary && (
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="text-sm font-semibold">{runSummary.total || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Passed</div>
                          <div className="text-sm font-semibold text-green-600">{runSummary.passed || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Failed</div>
                          <div className="text-sm font-semibold text-red-600">{runSummary.failed || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Skipped</div>
                          <div className="text-sm font-semibold text-gray-600">{runSummary.skipped || 0}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* POM Result Panel */}
                {pomResult && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="border rounded p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{pomResult.files?.pageObject?.fileName}</h3>
                        <button
                          className="text-xs bg-gray-800 text-white px-2 py-1 rounded"
                          onClick={() => downloadContent(pomResult.files?.pageObject?.fileName, pomResult.files?.pageObject?.content)}
                        >Download</button>
                      </div>
                      <pre className="bg-gray-50 rounded p-2 overflow-auto text-xs"><code>{pomResult.files?.pageObject?.content}</code></pre>
                    </div>
                    <div className="border rounded p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{pomResult.files?.test?.fileName}</h3>
                        <button
                          className="text-xs bg-gray-800 text-white px-2 py-1 rounded"
                          onClick={() => downloadContent(pomResult.files?.test?.fileName, pomResult.files?.test?.content)}
                        >Download</button>
                      </div>
                      <pre className="bg-gray-50 rounded p-2 overflow-auto text-xs"><code>{pomResult.files?.test?.content}</code></pre>
                    </div>
                  </div>
                )}
                
                {/* Language indicator */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-gray-800 text-white text-xs rounded">
                  {selectedLanguage}
                </div>
              </div>

              {/* Code Stats */}
              {(generatedCode || editableCode) && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Lines: {(editableCode || generatedCode).split('\n').length} | 
                    Characters: {(editableCode || generatedCode).length}
                  </div>
                  <div>
                    Actions: {actions.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Export Test Code</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <div className="space-y-2">
                    {exportFormats.map(format => (
                      <button
                        key={format.id}
                        onClick={() => handleExport(format.id)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium">{format.name}</div>
                        <div className="text-sm text-gray-600">{format.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodegenRecorder;