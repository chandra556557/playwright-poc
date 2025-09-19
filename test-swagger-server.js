import express from 'express';
import { specs, swaggerUi } from './server/swagger.js';

const app = express();
const PORT = 3002;

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Playwright Testing Suite API Documentation'
}));

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Test Swagger server running on port ${PORT}`);
  console.log(`📚 Swagger UI available at: http://localhost:${PORT}/api-docs`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});
