import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Brain,
  Target,
  TrendingUp,
  Sparkles,
  BarChart3
} from 'lucide-react';
import AllureReportModal from '../components/AllureReportModal';

type ExecutionItem = {
  id: string;
  testSuiteId: string;
  testSuiteName: string;
  status: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  progress: number;
  summary: { total: number; passed: number; failed: number; skipped: number; healing: number };
  browser: string;
  environment: string;
  reportUrl?: string | null;
};

// Mock data for demonstration
const mockExecutions: ExecutionItem[] = [
  {
    id: 'exec-1',
    testSuiteId: 'suite-1',
    testSuiteName: 'E-commerce User Journey',
    status: 'running',
    startTime: '2024-01-15T10:30:00Z',
    endTime: null,
    duration: null,
    progress: 65,
    summary: {
      total: 12,
      passed: 7,
      failed: 1,
      skipped: 0,
      healing: 2
    },
    browser: 'chromium',
    environment: 'staging',
    reportUrl: null
  },
  {
    id: 'exec-2',
    testSuiteId: 'suite-2',
    testSuiteName: 'Authentication Flow',
    status: 'passed',
    startTime: '2024-01-15T09:15:00Z',
    endTime: '2024-01-15T09:18:30Z',
    duration: 210000,
    progress: 100,
    summary: {
      total: 8,
      passed: 8,
      failed: 0,
      skipped: 0,
      healing: 1
    },
    browser: 'firefox',
    environment: 'production',
    reportUrl: '/allure-report/exec-2/index.html'
  },
  {
    id: 'exec-3',
    testSuiteId: 'suite-1',
    testSuiteName: 'E-commerce User Journey',
    status: 'failed',
    startTime: '2024-01-15T08:45:00Z',
    endTime: '2024-01-15T08:52:15Z',
    duration: 435000,
    progress: 100,
    summary: {
      total: 12,
      passed: 9,
      failed: 3,
      skipped: 0,
      healing: 4
    },
    browser: 'webkit',
    environment: 'staging',
    reportUrl: null
  },
  {
    id: 'exec-4',
    testSuiteId: 'suite-3',
    testSuiteName: 'Admin Dashboard',
    status: 'healing',
    startTime: '2024-01-15T08:00:00Z',
    endTime: null,
    duration: null,
    progress: 45,
    summary: {
      total: 15,
      passed: 6,
      failed: 1,
      skipped: 0,
      healing: 1
    },
    browser: 'chromium',
    environment: 'development',
    reportUrl: null
  }
];

export default function Executions() {
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [isAllureModalOpen, setIsAllureModalOpen] = useState(false);

  const { data: executions = mockExecutions, isLoading, refetch } = useQuery({
    queryKey: ['executions'],
    queryFn: async () => {
      const response = await fetch('/api/executions');
      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }
      const data = await response.json();
      // Normalize backend rows to UI-friendly shape
      // Backend returns: id, suite_id, status, startTime, endTime, duration, summary(JSON), reportUrl
      // UI expects: testSuiteName, browser, environment, progress, etc. We'll compute sane defaults.
      return (Array.isArray(data) ? data : []).map((e: any): ExecutionItem => ({
        id: e.id,
        testSuiteId: e.suite_id,
        testSuiteName: e.testSuite?.name || e.suite_id || 'Test Suite',
        status: e.status,
        startTime: e.startTime,
        endTime: e.endTime || null,
        duration: e.duration || null,
        progress: e.status === 'running' ? 50 : 100,
        summary: (() => { try { return typeof e.summary === 'string' ? JSON.parse(e.summary) : (e.summary || {}); } catch { return {}; } })(),
        browser: e.browser || 'chromium',
        environment: e.environment || 'default',
        reportUrl: e.reportUrl || null,
      }));
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  const handleViewAllureReport = (executionId: string) => {
    setSelectedExecution(executionId);
    setIsAllureModalOpen(true);
  };

  const handleCloseAllureModal = () => {
    setIsAllureModalOpen(false);
    setSelectedExecution(null);
  };

  // Show all executions without filtering
  const filteredExecutions = executions;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'healing':
        return <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'healing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '—';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'passed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'healing':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Executions</h1>
          <p className="text-gray-600 mt-1">Monitor test runs and view execution results with AI-powered healing</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg">
            <Brain className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">AI Healing Active</span>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>



      {/* Executions List */}
      <div className="space-y-4">
        {filteredExecutions.map((execution) => (
          <div key={execution.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getStatusIcon(execution.status)}
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{execution.testSuiteName}</h3>
                    {execution.status === 'healing' && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-xs font-medium">AI Healing Active</span>
                      </div>
                    )}
                    {execution.summary?.healing > 0 && execution.status !== 'healing' && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        <Target className="w-3 h-3" />
                        <span className="text-xs font-medium">{execution.summary?.healing} Auto-Healed</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span>Started: {formatTime(execution.startTime)}</span>
                    <span>•</span>
                    <span>Browser: {execution.browser}</span>
                    <span>•</span>
                    <span>Environment: {execution.environment}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                  {execution.status}
                </span>
                {/* Compact Allure link acts like a column/indicator */}
                {execution.reportUrl ? (
                  <a
                    href={execution.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition"
                    title="Open Allure Report"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Allure</span>
                  </a>
                ) : (
                  <button
                    onClick={() => handleViewAllureReport(execution.id)}
                    className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 transition"
                    title="Generate/Preview Allure Report"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Allure</span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-500">{execution.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(execution.status)}`}
                  style={{ width: `${execution.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Test Results Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{execution.summary?.total || 0}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{execution.summary?.passed || 0}</p>
                <p className="text-sm text-gray-500">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{execution.summary?.failed || 0}</p>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <p className="text-2xl font-bold text-purple-600">{execution.summary?.healing || 0}</p>
                  <Brain className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-sm text-gray-500">AI Healing</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{formatDuration(execution.duration)}</p>
                <p className="text-sm text-gray-500">Duration</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                {execution.status === 'running' && (
                  <>
                    <button className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </button>
                    <button className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </button>
                  </>
                )}
                {execution.status === 'healing' && (
                  <div className="flex items-center space-x-2 text-sm text-purple-600">
                    <Brain className="w-4 h-4 animate-pulse" />
                    <span>AI healing in progress...</span>
                    <div className="flex items-center space-x-1 ml-2">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs">85% success rate</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {execution.reportUrl ? (
                  <a
                    href={execution.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Open Allure report in a new tab"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Open Allure Report
                  </a>
                ) : (
                  <button 
                    onClick={() => handleViewAllureReport(execution.id)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate/Preview Allure
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredExecutions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No executions found</h3>
          <p className="text-gray-500 mb-6">
            Run your first test suite to see execution results here
          </p>
        </div>
      )}

      {/* Allure Report Modal */}
       <AllureReportModal
         isOpen={isAllureModalOpen}
         onClose={handleCloseAllureModal}
         executionId={selectedExecution || ''}
         executionName={selectedExecution ? executions.find(e => e.id === selectedExecution)?.testSuiteName : undefined}
       />
    </div>
  );
}