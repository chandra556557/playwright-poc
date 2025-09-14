import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  TrendingUp,
  Target,
  Zap,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface HealingMetrics {
  totalHealingAttempts: number;
  successfulHealings: number;
  healingSuccessRate: number;
  averageHealingTime: number;
  activeHealingSessions: number;
  recentActivity: Array<{
    date: string;
    healingAttempts: number;
    successfulHealings: number;
    newStrategiesLearned: number;
  }>;
}

interface AIHealingWidgetProps {
  compact?: boolean;
  showDetails?: boolean;
}

const AIHealingWidget: React.FC<AIHealingWidgetProps> = ({ 
  compact = false, 
  showDetails = true 
}) => {
  const { data: metrics, isLoading } = useQuery<HealingMetrics>({
    queryKey: ['healing-metrics'],
    queryFn: () => fetch('/api/healing/analytics').then(res => res.json()),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${compact ? 'space-y-2' : 'space-y-4'}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">AI healing data unavailable</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span className="font-medium">AI Healing</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{formatPercentage(metrics.healingSuccessRate || 0)}</div>
            <div className="text-xs opacity-90">Success Rate</div>
          </div>
        </div>
        
        {(metrics.activeHealingSessions || 0) > 0 && (
          <div className="mt-2 flex items-center space-x-1 text-sm">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>{metrics.activeHealingSessions || 0} active sessions</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Healing Status</h3>
          <p className="text-sm text-gray-600">Real-time healing analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-2xl font-bold text-green-600">
              {formatPercentage(metrics.healingSuccessRate || 0)}
            </span>
          </div>
          <p className="text-sm text-gray-600">Success Rate</p>
        </div>

        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">
              {formatTime(metrics.averageHealingTime || 0)}
            </span>
          </div>
          <p className="text-sm text-gray-600">Avg Time</p>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Attempts</span>
            <span className="font-medium">{(metrics.totalHealingAttempts || 0).toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Successful Healings</span>
            <span className="font-medium text-green-600">{(metrics.successfulHealings || 0).toLocaleString()}</span>
          </div>
          
          {(metrics.activeHealingSessions || 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3 text-purple-500 animate-pulse" />
                <span className="text-gray-600">Active Sessions</span>
              </div>
              <span className="font-medium text-purple-600">{metrics.activeHealingSessions || 0}</span>
            </div>
          )}
          
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Recent Activity</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-gray-900">
                  {Array.isArray(metrics.recentActivity) 
                    ? metrics.recentActivity.reduce((sum, day) => sum + day.healingAttempts, 0)
                    : 0
                  }
                </div>
                <div className="text-gray-500">Attempts</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">
                  {Array.isArray(metrics.recentActivity) 
                    ? metrics.recentActivity.reduce((sum, day) => sum + day.successfulHealings, 0)
                    : 0
                  }
                </div>
                <div className="text-gray-500">Successful</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-purple-600">
                  {Array.isArray(metrics.recentActivity) 
                    ? metrics.recentActivity.reduce((sum, day) => sum + day.newStrategiesLearned, 0)
                    : 0
                  }
                </div>
                <div className="text-gray-500">Learned</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {metrics.healingSuccessRate > 0.8 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Excellent healing performance! AI is learning effectively.
            </span>
          </div>
        </div>
      )}

      {metrics.activeHealingSessions > 5 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              High healing activity detected. Consider reviewing test stability.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIHealingWidget;