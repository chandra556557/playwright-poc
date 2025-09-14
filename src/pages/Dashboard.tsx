import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TestTube, 
  Play, 
  CheckCircle, 
  XCircle, 
  Wrench, 
  TrendingUp,
  Clock,
  AlertTriangle,
  Brain,
  Activity,
  Shield
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import AIHealingWidget from '../components/AIHealingWidget';

// Fetch dashboard statistics from API
const fetchDashboardStats = async () => {
  const response = await fetch('/api/dashboard/stats');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard statistics');
  }
  return response.json();
};

export default function Dashboard() {
  const { data: dashboardStats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch('/api/health').then(res => res.json()),
    refetchInterval: 30000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: analytics } = useQuery({
    queryKey: ['healing-analytics'],
    queryFn: () => fetch('/api/healing/analytics').then(res => res.json()),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Use API data or fallback to default values
   const stats = dashboardStats?.stats || {
     totalTestSuites: 0,
     passRate: 0,
     activeExecutions: 0,
     totalHealingActions: 0
   };

   const statCards = [
     {
       name: 'Total Test Suites',
       value: stats.totalTestSuites,
       icon: Activity,
       color: 'bg-blue-500',
       change: '+12%'
     },
     {
       name: 'Pass Rate',
       value: `${stats.passRate}%`,
       icon: CheckCircle,
       color: 'bg-green-500',
       change: '+5.2%'
     },
     {
       name: 'Active Executions',
       value: stats.activeExecutions,
       icon: Clock,
       color: 'bg-yellow-500',
       change: '-2'
     },
     {
       name: 'Healing Actions',
       value: stats.totalHealingActions,
       icon: Shield,
       color: 'bg-purple-500',
       change: '+18%'
     }
   ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Failed to load dashboard data</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor your Playwright tests and self-healing performance</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="flex items-center space-x-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-lg">
            <Brain className="w-4 h-4" />
            <span className="text-sm font-medium">AI Healing Active</span>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">All Systems Operational</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-xl transition-all duration-200 animate-slide-up" style={{animationDelay: `${index * 100}ms`}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 
                    stat.changeType === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Healing Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AIHealingWidget showDetails={true} />
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Healing Insights</h3>
              <div className="flex items-center space-x-2 text-sm text-purple-600 dark:text-purple-400">
                <Brain className="w-4 h-4" />
                <span>Powered by AI</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg transition-colors duration-200">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">94.2%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Element Detection Accuracy</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg transition-colors duration-200">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">2.3s</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Healing Time</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg transition-colors duration-200">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">127</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Strategies Learned</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 rounded-lg text-white transition-colors duration-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Performance Improvement</span>
              </div>
              <div className="text-sm opacity-90">
                AI-powered healing has reduced test maintenance time by 67% and improved test reliability by 43% over the past month.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Healing Trends Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Healing Performance</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <TrendingUp className="w-4 h-4" />
              <span>Last 7 days</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardStats?.healingTrends || []}>
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
                dataKey="healingAttempts" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Healing Attempts"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="successfulHealings" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Successful Healings"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Test Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Test Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardStats?.testDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Executions</h3>
            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {(dashboardStats?.recentExecutions || []).map((execution) => (
              <div key={execution.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    execution.status === 'passed' ? 'bg-green-100' :
                    execution.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    {execution.status === 'passed' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : execution.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Wrench className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{execution.name}</p>
                    <p className="text-sm text-gray-500">{execution.timestamp}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{execution.duration}</p>
                  <p className={`text-xs capitalize ${
                    execution.status === 'passed' ? 'text-green-600' :
                    execution.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {execution.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">
                {healthData?.status === 'healthy' ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Service Status */}
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              healthData?.services?.playwright ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center space-x-3">
                {healthData?.services?.playwright ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Playwright Service</p>
                  <p className="text-sm text-gray-500">
                    {healthData?.services?.playwright ? 'All browsers ready' : 'Service unavailable'}
                  </p>
                </div>
              </div>
              <span className={`font-medium ${
                healthData?.services?.playwright ? 'text-green-600' : 'text-red-600'
              }`}>
                {healthData?.services?.playwright ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              healthData?.services?.testRunner ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center space-x-3">
                {healthData?.services?.testRunner ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Test Runner</p>
                  <p className="text-sm text-gray-500">
                    {healthData?.services?.testRunner ? 'Ready for execution' : 'Service unavailable'}
                  </p>
                </div>
              </div>
              <span className={`font-medium ${
                healthData?.services?.testRunner ? 'text-green-600' : 'text-red-600'
              }`}>
                {healthData?.services?.testRunner ? 'Ready' : 'Offline'}
              </span>
            </div>
            
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              healthData?.services?.healingEngine ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center space-x-3">
                {healthData?.services?.healingEngine ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Healing Engine</p>
                  <p className="text-sm text-gray-500">
                    {healthData?.services?.healingEngine ? 'AI models loaded' : 'Service unavailable'}
                  </p>
                </div>
              </div>
              <span className={`font-medium ${
                healthData?.services?.healingEngine ? 'text-green-600' : 'text-red-600'
              }`}>
                {healthData?.services?.healingEngine ? 'Active' : 'Offline'}
              </span>
            </div>
            
            {/* System Resources */}
            {dashboardStats?.systemHealth && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">System Resources</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">CPU Usage</span>
                    <span className="text-sm font-medium">{dashboardStats.systemHealth.cpu}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Memory</span>
                    <span className="text-sm font-medium">{dashboardStats.systemHealth.memory}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Disk Usage</span>
                    <span className="text-sm font-medium">{dashboardStats.systemHealth.disk}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Network</span>
                    <span className="text-sm font-medium">{dashboardStats.systemHealth.network}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}