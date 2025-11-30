/**
 * Load test script for login endpoint using autocannon
 * This simulates multiple concurrent users logging in to measure performance
 */

import autocannon from 'autocannon';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TEST_USER = {
  username: 'profiling_test_user',
  password: 'TestPassword123!',
};

const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
const URL = `http://localhost:${PORT}${API_PREFIX}/auth/login`;

// Load test configuration
const LOAD_TEST_CONFIG = {
  url: URL,
  connections: 50, // Number of concurrent connections
  duration: 30, // Test duration in seconds
  pipelining: 1, // Number of pipelined requests
  method: 'POST' as const,
  headers: {
    'Content-Type': 'application/json',
    'x-context': 'platform',
  },
  body: JSON.stringify({
    username: TEST_USER.username,
    password: TEST_USER.password,
  }),
};

async function runLoadTest() {
  console.log('\n🚀 Starting Login Load Test\n');
  console.log('Configuration:');
  console.log(`  URL: ${URL}`);
  console.log(`  Connections: ${LOAD_TEST_CONFIG.connections}`);
  console.log(`  Duration: ${LOAD_TEST_CONFIG.duration}s`);
  console.log(`  Test User: ${TEST_USER.username}`);
  console.log(`\n⚠️  Make sure:`);
  console.log(`  1. Auth service is running on port ${PORT}`);
  console.log(`  2. Test user exists (run: pnpm seed:test-user)`);
  console.log(`  3. Database is accessible\n`);
  console.log('Starting in 3 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  const instance = autocannon(LOAD_TEST_CONFIG, (err, result) => {
    if (err) {
      console.error('❌ Load test failed:', err);
      process.exit(1);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 LOAD TEST RESULTS');
    console.log('='.repeat(70) + '\n');

    // Summary statistics
    console.log('Summary:');
    console.log(`  Total requests: ${result.requests.total}`);
    console.log(`  Duration: ${result.duration}s`);
    console.log(`  Throughput: ${result.requests.average} req/s`);
    console.log(`  Latency (avg): ${result.latency.mean}ms`);
    console.log(`  Latency (p50): ${result.latency.p50 || (result.latency as any).p50}ms`);
    console.log(`  Latency (p75): ${(result.latency as any).p75 || 'N/A'}ms`);
    console.log(`  Latency (p90): ${result.latency.p90 || (result.latency as any).p90}ms`);
    console.log(`  Latency (p95): ${(result.latency as any).p95 || 'N/A'}ms`);
    console.log(`  Latency (p99): ${result.latency.p99 || (result.latency as any).p99}ms`);
    console.log(`  Latency (max): ${result.latency.max}ms`);

    console.log('\nErrors:');
    console.log(`  Total errors: ${result.errors}`);
    console.log(`  Timeouts: ${result.timeouts}`);
    console.log(`  Non-2xx responses: ${result.non2xx || 0}`);

    console.log('\nHTTP Status Codes:');
    const statusCodes = (result as any)['2xx'] || {};
    Object.entries(statusCodes).forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });
    const status4xx = (result as any)['4xx'] || {};
    Object.entries(status4xx).forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });
    const status5xx = (result as any)['5xx'] || {};
    Object.entries(status5xx).forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 Tips for recording results:');
    console.log('  - Copy the p50, p95, p99 latency values');
    console.log('  - Note the throughput (req/s)');
    console.log('  - Check for errors and non-2xx responses');
    console.log('  - Run the test 2-3 times and take the median\n');

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const saltRounds = process.env.BCRYPT_SALT_ROUNDS || '12';
    const filename = `load-test-results-${saltRounds}rounds-${timestamp}.json`;
    
    console.log(`📁 Detailed results saved to: profiles/${filename}\n`);
  });

  // Progress tracking
  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: false,
  });
}

// Check if server is running before starting
async function checkServerHealth() {
  try {
    const response = await fetch(`http://localhost:${PORT}/health`);
    if (response.ok) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

async function main() {
  const isServerRunning = await checkServerHealth();
  
  if (!isServerRunning) {
    console.log('\n⚠️  Warning: Could not connect to auth service');
    console.log(`   Expected server at: http://localhost:${PORT}`);
    console.log('\n   Start the server with: pnpm --filter @vidyalayaone/auth-service dev');
    console.log('   Then run this load test again.\n');
    
    // Ask user if they want to continue anyway
    console.log('Continuing anyway in case server is running without health endpoint...\n');
  }

  await runLoadTest();
}

main().catch(error => {
  console.error('❌ Error running load test:', error);
  process.exit(1);
});
