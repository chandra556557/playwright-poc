import http from 'http';

const data = JSON.stringify({
  code: 'test',
  language: 'javascript',
  title: 'Test Execution'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/codegen/run',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log('headers:', res.headers);

  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
