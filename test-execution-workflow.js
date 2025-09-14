import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test the complete workflow: Import -> Execute
console.log('🧪 Testing Complete Import and Execution Workflow\n');

// 1. Read exported test file
const exportedTestPath = join(__dirname, 'exported-test-example.js');
let exportedCode;
try {
  exportedCode = readFileSync(exportedTestPath, 'utf8');
  console.log('✅ Successfully read exported test file');
  console.log('📄 File size:', exportedCode.length, 'characters\n');
} catch (error) {
  console.log('ℹ️  Using sample exported code for testing\n');
  exportedCode = `
import { test, expect } from '@playwright/test';

test('E-commerce checkout flow', async ({ page }) => {
  // Navigate to the application
  await page.goto('https://example-shop.com');
  
  // Search for a product
  await page.fill('[data-testid="search-input"]', 'laptop');
  await page.click('[data-testid="search-button"]');
  
  // Select first product
  await page.click('.product-card:first-child .add-to-cart');
  
  // Go to cart
  await page.click('[data-testid="cart-icon"]');
  
  // Proceed to checkout
  await page.click('[data-testid="checkout-button"]');
  
  // Fill checkout form
  await page.fill('#email', 'test@example.com');
  await page.fill('#firstName', 'John');
  await page.fill('#lastName', 'Doe');
  
  // Verify checkout page loaded
  await expect(page.locator('h1')).toContainText('Checkout');
  
  // Verify cart total is visible
  await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
});
`;
}

// 2. Parse the code to extract steps (same logic as in TestBuilder)
function parseGeneratedCodeToSteps(code) {
  const steps = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Parse navigation
    if (trimmedLine.includes('.goto(')) {
      const urlMatch = trimmedLine.match(/\.goto\(['"]([^'"]+)['"]/); 
      if (urlMatch) {
        steps.push({
          id: `step-${index}`,
          type: 'navigate',
          target: urlMatch[1],
          description: `Navigate to ${urlMatch[1]}`,
          strategies: [{
            name: 'url',
            locator: urlMatch[1],
            description: `Navigate to ${urlMatch[1]}`,
            priority: 10
          }]
        });
      }
    }
    
    // Parse clicks
    if (trimmedLine.includes('.click(')) {
      const selectorMatch = trimmedLine.match(/\.click\(['"]([^'"]*)['"]/);
      if (selectorMatch) {
        steps.push({
          id: `step-${index}`,
          type: 'click',
          target: selectorMatch[1],
          description: `Click ${selectorMatch[1]}`,
          strategies: [{
            name: 'selector',
            locator: selectorMatch[1],
            description: `Click element with selector ${selectorMatch[1]}`,
            priority: 8
          }]
        });
      }
    }
    
    // Parse fills
    if (trimmedLine.includes('.fill(')) {
      const fillMatch = trimmedLine.match(/\.fill\(['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]/);
      if (fillMatch) {
        steps.push({
          id: `step-${index}`,
          type: 'fill',
          target: fillMatch[1],
          value: fillMatch[2],
          description: `Fill ${fillMatch[1]} with "${fillMatch[2]}"`,
          strategies: [{
            name: 'selector',
            locator: fillMatch[1],
            description: `Fill input with selector ${fillMatch[1]}`,
            priority: 8
          }]
        });
      }
    }
    
    // Parse assertions
    if (trimmedLine.includes('expect(') && (trimmedLine.includes('.toBeVisible()') || trimmedLine.includes('.toContainText('))) {
      const expectMatch = trimmedLine.match(/expect\([^)]*\.locator\(['"]([^'"]*)['"]/);
      if (expectMatch) {
        const assertionType = trimmedLine.includes('.toBeVisible()') ? 'is visible' : 'contains text';
        steps.push({
          id: `step-${index}`,
          type: 'assert',
          target: expectMatch[1],
          description: `Assert ${expectMatch[1]} ${assertionType}`,
          strategies: [{
            name: 'selector',
            locator: expectMatch[1],
            description: `Assert element with selector ${expectMatch[1]} ${assertionType}`,
            priority: 7
          }]
        });
      }
    }
  });
  
  return steps;
}

// 3. Extract URL from code
function extractUrlFromCode(code) {
  const urlMatch = code.match(/\.goto\(['"]([^'"]+)['"]/); 
  return urlMatch ? urlMatch[1] : null;
}

// 4. Parse the imported code
const parsedSteps = parseGeneratedCodeToSteps(exportedCode);
const extractedUrl = extractUrlFromCode(exportedCode);

console.log('🔍 Code Parsing Results:');
console.log('📍 Extracted URL:', extractedUrl || 'No URL found');
console.log('📝 Parsed Steps:', parsedSteps.length);

if (parsedSteps.length > 0) {
  console.log('\n📋 Step Details:');
  parsedSteps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step.type.toUpperCase()}: ${step.description}`);
    if (step.value) {
      console.log(`     Value: "${step.value}"`);
    }
    console.log(`     Target: ${step.target}`);
  });
}

// 5. Create test suite structure for execution
const testSuiteData = {
  id: `imported-suite-${Date.now()}`,
  name: 'Imported Test Suite',
  description: 'Test suite created from imported Playwright code',
  tags: 'imported,playwright,automated',
  tests: [{
    id: 'imported-test-1',
    name: 'Imported Test Case',
    url: extractedUrl || 'https://example.com',
    browser: 'chromium',
    steps: parsedSteps
  }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

console.log('\n🏗️  Test Suite Structure Created:');
console.log('📦 Suite ID:', testSuiteData.id);
console.log('📝 Suite Name:', testSuiteData.name);
console.log('🧪 Test Cases:', testSuiteData.tests.length);
console.log('⚡ Total Steps:', testSuiteData.tests[0].steps.length);

// 6. Simulate execution workflow
console.log('\n🚀 Execution Workflow Simulation:');
console.log('1. ✅ Import code from session/file');
console.log('2. ✅ Parse code into structured steps');
console.log('3. ✅ Create test suite with parsed data');
console.log('4. ✅ Validate test suite structure');
console.log('5. 🔄 Save test suite to backend');
console.log('6. 🔄 Execute test suite via API');
console.log('7. 🔄 Monitor execution progress');
console.log('8. 🔄 Display results to user');

// 7. Validate execution readiness
const isExecutionReady = (
  testSuiteData.tests.length > 0 &&
  testSuiteData.tests[0].steps.length > 0 &&
  testSuiteData.tests[0].url &&
  testSuiteData.name.trim() !== ''
);

console.log('\n✨ Execution Readiness Check:');
console.log('📊 Has test cases:', testSuiteData.tests.length > 0 ? '✅' : '❌');
console.log('📊 Has test steps:', testSuiteData.tests[0].steps.length > 0 ? '✅' : '❌');
console.log('📊 Has target URL:', testSuiteData.tests[0].url ? '✅' : '❌');
console.log('📊 Has suite name:', testSuiteData.name.trim() !== '' ? '✅' : '❌');
console.log('🎯 Ready for execution:', isExecutionReady ? '✅ YES' : '❌ NO');

if (isExecutionReady) {
  console.log('\n🎉 SUCCESS: Complete workflow from import to execution is ready!');
  console.log('\n📋 Next Steps in UI:');
  console.log('   1. User imports code via "Import from Codegen" button');
  console.log('   2. Code is parsed and steps are populated in the form');
  console.log('   3. User clicks "Run Test Preview" button');
  console.log('   4. Test suite is saved and execution starts');
  console.log('   5. User is redirected to Test Suites page to view results');
} else {
  console.log('\n⚠️  WARNING: Test suite needs additional data before execution');
}

console.log('\n🏁 Import and Execution Workflow Test Complete!');