import React, { useState, useEffect } from 'react';
import { Settings, Play, Save, RotateCcw, Info, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface PlaywrightConfig {
  testDir: string;
  fullyParallel: boolean;
  retries: number;
  workers: number | undefined;
  reporter: string;
  timeout: number;
  baseURL: string;
  headless: boolean;
  trace: string;
  screenshot: string;
  video: string;
  browsers: string[];
  viewport: {
    width: number;
    height: number;
  };
}

interface TestRunnerConfigProps {
  onConfigChange?: (config: PlaywrightConfig) => void;
  onRunTests?: (config: PlaywrightConfig) => void;
  isVisible: boolean;
  onClose: () => void;
}

const defaultConfig: PlaywrightConfig = {
  testDir: './exports',
  fullyParallel: true,
  retries: 0,
  workers: undefined,
  reporter: 'html',
  timeout: 30000,
  baseURL: 'http://localhost:3001',
  headless: true,
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  browsers: ['chromium'],
  viewport: {
    width: 1280,
    height: 720
  }
};

const TestRunnerConfig: React.FC<TestRunnerConfigProps> = ({
  onConfigChange,
  onRunTests,
  isVisible,
  onClose
}) => {
  const [config, setConfig] = useState<PlaywrightConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'execution' | 'browsers' | 'debugging'>('general');

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const response = await fetch('/api/test-runner/config');
      if (response.ok) {
        const savedConfig = await response.json();
        setConfig({ ...defaultConfig, ...savedConfig });
      }
    } catch (error) {
      console.log('No saved config found, using defaults');
    }
  };

  const saveConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/test-runner/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Configuration saved successfully!');
        onConfigChange?.(config);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
    toast.success('Configuration reset to defaults');
  };

  const runWithConfig = () => {
    onRunTests?.(config);
    onClose();
  };

  const updateConfig = (key: keyof PlaywrightConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateViewport = (key: 'width' | 'height', value: number) => {
    setConfig(prev => ({
      ...prev,
      viewport: { ...prev.viewport, [key]: value }
    }));
  };

  const toggleBrowser = (browser: string) => {
    setConfig(prev => ({
      ...prev,
      browsers: prev.browsers.includes(browser)
        ? prev.browsers.filter(b => b !== browser)
        : [...prev.browsers, browser]
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Test Runner Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'execution', label: 'Execution', icon: Play },
            { id: 'browsers', label: 'Browsers', icon: Info },
            { id: 'debugging', label: 'Debugging', icon: AlertCircle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Directory
                  </label>
                  <input
                    type="text"
                    value={config.testDir}
                    onChange={(e) => updateConfig('testDir', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={config.baseURL}
                    onChange={(e) => updateConfig('baseURL', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reporter
                  </label>
                  <select
                    value={config.reporter}
                    onChange={(e) => updateConfig('reporter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="html">HTML</option>
                    <option value="json">JSON</option>
                    <option value="junit">JUnit</option>
                    <option value="list">List</option>
                    <option value="dot">Dot</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Viewport Width
                  </label>
                  <input
                    type="number"
                    value={config.viewport.width}
                    onChange={(e) => updateViewport('width', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Viewport Height
                  </label>
                  <input
                    type="number"
                    value={config.viewport.height}
                    onChange={(e) => updateViewport('height', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'execution' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workers
                  </label>
                  <input
                    type="number"
                    value={config.workers || ''}
                    onChange={(e) => updateConfig('workers', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Auto (CPU cores)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retries
                  </label>
                  <input
                    type="number"
                    value={config.retries}
                    onChange={(e) => updateConfig('retries', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.fullyParallel}
                    onChange={(e) => updateConfig('fullyParallel', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Run tests in parallel</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.headless}
                    onChange={(e) => updateConfig('headless', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Headless mode</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'browsers' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Select Browsers to Test
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {['chromium', 'firefox', 'webkit'].map(browser => (
                    <label key={browser} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={config.browsers.includes(browser)}
                        onChange={() => toggleBrowser(browser)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900 capitalize">{browser}</div>
                        <div className="text-sm text-gray-500">
                          {browser === 'chromium' && 'Chrome, Edge, Opera'}
                          {browser === 'firefox' && 'Firefox'}
                          {browser === 'webkit' && 'Safari'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debugging' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trace Collection
                  </label>
                  <select
                    value={config.trace}
                    onChange={(e) => updateConfig('trace', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                    <option value="retain-on-failure">Retain on Failure</option>
                    <option value="on-first-retry">On First Retry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Screenshots
                  </label>
                  <select
                    value={config.screenshot}
                    onChange={(e) => updateConfig('screenshot', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                    <option value="only-on-failure">Only on Failure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Recording
                </label>
                <select
                  value={config.video}
                  onChange={(e) => updateConfig('video', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                  <option value="retain-on-failure">Retain on Failure</option>
                  <option value="on-first-retry">On First Retry</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={resetToDefaults}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={saveConfig}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Saving...' : 'Save Config'}</span>
            </button>
            
            <button
              onClick={runWithConfig}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Run with Config</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestRunnerConfig;