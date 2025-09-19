import axios from 'axios';

async function testDiscoverElements() {
  try {
    const response = await axios.post('http://localhost:5173/api/discover-elements', {
      url: 'https://example.com',
      browserName: 'chromium',
      context: {},
      options: {},
    });
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testDiscoverElements();
