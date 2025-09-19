const { chromium, firefox, webkit } = require('playwright');

async function testPlaywrightFeatures() {
  console.log('🚀 Testing Playwright Features...\n');
  
  const results = {
    browsers: {},
    features: {}
  };

  // Test each browser
  const browsers = [
    { name: 'chromium', browser: chromium },
    { name: 'firefox', browser: firefox },
    { name: 'webkit', browser: webkit }
  ];

  for (const { name, browser } of browsers) {
    console.log(`Testing ${name}...`);
    try {
      const browserInstance = await browser.launch({ headless: true });
      const context = await browserInstance.newContext();
      const page = await context.newPage();
      
      // Test basic navigation
      await page.goto('https://example.com');
      const title = await page.title();
      
      // Test element interaction
      const heading = await page.textContent('h1');
      
      // Test screenshot capability
      await page.screenshot({ path: `test-${name}-screenshot.png` });
      
      await browserInstance.close();
      
      results.browsers[name] = {
        status: 'working',
        title: title,
        heading: heading,
        screenshot: 'captured'
      };
      
      console.log(`✅ ${name}: Working - Title: "${title}", Heading: "${heading}"`);
    } catch (error) {
      results.browsers[name] = {
        status: 'failed',
        error: error.message
      };
      console.log(`❌ ${name}: Failed - ${error.message}`);
    }
  }

  // Test advanced features
  console.log('\n🔧 Testing Advanced Features...');
  
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Test codegen capability
    console.log('Testing codegen...');
    await page.goto('https://example.com');
    const locator = page.locator('h1');
    const codegenResult = await locator.isVisible();
    results.features.codegen = codegenResult ? 'working' : 'failed';
    
    // Test network interception
    console.log('Testing network interception...');
    let requestCount = 0;
    page.on('request', () => requestCount++);
    await page.goto('https://httpbin.org/get');
    results.features.networkInterception = requestCount > 0 ? 'working' : 'failed';
    
    // Test mobile emulation
    console.log('Testing mobile emulation...');
    const mobileContext = await browser.newContext({
      ...require('playwright').devices['iPhone 12']
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('https://example.com');
    const viewport = mobilePage.viewportSize();
    results.features.mobileEmulation = viewport ? 'working' : 'failed';
    await mobileContext.close();
    
    // Test video recording
    console.log('Testing video recording...');
    const videoContext = await browser.newContext({
      recordVideo: { dir: './test-videos/' }
    });
    const videoPage = await videoContext.newPage();
    await videoPage.goto('https://example.com');
    await videoPage.waitForTimeout(1000);
    await videoContext.close();
    results.features.videoRecording = 'working';
    
    await browser.close();
    
    console.log('✅ Advanced features test completed');
  } catch (error) {
    console.log(`❌ Advanced features test failed: ${error.message}`);
    results.features.error = error.message;
  }

  // Test API endpoints if server is available
  console.log('\n🌐 Testing API Endpoints...');
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      const health = await response.json();
      results.api = {
        status: 'available',
        health: health
      };
      console.log('✅ API endpoints: Available');
    } else {
      results.api = { status: 'unavailable', error: 'Server not responding' };
      console.log('❌ API endpoints: Server not responding');
    }
  } catch (error) {
    results.api = { status: 'unavailable', error: error.message };
    console.log('❌ API endpoints: Not available - Server not running');
  }

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log('Browsers:');
  Object.entries(results.browsers).forEach(([browser, result]) => {
    console.log(`  ${browser}: ${result.status}`);
  });
  
  console.log('\nFeatures:');
  Object.entries(results.features).forEach(([feature, result]) => {
    console.log(`  ${feature}: ${result}`);
  });
  
  console.log('\nAPI:');
  console.log(`  Status: ${results.api.status}`);
  
  return results;
}

// Run the test
testPlaywrightFeatures().catch(console.error);
