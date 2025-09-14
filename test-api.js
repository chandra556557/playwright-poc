import http from 'http';

function testAPI(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/codegen${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: body
          };
          resolve(result);
        } catch (error) {
          resolve({ status: res.statusCode, body, error: error.message });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Testing Backend APIs...');
  console.log('='.repeat(50));

  try {
    // Test 1: Get supported languages
    console.log('\n1. Testing GET /api/codegen/languages');
    const languagesTest = await testAPI('/languages');
    console.log(`Status: ${languagesTest.status}`);
    console.log(`Response: ${languagesTest.body.substring(0, 200)}...`);

    // Test 2: Get export formats
    console.log('\n2. Testing GET /api/codegen/export/formats');
    const formatsTest = await testAPI('/export/formats');
    console.log(`Status: ${formatsTest.status}`);
    console.log(`Response: ${formatsTest.body.substring(0, 200)}...`);

    // Test 3: Get templates
    console.log('\n3. Testing GET /api/codegen/templates');
    const templatesTest = await testAPI('/templates');
    console.log(`Status: ${templatesTest.status}`);
    console.log(`Response: ${templatesTest.body.substring(0, 200)}...`);

    // Test 4: Get healing stats
    console.log('\n4. Testing GET /api/codegen/healing/stats');
    const healingTest = await testAPI('/healing/stats');
    console.log(`Status: ${healingTest.status}`);
    console.log(`Response: ${healingTest.body.substring(0, 200)}...`);

    // Test 5: Test code generation
    console.log('\n5. Testing POST /api/codegen/healing/generate');
    const generateTest = await testAPI('/healing/generate', 'POST', {
      actions: [
        {
          type: 'navigate',
          url: 'https://example.com',
          timestamp: Date.now()
        },
        {
          type: 'click',
          selector: '#button',
          timestamp: Date.now()
        }
      ],
      language: 'javascript',
      template: 'javascript-playwright'
    });
    console.log(`Status: ${generateTest.status}`);
    console.log(`Response: ${generateTest.body.substring(0, 200)}...`);

  } catch (error) {
    console.error('Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('API Testing Complete');
}

runTests();