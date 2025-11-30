/**
 * Benchmark script for profiling login endpoint performance
 * This script performs repeated login requests and collects performance metrics
 * Use with Node profilers: --cpu-prof, clinic flame, clinic heapprofiler
 */

import axios from 'axios';
import { performance } from 'perf_hooks';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
// When running compiled JS from dist/, go up two levels to reach project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TEST_USER = {
  username: 'profiling_test_user',
  password: 'TestPassword123!',
};

const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
const BASE_URL = `http://localhost:${PORT}${API_PREFIX}/auth`;

// Benchmark configuration
const WARMUP_REQUESTS = 10; // Requests to warm up JIT/V8 optimizations
const BENCHMARK_REQUESTS = 500; // Number of requests to measure
const CONCURRENT_REQUESTS = 10; // Number of concurrent requests

interface BenchmarkResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errors: string[];
}

async function loginRequest(): Promise<number> {
  const startTime = performance.now();
  
  try {
    const response = await axios.post(
      `${BASE_URL}/login`,
      {
        username: TEST_USER.username,
        password: TEST_USER.password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-context': 'platform',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    if (response.status !== 200) {
      throw new Error(`Unexpected status: ${response.status}`);
    }

    const endTime = performance.now();
    return endTime - startTime;
  } catch (error: any) {
    const endTime = performance.now();
    console.error('Request failed:', error.message);
    return endTime - startTime; // Still return duration for failed requests
  }
}

async function warmup() {
  console.log(`🔥 Warming up with ${WARMUP_REQUESTS} requests...`);
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await loginRequest();
  }
  console.log('✅ Warmup complete\n');
}

function calculatePercentile(sortedLatencies: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedLatencies.length) - 1;
  return sortedLatencies[Math.max(0, index)];
}

async function runBenchmark(): Promise<BenchmarkResult> {
  console.log(`📊 Running benchmark with ${BENCHMARK_REQUESTS} requests...`);
  console.log(`   Concurrency: ${CONCURRENT_REQUESTS}\n`);

  const latencies: number[] = [];
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  const benchmarkStart = performance.now();

  // Run requests in batches for controlled concurrency
  for (let i = 0; i < BENCHMARK_REQUESTS; i += CONCURRENT_REQUESTS) {
    const batchSize = Math.min(CONCURRENT_REQUESTS, BENCHMARK_REQUESTS - i);
    const batch = Array(batchSize).fill(null).map(() => loginRequest());
    
    const results = await Promise.allSettled(batch);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        latencies.push(result.value);
        successCount++;
      } else {
        failCount++;
        errors.push(result.reason?.message || 'Unknown error');
      }
    });

    // Progress indicator
    const progress = Math.round((i + batchSize) / BENCHMARK_REQUESTS * 100);
    process.stdout.write(`\r   Progress: ${progress}%`);
  }

  const benchmarkEnd = performance.now();
  console.log('\n');

  // Calculate statistics
  const sortedLatencies = latencies.sort((a, b) => a - b);
  const totalDuration = (benchmarkEnd - benchmarkStart) / 1000; // Convert to seconds

  return {
    totalRequests: BENCHMARK_REQUESTS,
    successfulRequests: successCount,
    failedRequests: failCount,
    totalDuration,
    avgLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
    minLatency: sortedLatencies[0] || 0,
    maxLatency: sortedLatencies[sortedLatencies.length - 1] || 0,
    p50Latency: calculatePercentile(sortedLatencies, 50),
    p95Latency: calculatePercentile(sortedLatencies, 95),
    p99Latency: calculatePercentile(sortedLatencies, 99),
    throughput: successCount / totalDuration,
    errors: Array.from(new Set(errors)).slice(0, 5), // Unique errors, max 5
  };
}

function printResults(results: BenchmarkResult) {
  console.log('='.repeat(70));
  console.log('📈 BENCHMARK RESULTS');
  console.log('='.repeat(70) + '\n');

  console.log('Request Summary:');
  console.log(`  Total requests: ${results.totalRequests}`);
  console.log(`  Successful: ${results.successfulRequests}`);
  console.log(`  Failed: ${results.failedRequests}`);
  console.log(`  Duration: ${results.totalDuration.toFixed(2)}s`);

  console.log('\nLatency (milliseconds):');
  console.log(`  Average: ${results.avgLatency.toFixed(2)}ms`);
  console.log(`  Min: ${results.minLatency.toFixed(2)}ms`);
  console.log(`  Max: ${results.maxLatency.toFixed(2)}ms`);
  console.log(`  p50 (median): ${results.p50Latency.toFixed(2)}ms`);
  console.log(`  p95: ${results.p95Latency.toFixed(2)}ms`);
  console.log(`  p99: ${results.p99Latency.toFixed(2)}ms`);

  console.log('\nThroughput:');
  console.log(`  ${results.throughput.toFixed(2)} req/s`);

  if (results.errors.length > 0) {
    console.log('\nErrors (sample):');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n' + '='.repeat(70));
  
  const saltRounds = process.env.BCRYPT_SALT_ROUNDS;
  console.log(`\n🔐 Current BCRYPT_SALT_ROUNDS: ${saltRounds}`);
  console.log('\n💡 Record these values for comparison!');
  console.log('   Run again with different BCRYPT_SALT_ROUNDS to measure improvement.\n');
}

async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`http://localhost:${PORT}/health`, {
      timeout: 2000,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\n🎯 Login Endpoint Benchmark\n');
  console.log('Configuration:');
  console.log(`  Target: ${BASE_URL}/login`);
  console.log(`  Test user: ${TEST_USER.username}`);
  console.log(`  Warmup: ${WARMUP_REQUESTS} requests`);
  console.log(`  Benchmark: ${BENCHMARK_REQUESTS} requests`);
  console.log(`  Concurrency: ${CONCURRENT_REQUESTS}\n`);

  // Check if server is running
  console.log('🔍 Checking server health...');
  const isHealthy = await checkServerHealth();
  
  if (!isHealthy) {
    console.log('❌ Server is not responding!');
    console.log(`   Make sure auth-service is running on port ${PORT}`);
    console.log('   Start with: pnpm --filter @vidyalayaone/auth-service dev\n');
    process.exit(1);
  }
  console.log('✅ Server is healthy\n');

  // Warmup phase
  await warmup();

  // Benchmark phase
  const results = await runBenchmark();

  // Print results
  printResults(results);
}

main().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
