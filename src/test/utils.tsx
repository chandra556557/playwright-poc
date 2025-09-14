import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { vi } from 'vitest';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock API responses
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

// Mock WebSocket
export const createMockWebSocket = () => {
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };

  return mockWs;
};

// Mock fetch responses
export const mockFetch = (response: any, ok = true, status = 200) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Mock test data
export const mockTestSuite = {
  id: 'test-suite-1',
  name: 'Sample Test Suite',
  description: 'A sample test suite for testing',
  tests: [
    {
      id: 'test-1',
      name: 'Login Test',
      steps: [
        { action: 'navigate', target: 'https://example.com/login' },
        { action: 'fill', target: '#username', value: 'testuser' },
        { action: 'fill', target: '#password', value: 'password' },
        { action: 'click', target: '#login-button' },
      ],
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockCodegenSession = {
  id: 'session-1',
  name: 'Test Recording Session',
  status: 'recording',
  language: 'javascript',
  framework: 'playwright',
  browser: 'chromium',
  actions: [
    {
      type: 'navigate',
      url: 'https://example.com',
      timestamp: Date.now(),
    },
    {
      type: 'click',
      selector: '#button',
      timestamp: Date.now() + 1000,
    },
  ],
  generatedCode: 'test code here',
  createdAt: new Date().toISOString(),
};

export const mockHealingStats = {
  totalAttempts: 100,
  successfulHealing: 85,
  failedHealing: 15,
  averageHealingTime: 250,
  strategiesUsed: {
    'text-fuzzy-match': 30,
    'attribute-relaxation': 25,
    'semantic-text': 20,
    'role-accessible-name': 10,
  },
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };