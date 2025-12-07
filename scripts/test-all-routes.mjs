#!/usr/bin/env node

/**
 * Comprehensive Route Testing Script
 * Tests all API routes with realistic payloads to ensure production readiness
 */

// Use native fetch (Node 18+ has it built-in)
const fetch = globalThis.fetch;

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const XAI_API_KEY = process.env.XAI_API_KEY;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN || process.env.BEARER_TOKEN;

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testing: ${name}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

async function testRoute(name, url, options = {}) {
  const {
    method = 'GET',
    body,
    expectedStatus = 200,
    expectedFields = [],
    timeout = 30000,
    validateResponse = null,
  } = options;

  try {
    logTest(name);
    log(`URL: ${url}`, 'blue');
    log(`Method: ${method}`, 'blue');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    const contentType = response.headers.get('content-type') || '';
    let responseData;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else if (contentType.includes('text/event-stream')) {
      // For SSE streams, read first few events
      const text = await response.text();
      responseData = { stream: true, preview: text.substring(0, 500) };
    } else {
      responseData = { text: await response.text() };
    }

    log(`Status: ${response.status}`, response.status === expectedStatus ? 'green' : 'red');
    log(`Duration: ${duration}ms`, duration < 1000 ? 'green' : duration < 5000 ? 'yellow' : 'red');

    // Validate status
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }

    // Validate expected fields
    if (expectedFields.length > 0 && responseData && typeof responseData === 'object') {
      const missingFields = expectedFields.filter(field => !(field in responseData));
      if (missingFields.length > 0) {
        throw new Error(`Missing expected fields: ${missingFields.join(', ')}`);
      }
    }

    // Custom validation
    if (validateResponse) {
      const validationResult = validateResponse(responseData, response);
      if (validationResult !== true) {
        throw new Error(validationResult || 'Custom validation failed');
      }
    }

    results.passed.push({ name, url, duration, status: response.status });
    log(`✓ PASSED: ${name}`, 'green');
    return { success: true, data: responseData, duration };

  } catch (error) {
    results.failed.push({ name, url, error: error.message });
    log(`✗ FAILED: ${name}`, 'red');
    log(`  Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testStreamingRoute(name, url, options = {}) {
  const { timeout = 10000, validateEvents = null } = options;

  try {
    logTest(name);
    log(`URL: ${url}`, 'blue');
    log(`Type: Server-Sent Events (SSE)`, 'blue');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: options.headers || {},
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      throw new Error(`Expected text/event-stream, got ${contentType}`);
    }

    // Read stream events
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const events = [];
    let buffer = '';

    const startTime = Date.now();
    let hasData = false;

    try {
      while (Date.now() - startTime < timeout) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            hasData = true;
            try {
              const data = JSON.parse(line.slice(6));
              events.push(data);
              log(`  Event: ${data.type || 'data'}`, 'blue');
            } catch (e) {
              // Invalid JSON, skip
            }
          }
        }

        // Stop after receiving a few events
        if (events.length >= 3) {
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!hasData) {
      throw new Error('No events received from stream');
    }

    if (validateEvents) {
      const validationResult = validateEvents(events);
      if (validationResult !== true) {
        throw new Error(validationResult || 'Event validation failed');
      }
    }

    results.passed.push({ name, url, events: events.length });
    log(`✓ PASSED: ${name} (received ${events.length} events)`, 'green');
    return { success: true, events };

  } catch (error) {
    results.failed.push({ name, url, error: error.message });
    log(`✗ FAILED: ${name}`, 'red');
    log(`  Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Main test suite
async function runTests() {
  log('\n🚀 Starting Comprehensive Route Testing', 'cyan');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`XAI_API_KEY: ${XAI_API_KEY ? '✓ Set' : '✗ Missing'}`, XAI_API_KEY ? 'green' : 'yellow');
  log(`X_BEARER_TOKEN: ${X_BEARER_TOKEN ? '✓ Set' : '✗ Missing'}`, X_BEARER_TOKEN ? 'green' : 'yellow');

  if (!XAI_API_KEY) {
    log('\n⚠️  Warning: XAI_API_KEY not set. Some tests may fail.', 'yellow');
    results.warnings.push('XAI_API_KEY not set');
  }

  if (!X_BEARER_TOKEN) {
    log('\n⚠️  Warning: X_BEARER_TOKEN not set. Some tests may fail.', 'yellow');
    results.warnings.push('X_BEARER_TOKEN not set');
  }

  // Test 1: Grok Breaking News (GET with query)
  await testStreamingRoute(
    'Grok Breaking News - Empty Query',
    `${BASE_URL}/api/grok/breaking-news`,
    {
      timeout: 15000,
      validateEvents: (events) => {
        const hasConnected = events.some(e => e.type === 'connected' || e.type === 'status');
        if (!hasConnected) {
          return 'Expected at least one status or connected event';
        }
        return true;
      },
    }
  );

  await testStreamingRoute(
    'Grok Breaking News - With Query',
    `${BASE_URL}/api/grok/breaking-news?query=technology`,
    {
      timeout: 15000,
      validateEvents: (events) => {
        const hasConnected = events.some(e => e.type === 'connected' || e.type === 'status');
        if (!hasConnected) {
          return 'Expected at least one status or connected event';
        }
        return true;
      },
    }
  );

  // Test 2: X API Geo
  await testRoute(
    'X API Geo - Valid Query',
    `${BASE_URL}/api/x-api/geo?query=technology`,
    {
      expectedStatus: 200,
      expectedFields: ['success', 'query'],
      validateResponse: (data) => {
        if (!data.success) {
          return 'Expected success: true';
        }
        if (data.error && !X_BEARER_TOKEN) {
          // Expected error if token missing
          return true;
        }
        return true;
      },
    }
  );

  await testRoute(
    'X API Geo - Missing Query',
    `${BASE_URL}/api/x-api/geo`,
    {
      expectedStatus: 200, // May return empty results
      validateResponse: (data) => {
        // Should handle missing query gracefully
        return true;
      },
    }
  );

  // Test 3: X API Search
  await testRoute(
    'X API Search - Valid Query',
    `${BASE_URL}/api/x-api/search?query=artificial%20intelligence`,
    {
      expectedStatus: 200,
      expectedFields: ['success', 'query'],
      validateResponse: (data) => {
        if (!data.success && !data.error) {
          return 'Expected success or error field';
        }
        return true;
      },
    }
  );

  await testRoute(
    'X API Search - With Max Results',
    `${BASE_URL}/api/x-api/search?query=tech&maxResults=10`,
    {
      expectedStatus: 200,
      expectedFields: ['success'],
    }
  );

  // Test 4: X API Test
  await testRoute(
    'X API Test - Default Query',
    `${BASE_URL}/api/x-api/test`,
    {
      expectedStatus: 200,
      expectedFields: ['success'],
    }
  );

  await testRoute(
    'X API Test - Custom Query',
    `${BASE_URL}/api/x-api/test?query=machine%20learning`,
    {
      expectedStatus: 200,
      expectedFields: ['success'],
    }
  );

  // Test 5: X API Stream
  await testStreamingRoute(
    'X API Stream - Query',
    `${BASE_URL}/api/x-api/stream?query=technology`,
    {
      timeout: 10000,
      validateEvents: (events) => {
        // Stream may not have events immediately, just check it's working
        return true;
      },
    }
  );

  // Test 6: X API Geo Stream
  await testStreamingRoute(
    'X API Geo Stream - Valid Query',
    `${BASE_URL}/api/x-api/geo-stream?query=technology`,
    {
      timeout: 15000,
      validateEvents: (events) => {
        const hasConnected = events.some(e => e.type === 'connected');
        if (!hasConnected && events.length === 0) {
          return 'Expected at least a connected event';
        }
        return true;
      },
    }
  );

  await testRoute(
    'X API Geo Stream - Missing Query',
    `${BASE_URL}/api/x-api/geo-stream`,
    {
      expectedStatus: 400, // Should return 400 for missing query
    }
  );

  // Test 7: Geocode (if route exists)
  await testRoute(
    'Geocode - Valid Location',
    `${BASE_URL}/api/geocode?location=San%20Francisco`,
    {
      expectedStatus: 200,
      expectedFields: ['success'],
      validateResponse: (data) => {
        if (data.success && !data.coordinates) {
          return 'Expected coordinates when success is true';
        }
        return true;
      },
    }
  );

  await testRoute(
    'Geocode - City with Country',
    `${BASE_URL}/api/geocode?location=Paris,%20France`,
    {
      expectedStatus: 200,
      expectedFields: ['success'],
    }
  );

  await testRoute(
    'Geocode - Invalid Location',
    `${BASE_URL}/api/geocode?location=InvalidLocation12345`,
    {
      expectedStatus: 200, // May return success: false
      validateResponse: (data) => {
        // Should handle invalid locations gracefully
        return true;
      },
    }
  );

  await testRoute(
    'Geocode - Missing Location',
    `${BASE_URL}/api/geocode`,
    {
      expectedStatus: 400, // Should return 400 for missing parameter
    }
  );

  // Test 8: Edge cases and error handling
  await testRoute(
    'X API Geo - Special Characters',
    `${BASE_URL}/api/x-api/geo?query=test%20%26%20%3D%20%2B`,
    {
      expectedStatus: 200,
    }
  );

  await testRoute(
    'X API Search - Very Long Query',
    `${BASE_URL}/api/x-api/search?query=${'a'.repeat(500)}`,
    {
      expectedStatus: 200,
      validateResponse: (data) => {
        // Should handle long queries gracefully
        return true;
      },
    }
  );

  await testRoute(
    'Grok Breaking News - Special Characters',
    `${BASE_URL}/api/grok/breaking-news?query=test%20%26%20%3D`,
    {
      expectedStatus: 200,
    }
  );

  // Print summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`\n✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'red' : 'green');
  log(`⚠️  Warnings: ${results.warnings.length}`, results.warnings.length > 0 ? 'yellow' : 'green');

  if (results.failed.length > 0) {
    log('\n❌ FAILED TESTS:', 'red');
    results.failed.forEach(({ name, url, error }) => {
      log(`  - ${name}`, 'red');
      log(`    URL: ${url}`, 'red');
      log(`    Error: ${error}`, 'red');
    });
  }

  if (results.warnings.length > 0) {
    log('\n⚠️  WARNINGS:', 'yellow');
    results.warnings.forEach(warning => {
      log(`  - ${warning}`, 'yellow');
    });
  }

  if (results.passed.length > 0) {
    log('\n✅ PASSED TESTS:', 'green');
    results.passed.forEach(({ name, duration, status }) => {
      const durationStr = duration ? ` (${duration}ms)` : '';
      log(`  - ${name} - ${status}${durationStr}`, 'green');
    });
  }

  log('\n' + '='.repeat(60), 'cyan');

  const exitCode = results.failed.length > 0 ? 1 : 0;
  if (exitCode === 0) {
    log('🎉 All tests passed!', 'green');
  } else {
    log('⚠️  Some tests failed. Please review the errors above.', 'red');
  }

  process.exit(exitCode);
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
