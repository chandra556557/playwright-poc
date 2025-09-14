import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Play, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Settings
} from 'lucide-react';
import TestRunnerConfig from '../components/TestRunnerConfig';

// Mock data for demonstration
const mockTestSuites = [
  {
    id: '1',
    name: 'E-commerce User Journey',
    description: 'Complete user journey from registration to checkout',
    testCount: 12,
    lastRun: '2024-01-15T10:30:00Z',
    status: 'passed',
    passRate: 91.7,
    createdAt: '2024-01-10T09:00:00Z',
    tags: ['e-commerce', 'critical', 'user-journey']
  },
  {
    id: '2',
    name: 'Authentication Flow',
    description: 'Login, logout, password reset, and session management',
    testCount: 8,
    lastRun: '2024-01-15T09:15:00Z',
    status: 'failed',
    passRate: 75.0,
    createdAt: '2024-01-08T14:20:00Z',
    tags: ['auth', 'security', 'critical']
  },
  {
    id: '3',
    name: 'Admin Dashboard',
    description: 'Admin panel functionality and user management',
    testCount: 15,
    lastRun: '2024-01-14T16:45:00Z',
    status: 'passed',
    passRate: 100.0,
    createdAt: '2024-01-05T11:30:00Z',
    tags: ['admin', 'dashboard', 'management']
  },
  {
    id: '4',
    name: 'API Integration Tests',
    description: 'Backend API endpoints and data validation',
    testCount: 20,
    lastRun: null,
    status: 'draft',
    passRate: null,
    createdAt: '2024-01-15T08:00:00Z',
    tags: ['api', 'backend', 'integration']
  }
];

export default function TestSuites() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  const [selectedSuiteForConfig, setSelectedSuiteForConfig] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: testSuites = mockTestSuites, isLoading } = useQuery({
    queryKey: ['test-suites'],
    queryFn: () => fetch('/api/test-suites').then(res => res.json()),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const filteredTestSuites = (Array.isArray(testSuites) ? testSuites : mockTestSuites).filter(suite => {
    const matchesSearch = suite.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         suite.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'passed' && suite.status === 'passed') ||
                         (selectedFilter === 'failed' && suite.status === 'failed') ||
                         (selectedFilter === 'draft' && suite.status === 'draft');
    
    return matchesSearch && matchesFilter;
  });

  const handleRunTests = async (suiteId: string) => {
    try {
      setRunningTests(prev => new Set([...prev, suiteId]));
      
      const response = await fetch(`/api/test-suites/${suiteId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start test execution');
      }
      
      const result = await response.json();
      console.log('Test execution started:', result);
      toast.success('Test execution started successfully!');
      
      // Remove from running state after a short delay to show feedback
      setTimeout(() => {
        setRunningTests(prev => {
          const newSet = new Set(prev);
          newSet.delete(suiteId);
          return newSet;
        });
        // Refresh test suites data to show updated status
        queryClient.invalidateQueries({ queryKey: ['test-suites'] });
      }, 2000);
      
    } catch (error) {
      console.error('Error running tests:', error);
      toast.error('Failed to start test execution');
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(suiteId);
        return newSet;
      });
      // Refresh test suites data even on error
      queryClient.invalidateQueries({ queryKey: ['test-suites'] });
    }
  };

  const handleRunWithConfig = (suiteId: string) => {
    setSelectedSuiteForConfig(suiteId);
    setShowConfig(true);
  };

  const handleConfiguredRun = async (config: any) => {
    if (!selectedSuiteForConfig) return;
    
    try {
      setRunningTests(prev => new Set([...prev, selectedSuiteForConfig]));
      
      const response = await fetch('/api/test-runner/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config,
          testSuiteIds: [selectedSuiteForConfig],
          options: {
            useCustomConfig: true
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start configured test execution');
      }
      
      const result = await response.json();
      console.log('Configured test execution started:', result);
      toast.success('Test execution started with custom configuration!');
      
      setShowConfig(false);
      setSelectedSuiteForConfig(null);
      
      // Remove from running state after a short delay
      setTimeout(() => {
        setRunningTests(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedSuiteForConfig!);
          return newSet;
        });
        // Refresh test suites data to show updated status
        queryClient.invalidateQueries({ queryKey: ['test-suites'] });
      }, 2000);
      
    } catch (error) {
      console.error('Error running configured tests:', error);
      toast.error('Failed to start configured test execution');
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedSuiteForConfig!);
        return newSet;
      });
      // Refresh test suites data even on error
      queryClient.invalidateQueries({ queryKey: ['test-suites'] });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Test Suites</h1>
          <p className="text-gray-600 mt-1">Manage and organize your Playwright test collections</p>
        </div>
        
        <Link
          to="/test-builder"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Test Suite
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search test suites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 md:w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          {filteredTestSuites.length} of {testSuites.length} test suites
        </div>
      </div>

      {/* Test Suites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTestSuites.map((suite) => (
          <div key={suite.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{suite.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{suite.description}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {getStatusIcon(suite.status)}
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{suite.testCount}</p>
                  <p className="text-sm text-gray-500">Tests</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {suite.passRate ? `${suite.passRate}%` : '—'}
                  </p>
                  <p className="text-sm text-gray-500">Pass Rate</p>
                </div>
              </div>

              {/* Status and Last Run */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(suite.status)}`}>
                  {suite.status}
                </span>
                <span className="text-sm text-gray-500">
                  Last run: {formatDate(suite.lastRun)}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {(suite.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleRunTests(suite.id)}
                  disabled={runningTests.has(suite.id)}
                  className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                    runningTests.has(suite.id) 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Play className={`w-4 h-4 mr-2 ${runningTests.has(suite.id) ? 'animate-spin' : ''}`} />
                  {runningTests.has(suite.id) ? 'Running...' : 'Run Tests'}
                </button>
                <button
                  onClick={() => handleRunWithConfig(suite.id)}
                  disabled={runningTests.has(suite.id)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Run with custom configuration"
                >
                  <Settings className="w-4 h-4 text-gray-600" />
                </button>
                <Link
                  to={`/test-builder/${suite.id}`}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </Link>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Trash2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTestSuites.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No test suites found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first test suite'
            }
          </p>
          {!searchTerm && selectedFilter === 'all' && (
            <Link
              to="/test-builder"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test Suite
            </Link>
          )}
        </div>
      )}

      {/* Test Runner Configuration Modal */}
      {showConfig && (
        <TestRunnerConfig
          isOpen={showConfig}
          onClose={() => {
            setShowConfig(false);
            setSelectedSuiteForConfig(null);
          }}
          onRunTests={handleConfiguredRun}
          testSuiteId={selectedSuiteForConfig}
        />
      )}
    </div>
  );
}