import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  Wrench, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap,
  Target,
  Clock,
  BarChart3,
  Settings,
  Play,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Search,
  Filter,
  Download,
  Bell,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Mock data for demonstration
const mockHealingData = {
  summary: {
    totalAttempts: 156,
    successfulHealings: 134,
    failedHealings: 22,
    successRate: 85.9,
    avgHealingTime: 2.3,
    strategiesLearned: 45
  },
  recentHealings: [
    {
      id: '1',
      testName: 'Login Form Validation',
      failureType: 'element-not-found',
      originalError: 'Element with selector "#login-btn" not found',
      healingStrategy: 'alternative-selector',
      newSelector: '[data-testid="login-button"]',
      status: 'success',
      confidence: 0.92,
      timestamp: '2024-01-15T10:30:00Z',
      healingTime: 1.8
    },
    {
      id: '2',
      testName: 'Product Search',
      failureType: 'element-not-interactable',
      originalError: 'Element is not clickable at point (100, 200)',
      healingStrategy: 'scroll-into-view',
      newSelector: '.search-input',
      status: 'success',
      confidence: 0.87,
      timestamp: '2024-01-15T10:25:00Z',
      healingTime: 2.1
    },
    {
      id: '3',
      testName: 'Checkout Process',
      failureType: 'network-timeout',
      originalError: 'Navigation timeout exceeded',
      healingStrategy: 'network-retry',
      newSelector: null,
      status: 'failed',
      confidence: 0.45,
      timestamp: '2024-01-15T10:20:00Z',
      healingTime: 5.2
    }
  ],
  healingTrends: [
    { date: '2024-01-01', attempts: 12, successful: 10, failed: 2 },
    { date: '2024-01-02', attempts: 15, successful: 13, failed: 2 },
    { date: '2024-01-03', attempts: 8, successful: 7, failed: 1 },
    { date: '2024-01-04', attempts: 20, successful: 18, failed: 2 },
    { date: '2024-01-05', attempts: 18, successful: 16, failed: 2 },
    { date: '2024-01-06', attempts: 25, successful: 22, failed: 3 },
    { date: '2024-01-07', attempts: 22, successful: 20, failed: 2 },
  ],
  failureTypes: [
    { name: 'Element Not Found', value: 45, color: '#EF4444' },
    { name: 'Not Interactable', value: 30, color: '#F59E0B' },
    { name: 'Network Issues', value: 15, color: '#3B82F6' },
    { name: 'Timing Issues', value: 10, color: '#8B5CF6' },
  ],
  topStrategies: [
    { name: 'alternative-selector', used: 45, successful: 42, successRate: 93.3 },
    { name: 'scroll-into-view', used: 32, successful: 28, successRate: 87.5 },
    { name: 'wait-for-stability', used: 28, successful: 24, successRate: 85.7 },
    { name: 'network-retry', used: 25, successful: 18, successRate: 72.0 },
    { name: 'force-interaction', used: 15, successful: 8, successRate: 53.3 },
  ]
};

