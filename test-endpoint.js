import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/codegen/run';

async function testEndpoint() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'test',
        language: 'javascript',
        title: 'Test Execution'
      })
    });

    if (!response.ok) {
      let errorText;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData, null, 2);
      } catch (e) {
        errorText = await response.text();
      }
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testEndpoint();
