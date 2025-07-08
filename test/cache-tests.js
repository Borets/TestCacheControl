const http = require('http');
const assert = require('assert');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TESTS_PASSED = [];
const TESTS_FAILED = [];

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test functions
async function testHealthEndpoint() {
  console.log('Testing health endpoint...');
  try {
    const response = await makeRequest(`${BASE_URL}/health`);
    assert.strictEqual(response.statusCode, 200);
    console.log('✓ Health endpoint test passed');
    TESTS_PASSED.push('Health endpoint');
  } catch (error) {
    console.error('✗ Health endpoint test failed:', error.message);
    TESTS_FAILED.push('Health endpoint');
  }
}

async function testCacheHeaders() {
  console.log('Testing cache headers...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/cache-test/max-age`);
    assert.strictEqual(response.statusCode, 200);
    assert(response.headers['cache-control'], 'Cache-Control header should be present');
    console.log('✓ Cache headers test passed');
    TESTS_PASSED.push('Cache headers');
  } catch (error) {
    console.error('✗ Cache headers test failed:', error.message);
    TESTS_FAILED.push('Cache headers');
  }
}

async function testETagSupport() {
  console.log('Testing ETag support...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/cache-test/etag-test`);
    assert.strictEqual(response.statusCode, 200);
    assert(response.headers['etag'], 'ETag header should be present');
    console.log('✓ ETag test passed');
    TESTS_PASSED.push('ETag support');
  } catch (error) {
    console.error('✗ ETag test failed:', error.message);
    TESTS_FAILED.push('ETag support');
  }
}

async function testStaticFiles() {
  console.log('Testing static file serving...');
  try {
    const response = await makeRequest(`${BASE_URL}/css/styles.css`);
    assert.strictEqual(response.statusCode, 200);
    assert(response.headers['content-type'].includes('text/css'), 'CSS content type should be correct');
    console.log('✓ Static files test passed');
    TESTS_PASSED.push('Static files');
  } catch (error) {
    console.error('✗ Static files test failed:', error.message);
    TESTS_FAILED.push('Static files');
  }
}

async function testCompressionSupport() {
  console.log('Testing compression support...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/compression-test`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate'
      }
    });
    assert.strictEqual(response.statusCode, 200);
    console.log('✓ Compression test passed');
    TESTS_PASSED.push('Compression support');
  } catch (error) {
    console.error('✗ Compression test failed:', error.message);
    TESTS_FAILED.push('Compression support');
  }
}

// Main test runner
async function runTests() {
  console.log('Starting cache tests...\n');
  
  const tests = [
    testHealthEndpoint,
    testCacheHeaders,
    testETagSupport,
    testStaticFiles,
    testCompressionSupport
  ];
  
  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      console.error(`Test failed with error: ${error.message}`);
    }
    console.log(''); // Add spacing between tests
  }
  
  // Print summary
  console.log('='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${TESTS_PASSED.length}`);
  console.log(`Failed: ${TESTS_FAILED.length}`);
  
  if (TESTS_PASSED.length > 0) {
    console.log('\nPassed tests:');
    TESTS_PASSED.forEach(test => console.log(`  ✓ ${test}`));
  }
  
  if (TESTS_FAILED.length > 0) {
    console.log('\nFailed tests:');
    TESTS_FAILED.forEach(test => console.log(`  ✗ ${test}`));
  }
  
  console.log('\nNote: Make sure the server is running on port 3000 before running tests.');
  console.log('Start the server with: npm start');
  
  // Exit with appropriate code
  process.exit(TESTS_FAILED.length > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };