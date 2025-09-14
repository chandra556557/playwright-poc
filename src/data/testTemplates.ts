export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'e-commerce' | 'authentication' | 'forms' | 'navigation' | 'api';
  icon: string;
  steps: TemplateStep[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface TemplateStep {
  id: string;
  action: string;
  selector: string;
  value?: string;
  description: string;
  waitFor?: string;
  assertions?: string[];
}

export const testTemplates: TestTemplate[] = [
  {
    id: 'ecommerce-product-purchase',
    name: 'Product Purchase Flow',
    description: 'Complete e-commerce purchase journey from product search to checkout',
    category: 'e-commerce',
    icon: '🛒',
    difficulty: 'intermediate',
    tags: ['shopping', 'checkout', 'payment'],
    steps: [
      {
        id: '1',
        action: 'navigate',
        selector: '',
        value: 'https://example-store.com',
        description: 'Navigate to the e-commerce website',
      },
      {
        id: '2',
        action: 'click',
        selector: '[data-testid="search-input"]',
        description: 'Click on search input field',
      },
      {
        id: '3',
        action: 'type',
        selector: '[data-testid="search-input"]',
        value: 'laptop',
        description: 'Search for a product',
      },
      {
        id: '4',
        action: 'click',
        selector: '[data-testid="search-button"]',
        description: 'Click search button',
        waitFor: '[data-testid="product-list"]',
      },
      {
        id: '5',
        action: 'click',
        selector: '[data-testid="product-item"]:first-child',
        description: 'Click on first product in results',
        waitFor: '[data-testid="product-details"]',
      },
      {
        id: '6',
        action: 'click',
        selector: '[data-testid="add-to-cart"]',
        description: 'Add product to cart',
        assertions: ['Cart count should increase'],
      },
      {
        id: '7',
        action: 'click',
        selector: '[data-testid="cart-icon"]',
        description: 'Open shopping cart',
        waitFor: '[data-testid="cart-items"]',
      },
      {
        id: '8',
        action: 'click',
        selector: '[data-testid="checkout-button"]',
        description: 'Proceed to checkout',
        waitFor: '[data-testid="checkout-form"]',
      },
    ],
  },
  {
    id: 'user-login-flow',
    name: 'User Login & Authentication',
    description: 'Test user login with valid and invalid credentials',
    category: 'authentication',
    icon: '🔐',
    difficulty: 'beginner',
    tags: ['login', 'authentication', 'security'],
    steps: [
      {
        id: '1',
        action: 'navigate',
        selector: '',
        value: 'https://example.com/login',
        description: 'Navigate to login page',
      },
      {
        id: '2',
        action: 'type',
        selector: '[data-testid="email-input"]',
        value: 'user@example.com',
        description: 'Enter email address',
      },
      {
        id: '3',
        action: 'type',
        selector: '[data-testid="password-input"]',
        value: 'password123',
        description: 'Enter password',
      },
      {
        id: '4',
        action: 'click',
        selector: '[data-testid="login-button"]',
        description: 'Click login button',
        waitFor: '[data-testid="dashboard"]',
        assertions: ['User should be redirected to dashboard'],
      },
    ],
  },
  {
    id: 'contact-form-submission',
    name: 'Contact Form Submission',
    description: 'Fill and submit a contact form with validation',
    category: 'forms',
    icon: '📝',
    difficulty: 'beginner',
    tags: ['form', 'validation', 'contact'],
    steps: [
      {
        id: '1',
        action: 'navigate',
        selector: '',
        value: 'https://example.com/contact',
        description: 'Navigate to contact page',
      },
      {
        id: '2',
        action: 'type',
        selector: '[name="name"]',
        value: 'John Doe',
        description: 'Enter full name',
      },
      {
        id: '3',
        action: 'type',
        selector: '[name="email"]',
        value: 'john@example.com',
        description: 'Enter email address',
      },
      {
        id: '4',
        action: 'select',
        selector: '[name="subject"]',
        value: 'General Inquiry',
        description: 'Select inquiry type',
      },
      {
        id: '5',
        action: 'type',
        selector: '[name="message"]',
        value: 'This is a test message for the contact form.',
        description: 'Enter message content',
      },
      {
        id: '6',
        action: 'click',
        selector: '[type="submit"]',
        description: 'Submit the form',
        waitFor: '[data-testid="success-message"]',
        assertions: ['Success message should be displayed'],
      },
    ],
  },
  {
    id: 'navigation-menu-test',
    name: 'Navigation Menu Testing',
    description: 'Test website navigation and menu functionality',
    category: 'navigation',
    icon: '🧭',
    difficulty: 'beginner',
    tags: ['navigation', 'menu', 'ui'],
    steps: [
      {
        id: '1',
        action: 'navigate',
        selector: '',
        value: 'https://example.com',
        description: 'Navigate to homepage',
      },
      {
        id: '2',
        action: 'click',
        selector: '[data-testid="menu-toggle"]',
        description: 'Open mobile menu (if applicable)',
      },
      {
        id: '3',
        action: 'click',
        selector: '[href="/about"]',
        description: 'Navigate to About page',
        waitFor: 'h1:has-text("About")',
      },
      {
        id: '4',
        action: 'click',
        selector: '[href="/services"]',
        description: 'Navigate to Services page',
        waitFor: 'h1:has-text("Services")',
      },
      {
        id: '5',
        action: 'click',
        selector: '[href="/contact"]',
        description: 'Navigate to Contact page',
        waitFor: 'h1:has-text("Contact")',
        assertions: ['All navigation links should work correctly'],
      },
    ],
  },
  {
    id: 'api-integration-test',
    name: 'API Integration Testing',
    description: 'Test API endpoints and data loading',
    category: 'api',
    icon: '🔌',
    difficulty: 'advanced',
    tags: ['api', 'integration', 'data'],
    steps: [
      {
        id: '1',
        action: 'navigate',
        selector: '',
        value: 'https://example.com/dashboard',
        description: 'Navigate to dashboard',
      },
      {
        id: '2',
        action: 'wait',
        selector: '[data-testid="loading-spinner"]',
        description: 'Wait for initial data load',
      },
      {
        id: '3',
        action: 'click',
        selector: '[data-testid="refresh-button"]',
        description: 'Trigger data refresh',
        waitFor: '[data-testid="data-table"]',
      },
      {
        id: '4',
        action: 'assert',
        selector: '[data-testid="data-row"]',
        description: 'Verify data is loaded',
        assertions: ['Data rows should be visible', 'No error messages should appear'],
      },
    ],
  },
];

export const getTemplatesByCategory = (category: string) => {
  return testTemplates.filter(template => template.category === category);
};

export const getTemplateById = (id: string) => {
  return testTemplates.find(template => template.id === id);
};

export const getTemplateCategories = () => {
  return Array.from(new Set(testTemplates.map(template => template.category)));
};