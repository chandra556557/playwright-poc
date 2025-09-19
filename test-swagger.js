import { specs } from './server/swagger.js';

console.log('Testing Swagger configuration...');
console.log('Swagger specs generated:', !!specs);
console.log('API paths found:', Object.keys(specs.paths || {}).length);
console.log('Components schemas:', Object.keys(specs.components?.schemas || {}).length);

if (specs.paths) {
  console.log('\nAvailable API endpoints:');
  Object.keys(specs.paths).forEach(path => {
    console.log(`  ${path}`);
  });
}

if (specs.components?.schemas) {
  console.log('\nAvailable schemas:');
  Object.keys(specs.components.schemas).forEach(schema => {
    console.log(`  ${schema}`);
  });
}

console.log('\nSwagger configuration test completed!');
