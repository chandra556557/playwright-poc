# AI Element Inspector - Enhanced JavaScript Implementation

An advanced AI-powered element inspector for Playwright with self-healing capabilities and comprehensive scenario support. This enhanced JavaScript implementation provides intelligent element detection, adaptive selector generation, and robust self-healing mechanisms for modern web applications.

## 🚀 Features

### Core Capabilities
- **AI-Powered Element Detection**: Advanced element signature analysis with machine learning similarity matching
- **Self-Healing Selectors**: Automatic adaptation to UI changes with multiple fallback strategies
- **Comprehensive Scenario Support**: 15+ specialized handlers for different UI patterns and behaviors
- **Real-time Monitoring**: WebSocket-based live monitoring and performance tracking
- **RESTful API**: Complete API for integration with external systems and CI/CD pipelines

### Enhanced Scenarios
- **Dynamic Content**: Elements that appear/disappear based on interactions or time
- **Shadow DOM**: Elements within Shadow DOM boundaries with deep traversal
- **Iframe Support**: Cross-frame element detection and healing
- **Responsive Elements**: Viewport-dependent element handling
- **Lazy Loading**: Asynchronous content loading scenarios
- **Form Validation**: State-dependent form element tracking
- **Localization**: Multi-language content scenarios
- **Theme Switching**: Dark/light theme element variations
- **Feature Flags**: A/B testing and feature flag scenarios
- **PWA States**: Progressive web app network-dependent elements
- **Animation Handling**: Elements that change during animations
- **Virtual Scrolling**: Virtualized content scenarios
- **Infinite Scroll**: Dynamic content loading through scrolling
- **Modal Dialogs**: Overlay and popup element handling
- **Tooltips**: Hover and focus-triggered elements

### Advanced Selector Strategies
- **Modern CSS Support**: Container queries, pseudo-elements, state-based selectors
- **ARIA Relationships**: Accessibility-based element identification
- **Structural Selectors**: nth-child, first/last-child, only-child patterns
- **Form-Specific**: Input types, validation states, form associations
- **Performance-Optimized**: Historical performance-based selector ranking

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-element-inspector-js

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

## 🏃‍♂️ Quick Start

### Basic Usage

```javascript
import { chromium } from 'playwright';
import { AIElementInspectorService } from './src/core/ai-element-inspector.js';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

// Initialize the service
const inspector = new AIElementInspectorService(page);

// Register an element for tracking
const element = await page.waitForSelector('#submit-button');
const registration = await inspector.registerElement('submit-btn', element);

console.log('Generated selectors:', registration.selectors);

// Use self-healing to find the element
const healedElement = await inspector.findElementWithHealing(
    'submit-btn', 
    '#submit-button'
);

if (healedElement) {
    await healedElement.click();
}

await browser.close();
```

### Server Mode

```bash
# Start the API server
npm start

# Or in development mode with auto-reload
npm run dev
```

The server will start on `http://localhost:3000` with:
- REST API endpoints at `/api/*`
- API documentation at `/api-docs`
- WebSocket server for real-time monitoring

### API Usage

```javascript
// Register an element via API
const response = await fetch('http://localhost:3000/api/elements/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        elementId: 'login-button',
        selector: '#login-btn',
        metadata: { page: 'login', importance: 'high' }
    })
});

const result = await response.json();
console.log('Registration result:', result);

// Trigger healing
const healingResponse = await fetch('http://localhost:3000/api/elements/login-button/heal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        primarySelector: '#login-btn',
        options: { maxAttempts: 5 }
    })
});

const healingResult = await healingResponse.json();
console.log('Healing result:', healingResult);
```

## 🎯 Scenario Management

### Execute Specific Scenarios

```javascript
import { ScenarioManager } from './src/scenarios/scenario-manager.js';

const scenarioManager = new ScenarioManager();
await scenarioManager.initialize();

// Execute dynamic content scenario
const result = await scenarioManager.executeScenario(
    'dynamic-content',
    page,
    'element-id',
    '#selector'
);

console.log('Scenario result:', result);
```

### Multiple Scenarios

```javascript
// Execute multiple scenarios in parallel
const results = await scenarioManager.executeMultipleScenarios(
    ['dynamic-content', 'shadow-dom', 'responsive'],
    page,
    'element-id',
    '#selector'
);

console.log('Best result:', results.bestResult);
console.log('Success rate:', results.successCount / results.totalCount);
```

### Scenario Recommendations

```javascript
// Get recommended scenarios for an element
const elementSignature = inspector.getElement('element-id');
const recommendations = scenarioManager.getRecommendedScenarios(elementSignature);

console.log('Recommended scenarios:', recommendations);
```

## 🔧 Configuration

### Service Options

```javascript
const inspector = new AIElementInspectorService(page, {
    enableMLSimilarity: true,        // Enable ML-based similarity matching
    enableShadowDOM: true,           // Enable Shadow DOM support
    enableIframeSupport: true,       // Enable iframe element detection
    enablePerformanceTracking: true, // Track performance metrics
    similarityThreshold: 0.7,        // Similarity threshold for healing
    maxHealingAttempts: 5,           // Maximum healing attempts
    cacheTimeout: 300000             // Cache timeout in milliseconds
});
```

### Scenario Configuration

