import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Playwright Testing Suite API',
      version: '1.0.0',
      description: 'Comprehensive API for Playwright testing with self-healing capabilities, code generation, and test management',
      contact: {
        name: 'Playwright Testing Suite',
        email: 'support@playwright-suite.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.playwright-suite.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        TestSuite: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the test suite'
            },
            name: {
              type: 'string',
              description: 'Name of the test suite'
            },
            description: {
              type: 'string',
              description: 'Description of the test suite'
            },
            tests: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Test'
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'archived'],
              description: 'Status of the test suite'
            }
          }
        },
        Test: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            steps: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/TestStep'
              }
            },
            expectedResult: {
              type: 'string'
            }
          }
        },
        TestStep: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['click', 'fill', 'select', 'navigate', 'wait', 'assert']
            },
            selector: {
              type: 'string'
            },
            value: {
              type: 'string'
            },
            timeout: {
              type: 'integer',
              default: 30000
            }
          }
        },
        TestExecution: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            testSuiteId: {
              type: 'string',
              format: 'uuid'
            },
            status: {
              type: 'string',
              enum: ['running', 'passed', 'failed', 'cancelled']
            },
            startTime: {
              type: 'string',
              format: 'date-time'
            },
            endTime: {
              type: 'string',
              format: 'date-time'
            },
            duration: {
              type: 'integer',
              description: 'Duration in milliseconds'
            },
            results: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/TestResult'
              }
            }
          }
        },
        TestResult: {
          type: 'object',
          properties: {
            testId: {
              type: 'string',
              format: 'uuid'
            },
            status: {
              type: 'string',
              enum: ['passed', 'failed', 'skipped']
            },
            error: {
              type: 'string'
            },
            screenshot: {
              type: 'string',
              format: 'uri'
            },
            video: {
              type: 'string',
              format: 'uri'
            }
          }
        },
        HealingSuggestion: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            testId: {
              type: 'string',
              format: 'uuid'
            },
            strategy: {
              type: 'string',
              enum: ['selector_update', 'wait_adjustment', 'element_recovery', 'page_reload']
            },
            description: {
              type: 'string'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1
            },
            applied: {
              type: 'boolean',
              default: false
            }
          }
        },
        BrowserInfo: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              enum: ['chromium', 'firefox', 'webkit']
            },
            version: {
              type: 'string'
            },
            installed: {
              type: 'boolean'
            },
            path: {
              type: 'string'
            }
          }
        },
        PageInspection: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              format: 'uri'
            },
            title: {
              type: 'string'
            },
            elements: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ElementInfo'
              }
            },
            screenshots: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri'
              }
            }
          }
        },
        ElementInfo: {
          type: 'object',
          properties: {
            selector: {
              type: 'string'
            },
            tagName: {
              type: 'string'
            },
            text: {
              type: 'string'
            },
            attributes: {
              type: 'object',
              additionalProperties: {
                type: 'string'
              }
            },
            boundingBox: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Test Suites',
        description: 'Manage test suites and test cases'
      },
      {
        name: 'Test Execution',
        description: 'Execute tests and manage test runs'
      },
      {
        name: 'Self-Healing',
        description: 'AI-powered test healing and recovery'
      },
      {
        name: 'Code Generation',
        description: 'Generate test code from user interactions'
      },
      {
        name: 'Browser Management',
        description: 'Manage browser instances and configurations'
      },
      {
        name: 'Page Inspection',
        description: 'Inspect web pages and extract element information'
      },
      {
        name: 'Health & Monitoring',
        description: 'System health and monitoring endpoints'
      }
    ]
  },
  apis: ['./server/routes/*.js', './server/index.js']
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
