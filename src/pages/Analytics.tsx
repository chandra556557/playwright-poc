import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  Activity, 
  Zap, 
  CheckCircle, 
  XCircle,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Fetch healing analytics data
  const { data: healingData, isLoading: healingLoading } = useQuery({
    queryKey: ['healing-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/healing/analytics');
      if (!response.ok) throw new Error('Failed to fetch healing analytics');
      return response.json();
    },
    refetchInterval: 30000
  });

  // Fetch execution data
  const { data: executionData, isLoading: executionLoading } = useQuery({
    queryKey: ['executions'],
    queryFn: async () => {
      const response = await fetch('/api/executions');
      if (!response.ok) throw new Error('Failed to fetch executions');
      return response.json();
    },
    refetchInterval: 30000
  });

  const isLoading = healingLoading || executionLoading;

  // Transform and combine data for analytics
  const analyticsData = React.useMemo(() => {
    if (!healingData || !executionData) return null;

    const totalExecutions = executionData.length;
    const successfulExecutions = executionData.filter(e => e.status === 'passed').length;
    const failedExecutions = executionData.filter(e => e.status === 'failed').length;
    const healedExecutions = executionData.filter(e => e.healed).length;

    return {
      summary: {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        healedExecutions,
        successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(1) : '0',
        healingRate: failedExecutions > 0 ? (healedExecutions / failedExecutions * 100).toFixed(1) : '0',
        avgExecutionTime: healingData.averageHealingTime || '0',
        activeHealingSessions: healingData.activeHealingSessions || 0
      },
      trends: Array.isArray(healingData.healingTrends) ? healingData.healingTrends : [],
      failureTypes: healingData.failureTypes || 
        (healingData.commonFailures ? 
          Object.entries(healingData.commonFailures).map(([name, value], index) => ({
            name: name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value,
            color: COLORS[index % COLORS.length]
          })) : 
          []
        ),
      strategies: Array.isArray(healingData.topStrategies) ? healingData.topStrategies : [],
      recentActivity: Array.isArray(healingData.recentActivity) ? healingData.recentActivity : []
    };
  }, [healingData, executionData]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Unable to load analytics data. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Executions</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.totalExecutions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{analyticsData.summary.successRate}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Healing Rate</p>
              <p className="text-2xl font-bold text-indigo-600">{analyticsData.summary.healingRate}%</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Zap className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Healing Time</p>
              <p className="text-2xl font-bold text-orange-600">{analyticsData.summary.avgExecutionTime}s</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px' 
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Success Rate (%)"
              />
              <Line 
                type="monotone" 
                dataKey="healingRate" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Healing Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Failure Types Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Failure Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.failureTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analyticsData.failureTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {analyticsData.failureTypes.map((type, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-gray-600">{type.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{type.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Healing Strategies Performance */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Healing Strategies Performance</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={analyticsData.strategies}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px' 
              }}
            />
            <Legend />
            <Bar dataKey="successRate" fill="#10b981" name="Success Rate (%)" />
            <Bar dataKey="used" fill="#3b82f6" name="Times Used" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {analyticsData.recentActivity.length > 0 ? (
            analyticsData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'success' ? 'bg-green-100' :
                    activity.type === 'healing' ? 'bg-blue-100' :
                    'bg-red-100'
                  }`}>
                    {activity.type === 'success' ? (
                      <CheckCircle className={`w-4 h-4 ${
                        activity.type === 'success' ? 'text-green-600' :
                        activity.type === 'healing' ? 'text-blue-600' :
                        'text-red-600'
                      }`} />
                    ) : activity.type === 'healing' ? (
                      <Zap className="w-4 h-4 text-blue-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  activity.type === 'success' ? 'bg-green-100 text-green-800' :
                  activity.type === 'healing' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {activity.type}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}