```javascript
const scenarioManager = new ScenarioManager({
    enableAllScenarios: true,        // Enable all available scenarios
    defaultTimeout: 30000,           // Default scenario timeout
    maxConcurrentScenarios: 5,       // Maximum concurrent scenario executions
    enablePerformanceTracking: true  // Track scenario performance
});

// Configure specific scenarios
scenarioManager.configureScenario('dynamic-content', {
    type: 'dynamic-content',
    enabled: true,
    priority: 5,
    timeout: 30000,
    retryAttempts: 3,
    customOptions: {
        waitForStability: true,
        stabilityTimeout: 2000
    }
});
```

## 📊 Monitoring and Analytics

### Performance Metrics

```javascript
// Get healing performance report
const report = inspector.getHealingReport();
console.log('Performance report:', {
    totalElements: report.totalElements,
    successRate: report.successfulHealing / report.totalAttempts,
    averageTime: report.averageHealingTime,
    topSelectors: report.topPerformingSelectors
});

// Get scenario performance metrics
const scenarioMetrics = scenarioManager.getPerformanceMetrics();
console.log('Scenario metrics:', scenarioMetrics);
```

### Real-time Monitoring

```javascript
// WebSocket client for real-time monitoring
const socket = io('http://localhost:3000');

socket.emit('join-monitoring');

socket.on('element-activity', (data) => {
    console.log('Element activity:', data);
});

socket.on('performance-update', (metrics) => {
    console.log('Performance update:', metrics);
});
```

## 🔌 API Reference

### REST Endpoints

#### Elements
- `POST /api/elements/register` - Register element for tracking
- `GET /api/elements/{id}` - Get element information
- `POST /api/elements/{id}/heal` - Trigger healing for element
- `DELETE /api/elements/{id}` - Unregister element

#### Scenarios
- `POST /api/scenarios/dynamic-content` - Execute dynamic content scenario
- `POST /api/scenarios/shadow-dom` - Execute shadow DOM scenario
- `POST /api/scenarios/multiple` - Execute multiple scenarios

#### Health & Monitoring
- `GET /api/health/status` - Get system health status
- `GET /api/health/performance` - Get performance metrics

#### Configuration
- `GET /api/config` - Get current configuration
- `PUT /api/config` - Update configuration

### WebSocket Events

#### Client to Server
- `join-monitoring` - Join monitoring room
- `register-element` - Register element via WebSocket
- `heal-element` - Trigger element healing

#### Server to Client
- `element-registered` - Element registration confirmation
- `element-healed` - Element healing result
- `element-activity` - Real-time element activity
- `performance-update` - Performance metrics update

## 🧪 Testing

```bash
# Run basic usage examples
node examples/basic-usage.js

# Run tests (when implemented)
npm test

# Run with specific scenarios
node examples/scenario-testing.js
```

## 📁 Project Structure

```
ai-element-inspector-js/
├── src/
│   ├── core/                    # Core AI inspector components
│   │   ├── ai-element-inspector.js
│   │   ├── element-inspector.js
│   │   ├── selector-generator.js
│   │   ├── self-healing-locator.js
│   │   └── performance-monitor.js
│   ├── scenarios/               # Scenario handlers
│   │   ├── scenario-manager.js
│   │   ├── dynamic-content-handler.js
│   │   ├── shadow-dom-handler.js
│   │   ├── iframe-handler.js
│   │   └── additional-handlers.js
│   ├── api/                     # REST API routes
│   │   ├── element-routes.js
│   │   ├── scenario-routes.js
│   │   └── health-routes.js
│   ├── utils/                   # Utility modules
│   │   ├── logger.js
│   │   ├── config.js
│   │   └── database-manager.js
│   └── index.js                 # Main server entry point
├── examples/                    # Usage examples
│   ├── basic-usage.js
│   └── advanced-usage.js
├── test/                        # Test files
├── docs/                        # Documentation
├── logs/                        # Log files
└── data/                        # Database files
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆚 Comparison with Python Version

### Enhancements in JavaScript Version

| Feature | Python Version | JavaScript Version |
|---------|---------------|-------------------|
| Scenarios | 5 basic scenarios | 15+ comprehensive scenarios |
| Selector Strategies | 8 strategies | 12+ advanced strategies |
| Real-time Monitoring | ❌ | ✅ WebSocket support |
| API Server | ❌ | ✅ Full REST API |
| Shadow DOM | Basic support | Deep traversal |
| Performance Tracking | Basic metrics | Comprehensive analytics |
| ML Similarity | ❌ | ✅ Advanced algorithms |
| Configuration | Hardcoded | Dynamic configuration |
| Documentation | Basic | Comprehensive with examples |

### Migration Guide

If migrating from the Python version:

1. **Element Registration**: Similar API with enhanced options
2. **Selector Generation**: More strategies and better performance
3. **Healing Logic**: Improved with ML-based similarity
4. **Scenarios**: Expanded set with better coverage
5. **Monitoring**: New real-time capabilities

## 🔮 Roadmap

- [ ] Machine Learning model training for similarity matching
- [ ] Visual element recognition using computer vision
- [ ] Integration with popular testing frameworks (Jest, Cypress)
- [ ] Cloud-based element registry and sharing
- [ ] Advanced analytics dashboard
- [ ] Plugin system for custom scenarios
- [ ] Performance optimization with worker threads
- [ ] Docker containerization
- [ ] Kubernetes deployment support

## 📞 Support

For questions, issues, or contributions:

- Create an issue on GitHub
- Check the [API documentation](http://localhost:3000/api-docs) when running the server
- Review the [examples](./examples/) for usage patterns
- Consult the [troubleshooting guide](./docs/troubleshooting.md)

---

**Built with ❤️ for the test automation community**
