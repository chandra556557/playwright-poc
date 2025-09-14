import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  Eye,
  TrendingUp,
  Zap,
  Target,
  Activity,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  Cpu,
  Globe,
  Shield,
  RefreshCw
} from 'lucide-react';

interface HealingAnalytics {
  totalHealingAttempts: number;
  successfulHealings: number;
  healingSuccessRate: number;
  averageHealingTime: number;
  topStrategies: Array<{
    strategy: string;
    successRate: number;
    usage: number;
  }>;
  failureTypes: Record<string, number>;
  recentActivity: Array<{
    date: string;
    healingAttempts: number;
    successfulHealings: number;
    newStrategiesLearned: number;
  }>;
  aiEnhancements: {
    elementDetection: {
      accuracy: number;
      elementsDetected: number;
      confidenceScore: number;
    };
    visualRegression: {
      imagesAnalyzed: number;
      differencesDetected: number;
      healingSuggestions: number;
    };
    autoLearning: {
      modelsRetrained: number;
      strategiesOptimized: number;
      performanceImprovement: number;
    };
    crossBrowser: {
      browsersSupported: number;
      compatibilityScore: number;
      browserSpecificFixes: number;
    };
    confidenceScoring: {
      averageConfidence: number;
      highConfidencePredictions: number;
      accuracyRate: number;
    };
  };
  enhancedMetrics: {
    aiPoweredSuggestions: number;
    traditionalSuggestions: number;
    aiSuccessRate: number;
    traditionalSuccessRate: number;
    efficiencyImprovement: number;
    timeReduction: number;
  };
}

const AIHealingDashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading, refetch } = useQuery<HealingAnalytics>({
    queryKey: ['healing-analytics', selectedTimeRange],
    queryFn: () => fetch('/api/healing/analytics').then(res => res.json()),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-500">AI healing analytics will appear here once tests are run.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Healing Dashboard</h1>
            <p className="text-gray-600 mt-1">Advanced AI-powered test healing analytics and insights</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'ai-services', label: 'AI Services', icon: Cpu },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'insights', label: 'Insights', icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Healing Success Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatPercentage(analytics.healingSuccessRate)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">+{analytics.enhancedMetrics?.efficiencyImprovement || 0}% vs traditional</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Healings</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatNumber(analytics.totalHealingAttempts)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">{formatNumber(analytics.successfulHealings)} successful</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Healing Time</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatTime(analytics.averageHealingTime)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600">-{analytics.enhancedMetrics?.timeReduction || 0}% faster</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Confidence</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatPercentage(analytics.aiEnhancements?.confidenceScoring?.averageConfidence || 0)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">{formatNumber(analytics.aiEnhancements?.confidenceScoring?.highConfidencePredictions || 0)} high confidence</span>
              </div>
            </div>
          </div>

          {/* Recent Activity Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Healing Activity</h3>
            <div className="space-y-4">
              {Array.isArray(analytics.recentActivity) && analytics.recentActivity.length > 0 ? (
                analytics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(activity.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <span>{activity.healingAttempts} attempts</span>
                        <span>{activity.successfulHealings} successful</span>
                        <span>{activity.newStrategiesLearned} strategies learned</span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      {formatPercentage(activity.healingAttempts > 0 ? activity.successfulHealings / activity.healingAttempts : 0)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent healing activity data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Services Tab */}
      {activeTab === 'ai-services' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Element Detection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">AI Element Detection</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Detection Accuracy</span>
                <span className="text-sm font-medium text-blue-600">
                  {formatPercentage(analytics.aiEnhancements?.elementDetection?.accuracy || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Elements Detected</span>
                <span className="text-sm font-medium">
                  {formatNumber(analytics.aiEnhancements?.elementDetection?.elementsDetected || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Confidence Score</span>
                <span className="text-sm font-medium text-green-600">
                  {formatPercentage(analytics.aiEnhancements?.elementDetection?.confidenceScore || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Regression Healing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <PieChart className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Visual Regression</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Images Analyzed</span>
                <span className="text-sm font-medium">
                  {formatNumber(analytics.aiEnhancements?.visualRegression?.imagesAnalyzed || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Differences Detected</span>
                <span className="text-sm font-medium text-orange-600">
                  {formatNumber(analytics.aiEnhancements?.visualRegression?.differencesDetected || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Healing Suggestions</span>
                <span className="text-sm font-medium text-purple-600">
                  {formatNumber(analytics.aiEnhancements?.visualRegression?.healingSuggestions || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Auto Learning Engine */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Auto Learning</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Models Retrained</span>
                <span className="text-sm font-medium">
                  {formatNumber(analytics.aiEnhancements?.autoLearning?.modelsRetrained || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Strategies Optimized</span>
                <span className="text-sm font-medium text-blue-600">
                  {formatNumber(analytics.aiEnhancements?.autoLearning?.strategiesOptimized || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Performance Improvement</span>
                <span className="text-sm font-medium text-green-600">
                  +{formatPercentage(analytics.aiEnhancements?.autoLearning?.performanceImprovement || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Cross Browser Healing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Globe className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cross Browser</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Browsers Supported</span>
                <span className="text-sm font-medium">
                  {analytics.aiEnhancements?.crossBrowser?.browsersSupported || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Compatibility Score</span>
                <span className="text-sm font-medium text-green-600">
                  {formatPercentage(analytics.aiEnhancements?.crossBrowser?.compatibilityScore || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Browser-Specific Fixes</span>
                <span className="text-sm font-medium text-purple-600">
                  {formatNumber(analytics.aiEnhancements?.crossBrowser?.browserSpecificFixes || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* AI vs Traditional Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">AI vs Traditional Healing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Zap className="w-4 h-4 text-purple-500 mr-2" />
                  AI-Powered Healing
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Suggestions Generated</span>
                    <span className="text-sm font-medium text-purple-600">
                      {formatNumber(analytics.enhancedMetrics?.aiPoweredSuggestions || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatPercentage(analytics.enhancedMetrics?.aiSuccessRate || 0)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Shield className="w-4 h-4 text-gray-500 mr-2" />
                  Traditional Healing
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Suggestions Generated</span>
                    <span className="text-sm font-medium text-gray-600">
                      {formatNumber(analytics.enhancedMetrics?.traditionalSuggestions || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-medium text-orange-600">
                      {formatPercentage(analytics.enhancedMetrics?.traditionalSuccessRate || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Strategies */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Healing Strategies</h3>
            <div className="space-y-4">
              {(analytics.topStrategies || []).map((strategy, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{strategy.strategy}</p>
                      <p className="text-sm text-gray-600">{formatNumber(strategy.usage)} uses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatPercentage(strategy.successRate)}</p>
                    <p className="text-sm text-gray-600">success rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-xl font-semibold">AI Insights & Recommendations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Performance Highlights</h4>
                <ul className="space-y-1 text-sm opacity-90">
                  <li>• AI healing is {analytics.enhancedMetrics?.efficiencyImprovement || 0}% more efficient</li>
                <li>• Average healing time reduced by {analytics.enhancedMetrics?.timeReduction || 0}%</li>
                <li>• {formatNumber(analytics.aiEnhancements?.confidenceScoring?.highConfidencePredictions || 0)} high-confidence predictions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recommendations</h4>
                <ul className="space-y-1 text-sm opacity-90">
                  <li>• Enable visual regression for better accuracy</li>
                  <li>• Increase auto-learning frequency for faster adaptation</li>
                  <li>• Consider cross-browser optimization for edge cases</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Failure Types Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Failure Types Distribution</h3>
            <div className="space-y-4">
              {Object.entries(analytics.failureTypes || {}).map(([type, count]) => {
                const percentage = (count / Object.values(analytics.failureTypes || {}).reduce((a, b) => a + b, 0)) * 100;
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {type.replace('-', ' ')}
                      </span>
                      <span className="text-sm text-gray-600">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIHealingDashboard;