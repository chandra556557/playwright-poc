import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Mock data for testing
const mockExecutions = [
  { id: 1, status: 'passed', timestamp: new Date().toISOString(), duration: 1200 },
  { id: 2, status: 'failed', timestamp: new Date().toISOString(), duration: 800 },
  { id: 3, status: 'passed', timestamp: new Date().toISOString(), duration: 1500 }
];

const mockHealingAnalytics = {
  totalHealingAttempts: 45,
  successfulHealings: 38,
  failedHealings: 7,
  averageHealingTime: 2.3,
  healingSuccessRate: 84.4
};

// API Routes
app.get('/api/executions', (req, res) => {
  res.json(mockExecutions);
});

app.get('/api/healing/analytics', (req, res) => {
  res.json(mockHealingAnalytics);
});

app.get('/api/dashboard/stats', (req, res) => {
  const totalTests = mockExecutions.length;
  const passedTests = mockExecutions.filter(e => e.status === 'passed').length;
  const failedTests = mockExecutions.filter(e => e.status === 'failed').length;
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  
  const stats = {
    totalTests,
    passedTests,
    failedTests,
    successRate: Math.round(successRate * 10) / 10,
    totalHealingAttempts: mockHealingAnalytics.totalHealingAttempts,
    successfulHealings: mockHealingAnalytics.successfulHealings,
    healingSuccessRate: mockHealingAnalytics.healingSuccessRate,
    averageTestDuration: mockExecutions.reduce((acc, e) => acc + e.duration, 0) / totalTests || 0
  };
  
  res.json(stats);
});

const PORT = process.env.PORT || 3001;

// Static files (must come after API routes)
app.use(express.static(path.join(__dirname, '../dist')));

// Simple catch-all for SPA routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Server running on port ${PORT}`);
  console.log(`📊 Dashboard API available at http://localhost:${PORT}/api/dashboard/stats`);
});

export default app;