export default function HealingCenter() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [realTimeData, setRealTimeData] = useState(mockHealingData);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [maxAttempts, setMaxAttempts] = useState('5');
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);

  const { data: healingAnalytics, isLoading } = useQuery({
    queryKey: ['healing-analytics'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/healing/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch healing analytics');
        }
        return await response.json();
      } catch (error) {
        console.warn('Failed to fetch healing analytics:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://localhost:3001');
        
        wsRef.current.onopen = () => {
          setIsConnected(true);
          toast.success('Connected to real-time healing monitoring');
        };
        
        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'healing_update') {
            setRealTimeData(prev => ({
              ...prev,
              recentHealings: [data.healing, ...prev.recentHealings.slice(0, 9)],
              summary: {
                ...prev.summary,
                totalAttempts: prev.summary.totalAttempts + 1,
                successfulHealings: data.healing.status === 'success' 
                  ? prev.summary.successfulHealings + 1 
                  : prev.summary.successfulHealings,
                failedHealings: data.healing.status === 'failed' 
                  ? prev.summary.failedHealings + 1 
                  : prev.summary.failedHealings
              }
            }));
            
            // Show notification for new healing
            const notification = {
              id: Date.now(),
              type: data.healing.status,
              message: `${data.healing.testName}: ${data.healing.status === 'success' ? 'Healed' : 'Failed'}`,
              timestamp: new Date().toISOString()
            };
            setNotifications(prev => [notification, ...prev.slice(0, 4)]);
            
            if (data.healing.status === 'success') {
              toast.success(`Test healed: ${data.healing.testName}`);
            } else {
              toast.error(`Healing failed: ${data.healing.testName}`);
            }
          } else if (data.type === 'healingApplied') {
            // Backend emits { type: 'healingApplied', data: { testId, result } }
            const result = data.data?.result;
            if (result) {
              const status = result.success ? 'success' : 'failed';
              const healing = {
                id: `${data.data.testId}-${Date.now()}`,
                testName: data.data.testId || 'Test',
                failureType: result.failureType || 'unknown',
                originalError: result.error || '',
                healingStrategy: result.strategy || 'healing',
                newSelector: result.newSelector || null,
                status,
                confidence: typeof result.confidence === 'number' ? result.confidence : 0.7,
                timestamp: new Date().toISOString(),
                healingTime: Math.round((result.executionTime || 0) / 100) / 10,
              } as any;
              setRealTimeData(prev => ({
                ...prev,
                recentHealings: [healing, ...prev.recentHealings.slice(0, 9)],
                summary: {
                  ...prev.summary,
                  totalAttempts: prev.summary.totalAttempts + 1,
                  successfulHealings: status === 'success' ? prev.summary.successfulHealings + 1 : prev.summary.successfulHealings,
                  failedHealings: status === 'failed' ? prev.summary.failedHealings + 1 : prev.summary.failedHealings
                }
              }));
            }
          } else if (data.type === 'testExecution') {
            // Can optionally reflect live changes to trends/summary based on execution updates
            const summary = data.data?.summary;
            if (summary) {
              setRealTimeData(prev => ({
                ...prev,
                summary: {
                  ...prev.summary,
                  totalAttempts: typeof summary.healing === 'number' ? summary.healing : prev.summary.totalAttempts
                }
              }));
            }
          }
        };
        
        wsRef.current.onclose = () => {
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
        
        wsRef.current.onerror = () => {
          setIsConnected(false);
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setIsConnected(false);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'recent', name: 'Recent Healings', icon: Clock },
    { id: 'strategies', name: 'Strategies', icon: Target },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  // Helper functions for healing actions
  const handleRetryHealing = async (healingId) => {
    try {
      const response = await fetch(`/api/healing/${healingId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast.success('Healing retry initiated');
      } else {
        toast.error('Failed to retry healing');
      }
    } catch (error) {
      toast.error('Error retrying healing');
    }
  };

  const handleApproveHealing = async (healingId) => {
    try {
      const response = await fetch(`/api/healing/${healingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast.success('Healing approved and applied');
        setRealTimeData(prev => ({
          ...prev,
          recentHealings: prev.recentHealings.map(h => 
            h.id === healingId ? { ...h, status: 'approved' } : h
          )
        }));
      } else {
        toast.error('Failed to approve healing');
      }
    } catch (error) {
      toast.error('Error approving healing');
    }
  };

  const handleRejectHealing = async (healingId) => {
    try {
      const response = await fetch(`/api/healing/${healingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast.success('Healing rejected');
        setRealTimeData(prev => ({
          ...prev,
          recentHealings: prev.recentHealings.map(h => 
            h.id === healingId ? { ...h, status: 'rejected' } : h
          )
        }));
      } else {
        toast.error('Failed to reject healing');
      }
    } catch (error) {
      toast.error('Error rejecting healing');
    }
  };

  // Prefer real data; only use mock if API entirely unavailable
  const displayData = healingAnalytics ?? null;
  
  // Transform API data to match expected structure
  const transformedData = (() => {
    if (!displayData) {
      return {
        summary: {
          totalAttempts: 0,
          successfulHealings: 0,
          failedHealings: 0,
          successRate: 0,
          avgHealingTime: 0,
          strategiesLearned: 0
        },
        recentHealings: [],
        healingTrends: [],
        failureTypes: [],
        topStrategies: []
      };
    }

    // Build Recent Healings list from backend fields when specific array not provided
    const recentFromApi = Array.isArray(displayData.recentHealings)
      ? displayData.recentHealings
      : ([
          ...(Array.isArray(displayData.recentSuccesses) ? displayData.recentSuccesses.map((r:any) => ({
            id: r.id || `${r.testId || 't'}-success-${r.timestamp || Date.now()}`,
            testName: r.testName || r.testId || 'Test',
            failureType: r.failureType || 'unknown',
            originalError: r.originalError || '',
            healingStrategy: r.strategy || r.healingStrategy || 'unknown',
            newSelector: r.newSelector || null,
            status: 'success',
            confidence: r.confidence ?? 0.75,
            timestamp: r.timestamp || new Date().toISOString(),
            healingTime: Math.round((r.healingTime || (displayData.averageHealingTime || 0)) / 100) / 10,
          })) : []),
          ...(Array.isArray(displayData.recentFailures) ? displayData.recentFailures.map((r:any) => ({
            id: r.id || `${r.testId || 't'}-failed-${r.timestamp || Date.now()}`,
            testName: r.testName || r.testId || 'Test',
            failureType: r.failureType || 'unknown',
            originalError: r.originalError || '',
            healingStrategy: r.strategy || r.healingStrategy || 'unknown',
            newSelector: r.newSelector || null,
            status: 'failed',
            confidence: r.confidence ?? 0.45,
            timestamp: r.timestamp || new Date().toISOString(),
            healingTime: Math.round((r.healingTime || (displayData.averageHealingTime || 0)) / 100) / 10,
          })) : []),
        ] as any[]).sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0,20);

    const failureTypes = displayData.failureTypes || (displayData.commonFailures ? 
      Object.entries(displayData.commonFailures).map(([name, value]: any, index: number) => ({
        name: String(name).replace(/-/g, ' ').replace(/\b\w/g, (l:any) => l.toUpperCase()),
        value: Number(value),
        color: ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'][index % 5]
      })) : []);

    return {
      summary: {
        totalAttempts: displayData.totalHealingAttempts || 0,
        successfulHealings: displayData.successfulHealings || 0,
        failedHealings: displayData.failedHealings || 0,
        successRate: (displayData.healingSuccessRate || 0) * 100,
        avgHealingTime: (displayData.averageHealingTime || 0) / 1000,
        strategiesLearned: displayData.recentActivity?.newStrategiesLearned || 0
      },
      recentHealings: recentFromApi,
      healingTrends: Array.isArray(displayData.healingTrends) ? displayData.healingTrends : [],
      failureTypes,
      topStrategies: Array.isArray(displayData.topStrategies) ? displayData.topStrategies : []
    };
  })();

  // Filter healings based on search and status
  const filteredHealings = (transformedData?.recentHealings || []).filter(healing => {
    const matchesSearch = healing.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         healing.failureType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || healing.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Export functionality
  const handleExportData = () => {
    const dataToExport = {
      summary: transformedData.summary,
      recentHealings: filteredHealings,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healing-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Healing report exported successfully');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getFailureTypeColor = (type: string) => {
    switch (type) {
      case 'element-not-found':
        return 'bg-red-100 text-red-800';
      case 'element-not-interactable':
        return 'bg-yellow-100 text-yellow-800';
      case 'network-timeout':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
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
          <div className="grid grid-cols-4 gap-4">
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
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Healing Center</h1>
              <p className="text-gray-600 mt-1">AI-powered test recovery and adaptation</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Real-time connection status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            <Activity className={`w-4 h-4 ${
              isConnected ? 'text-green-500' : 'text-red-500'
            }`} />
          </div>
          
          {/* Notifications */}
            <div className="relative">
              <button 
                className="p-2 text-gray-400 hover:text-gray-600 relative"
                onClick={() => setNotifications([])}
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {/* Notification Panel */}
              {notifications.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Recent Notifications</h4>
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          
          {/* Export button */}
          <button
            onClick={handleExportData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Healing Active</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{transformedData.summary?.successRate || 0}%</p>
              <p className="text-sm text-gray-500 mt-1">
                {transformedData.summary?.successfulHealings || 0} of {transformedData.summary?.totalAttempts || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Healing Time</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{transformedData.summary?.avgHealingTime || 0}s</p>
              <p className="text-sm text-gray-500 mt-1">Per attempt</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Attempts</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{transformedData.summary?.totalAttempts || 0}</p>
              <p className="text-sm text-gray-500 mt-1">This month</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Wrench className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Strategies Learned</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{transformedData.summary?.strategiesLearned || 0}</p>
              <p className="text-sm text-gray-500 mt-1">AI adaptations</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Brain className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Time Range Filter */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Time Range:</span>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                </div>
              </div>
              
              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Success Rate</p>
                      <p className="text-2xl font-bold text-green-700">{transformedData.summary?.successRate || 0}%</p>
                      <p className="text-xs text-green-600 mt-1">↑ +2.3% from last week</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Avg Healing Time</p>
                      <p className="text-2xl font-bold text-blue-700">{transformedData.summary?.avgHealingTime || 0}s</p>
                      <p className="text-xs text-blue-600 mt-1">↓ -0.5s from last week</p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Total Attempts</p>
                      <p className="text-2xl font-bold text-purple-700">{transformedData.summary?.totalAttempts || 0}</p>
                      <p className="text-xs text-purple-600 mt-1">↑ +12 from yesterday</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Strategies Learned</p>
                      <p className="text-2xl font-bold text-orange-700">{transformedData.summary?.strategiesLearned || 0}</p>
                      <p className="text-xs text-orange-600 mt-1">↑ +3 new this week</p>
                    </div>
                    <Brain className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </div>
              
              {/* Healing Trends Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Healing Trends</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={transformedData?.healingTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attempts" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        name="Attempts"
                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="successful" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="Successful"
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Failure Types</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={transformedData?.failureTypes || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(Array.isArray(transformedData?.failureTypes) ? transformedData.failureTypes : []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {(Array.isArray(transformedData?.failureTypes) ? transformedData.failureTypes : []).map((type, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          ></div>
                          <span className="text-sm text-gray-700">{type.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{type.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'recent' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Healing Actions</h3>
                <div className="flex items-center space-x-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search healings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  {/* Status filter */}
                  <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {filteredHealings.map((healing) => (
                  <div key={healing.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(healing.status)}
                        <div>
                          <h4 className="font-medium text-gray-900">{healing.testName}</h4>
                          <p className="text-sm text-gray-500">{formatTime(healing.timestamp)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFailureTypeColor(healing.failureType)}`}>
                          {healing.failureType.replace('-', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {healing.healingTime}s
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Original Error:</span> {healing.originalError}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Healing Strategy:</span> {healing.healingStrategy}
                        {healing.newSelector && (
                          <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded">
                            {healing.newSelector}
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Confidence:</span>
                        <div className="flex items-center space-x-1">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${healing.confidence * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(healing.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {healing.status === 'failed' && (
                          <button
                            onClick={() => handleRetryHealing(healing.id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Retry
                          </button>
                        )}
                        
                        {healing.status === 'success' && healing.confidence < 0.8 && (
                          <>
                            <button
                              onClick={() => handleApproveHealing(healing.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectHealing(healing.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />
                              Reject
                            </button>
                          </>
                        )}
                        
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'strategies' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Healing Strategies Management</h3>
                <button className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                  <Play className="w-4 h-4 mr-2" />
                  Run Strategy Test
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Active Strategies</h4>
                  {(Array.isArray(transformedData?.topStrategies) ? transformedData.topStrategies : []).map((strategy, index) => (
                    <div key={strategy.name} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            strategy.successRate >= 80 ? 'bg-green-100 text-green-600' :
                            strategy.successRate >= 60 ? 'bg-yellow-100 text-yellow-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 capitalize">{strategy.name.replace('-', ' ')}</p>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" defaultChecked />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-500">Used {strategy.used} times</p>
                            <p className="text-sm text-gray-500">•</p>
                            <p className="text-sm text-gray-500">{strategy.successful}/{strategy.used} successful</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            strategy.successRate >= 80 ? 'text-green-600' :
                            strategy.successRate >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>{strategy.successRate}%</p>
                          <p className="text-xs text-gray-500">Success Rate</p>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              strategy.successRate >= 80 ? 'bg-green-500' :
                              strategy.successRate >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${strategy.successRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Strategy Performance</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Most Effective</span>
                        <span className="text-sm font-medium text-green-600">
                          {transformedData?.topStrategies?.[0]?.name?.replace('-', ' ') || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Most Used</span>
                        <span className="text-sm font-medium text-indigo-600">
                          {(transformedData?.topStrategies || []).reduce((prev, current) => 
                            prev.used > current.used ? prev : current
                          , { name: 'N/A', used: 0 })?.name?.replace('-', ' ') || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Needs Improvement</span>
                        <span className="text-sm font-medium text-red-600">
                          {(transformedData?.topStrategies || []).find(s => s.successRate < 70)?.name?.replace('-', ' ') || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Strategy Recommendations</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Consider disabling strategies with &lt;70% success rate</li>
                      <li>• Focus on improving element-not-found detection</li>
                      <li>• Test new AI-powered selector strategies</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Healing Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">General Settings</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Enable automatic healing</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Learn from successful healings</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="ml-2 text-sm text-gray-700">Require manual approval for healing</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Thresholds</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Confidence Level
                      </label>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        defaultValue="70"
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>70%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Healing Attempts
                      </label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(e.target.value)}
                      >
                        <option value="3">3 attempts</option>
                        <option value="5">5 attempts</option>
                        <option value="10">10 attempts</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Settings className="w-4 h-4 mr-2" />
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}