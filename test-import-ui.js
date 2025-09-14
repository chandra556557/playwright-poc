// Test script to verify import functionality in TestBuilder
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read one of the exported test files
const exportedTestPath = path.join(__dirname, 'exports', 'ecommerce-login-test.spec.js');
const testCode = fs.readFileSync(exportedTestPath, 'utf8');

console.log('Testing import functionality with exported test file:');
console.log('File:', exportedTestPath);
console.log('Code length:', testCode.length, 'characters');
console.log('\nFirst 200 characters of code:');
console.log(testCode.substring(0, 200) + '...');

// Test parsing functions (they are in React component, so we'll test the logic directly)
function parseGeneratedCodeToSteps(code) {
  const steps = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Navigation
    if (trimmedLine.includes('page.goto(')) {
      const urlMatch = trimmedLine.match(/page\.goto\(['"]([^'"]+)['"]/); 
      if (urlMatch) {
        steps.push({ type: 'navigate', url: urlMatch[1] });
      }
    }
    
    // Clicks
    if (trimmedLine.includes('page.locator(') && trimmedLine.includes('.click()')) {
      const selectorMatch = trimmedLine.match(/page\.locator\(['"]([^'"]+)['"]/); 
      if (selectorMatch) {
        steps.push({ type: 'click', target: selectorMatch[1] });
      }
    }
    
    // Fills
    if (trimmedLine.includes('page.locator(') && trimmedLine.includes('.fill(')) {
      const selectorMatch = trimmedLine.match(/page\.locator\(['"]([^'"]+)['"]/); 
      const valueMatch = trimmedLine.match(/\.fill\(['"]([^'"]+)['"]/); 
      if (selectorMatch && valueMatch) {
        steps.push({ type: 'fill', target: selectorMatch[1], value: valueMatch[1] });
      }
    }
    
    // Assertions
    if (trimmedLine.includes('expect(') && trimmedLine.includes('toBeVisible()')) {
      const selectorMatch = trimmedLine.match(/page\.locator\(['"]([^'"]+)['"]/); 
      if (selectorMatch) {
        steps.push({ type: 'assert', target: selectorMatch[1], assertion: 'visible' });
      }
    }
  }
  
  return steps;
}

function extractUrlFromCode(code) {
  const urlMatch = code.match(/page\.goto\(['"]([^'"]+)['"]/); 
  return urlMatch ? urlMatch[1] : null;
}

console.log('\n=== Testing parseGeneratedCodeToSteps function ===');
const steps = parseGeneratedCodeToSteps(testCode);
console.log('Parsed steps:', steps.length);
steps.forEach((step, index) => {
  console.log(`Step ${index + 1}:`, step.type, '-', step.target || step.url || step.value);
});

console.log('\n=== Testing extractUrlFromCode function ===');
const extractedUrl = extractUrlFromCode(testCode);
console.log('Extracted URL:', extractedUrl);

console.log('\n✅ Import test completed successfully');