import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import { mockFetch, mockApiResponse } from '../../test/utils';

// Mock the AIHealingWidget component
vi.mock('../../components/AIHealingWidget', () => ({
  default: () => <div data-testid="ai-healing-widget">AI Healing Widget</div>
}));

// Mock recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />
}));

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockDashboardStats = {
  stats: {
    totalTestSuites: 25,
    passRate: 87.5,
    activeExecutions: 3,
    totalHealingActions: 142
  },
  testDistribution: [
    { name: 'Passed', value: 35 },
    { name: 'Failed', value: 5 },
    { name: 'Skipped', value: 2 }
  ],
  healingTrends: [
    { date: '2024-01-01', healed: 12, failed: 2 },
    { date: '2024-01-02', healed: 15, failed: 1 },
    { date: '2024-01-03', healed: 18, failed: 3 }
  ]
};

const mockHealthData = {
  status: 'healthy',
  services: {
    database: 'up',
    redis: 'up',
    playwright: 'up'
  }
};

const mockAnalytics = {
  totalAttempts: 100,
  successfulHealing: 85,
  failedHealing: 15,
  averageHealingTime: 250,
  strategiesUsed: {
    'text-fuzzy-match': 30,
    'attribute-relaxation': 25,
    'semantic-text': 20,
    'role-accessible-name': 10
  }
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock responses
    global.fetch.mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDashboardStats)
        });
      }
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHealthData)
        });
      }
      if (url.includes('/api/healing/analytics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAnalytics)
        });
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the dashboard title and description', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Monitor your Playwright tests and self-healing performance')).toBeInTheDocument();
    });

    it('displays AI Healing Active status', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText('AI Healing Active')).toBeInTheDocument();
      expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
    });

    it('renders the AI Healing Widget', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-healing-widget')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton while fetching data', async () => {
      // Mock delayed response
      global.fetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockDashboardStats)
        }), 100))
      );

      render(<Dashboard />, { wrapper: createWrapper() });
      
      // Should show loading state initially
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Total Test Suites')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Statistics Cards', () => {
    it('displays all stat cards with correct data', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByText('Total Test Suites')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
        
        expect(screen.getByText('Pass Rate')).toBeInTheDocument();
        expect(screen.getByText('87.5%')).toBeInTheDocument();
        
        expect(screen.getByText('Active Executions')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        
        expect(screen.getByText('Healing Actions')).toBeInTheDocument();
        expect(screen.getByText('142')).toBeInTheDocument();
      });
    });

    it('shows change indicators for each stat', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByText('+12%')).toBeInTheDocument();
        expect(screen.getByText('+5.2%')).toBeInTheDocument();
        expect(screen.getByText('-2')).toBeInTheDocument();
        expect(screen.getByText('+18%')).toBeInTheDocument();
      });
    });

    it('displays default values when API data is unavailable', async () => {
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        })
      );

      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByText('Total Test Suites')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });
  });

  describe('Charts and Visualizations', () => {
    it('renders healing trends chart', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('renders test distribution bar chart', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('displays chart titles and descriptions', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByText(/Healing Trends/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Distribution/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('fetches dashboard stats on mount', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/dashboard/stats');
      });
    });

    it('fetches health data on mount', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/health');
      });
    });

    it('fetches healing analytics on mount', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/healing/analytics');
      });
    });

    it('refetches data at regular intervals', async () => {
      vi.useFakeTimers();
      
      render(<Dashboard />, { wrapper: createWrapper() });
      
      // Initial fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/dashboard/stats');
      });

      const initialCallCount = (global.fetch as any).mock.calls.length;
      
      // Fast forward 30 seconds
      vi.advanceTimersByTime(30000);
      
      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
      
      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      global.fetch.mockImplementation(() => 
        Promise.reject(new Error('Network error'))
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Dashboard />, { wrapper: createWrapper() });
      
      // Component should still render with default values
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Total Test Suites')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('displays error state when dashboard stats fail to load', async () => {
      global.fetch.mockImplementation((url: string) => {
        if (url.includes('/api/dashboard/stats')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Internal server error' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<Dashboard />, { wrapper: createWrapper() });
      
      // Should still render the dashboard structure
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Performance Metrics', () => {
    it('displays performance improvement metrics', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByText(/Performance Improvement/i)).toBeInTheDocument();
        expect(screen.getByText(/reduced test maintenance time by 67%/i)).toBeInTheDocument();
        expect(screen.getByText(/improved test reliability by 43%/i)).toBeInTheDocument();
      });
    });

    it('shows strategies learned count', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByText('127')).toBeInTheDocument();
        expect(screen.getByText('Strategies Learned')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders grid layout for statistics cards', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      const gridContainer = screen.getByText('Total Test Suites').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });

    it('renders responsive chart containers', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Dashboard');
    });

    it('provides descriptive text for metrics', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(screen.getByText('Monitor your Playwright tests and self-healing performance')).toBeInTheDocument();
      });
    });
  });
});