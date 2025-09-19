import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import TestSuites from './pages/TestSuites';
import TestBuilder from './pages/TestBuilder';
import Executions from './pages/Executions';
import HealingCenter from './pages/HealingCenter';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Collaboration from './pages/Collaboration';
import CodegenRecorder from './components/CodegenRecorder';
import AIHealingDashboard from './components/AIHealingDashboard';
import POMConverter from './pages/POMConverter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex overflow-x-hidden transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="flex-1 overflow-x-hidden overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/test-suites" element={<TestSuites />} />
                  <Route path="/test-builder" element={<TestBuilder />} />
                  <Route path="/test-builder/:id" element={<TestBuilder />} />
                  <Route path="/executions" element={<Executions />} />
                  <Route path="/healing" element={<HealingCenter />} />
              <Route path="/ai-healing" element={<AIHealingDashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/collaboration" element={<Collaboration />} />
              <Route path="/settings" element={<Settings />} />
                  <Route path="/codegen" element={<CodegenRecorder />} />
                  <Route path="/pom" element={<POMConverter />} />
                </Routes>
              </main>
            </div>
          </div>
          <Toaster position="top-right" />
         </Router>
       </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
