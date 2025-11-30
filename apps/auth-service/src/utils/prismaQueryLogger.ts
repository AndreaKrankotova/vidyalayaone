/**
 * Utility for enabling and measuring Prisma query performance
 * Use this to track slow queries and database bottlenecks
 */

import { PrismaClient } from '../generated/client';

interface QueryLog {
  query: string;
  duration: number;
  timestamp: Date;
}

interface QueryStats {
  totalQueries: number;
  totalDuration: number;
  avgDuration: number;
  slowestQuery: QueryLog | null;
  queries: QueryLog[];
}

class PrismaQueryLogger {
  private queryLogs: QueryLog[] = [];
  private enabled: boolean = false;

  /**
   * Enable query logging on a Prisma client instance
   */
  enableLogging(prisma: PrismaClient) {
    this.enabled = true;
    this.queryLogs = [];

    // @ts-ignore - Prisma $on method exists but TypeScript might not recognize it in all versions
    prisma.$on('query', (e: any) => {
      this.queryLogs.push({
        query: e.query,
        duration: e.duration,
        timestamp: new Date(),
      });
    });

    console.log('✅ Prisma query logging enabled');
  }

  /**
   * Get statistics about all logged queries
   */
  getStats(): QueryStats {
    if (this.queryLogs.length === 0) {
      return {
        totalQueries: 0,
        totalDuration: 0,
        avgDuration: 0,
        slowestQuery: null,
        queries: [],
      };
    }

    const totalDuration = this.queryLogs.reduce((sum, log) => sum + log.duration, 0);
    const slowestQuery = this.queryLogs.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );

    return {
      totalQueries: this.queryLogs.length,
      totalDuration,
      avgDuration: totalDuration / this.queryLogs.length,
      slowestQuery,
      queries: this.queryLogs,
    };
  }

  /**
   * Get queries slower than threshold (in milliseconds)
   */
  getSlowQueries(thresholdMs: number = 50): QueryLog[] {
    return this.queryLogs.filter(log => log.duration >= thresholdMs);
  }

  /**
   * Print formatted statistics to console
   */
  printStats() {
    const stats = this.getStats();

    if (stats.totalQueries === 0) {
      console.log('📊 No queries logged');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 PRISMA QUERY STATISTICS');
    console.log('='.repeat(70) + '\n');

    console.log('Summary:');
    console.log(`  Total queries: ${stats.totalQueries}`);
    console.log(`  Total duration: ${stats.totalDuration.toFixed(2)}ms`);
    console.log(`  Average duration: ${stats.avgDuration.toFixed(2)}ms`);

    if (stats.slowestQuery) {
      console.log(`\nSlowest query: ${stats.slowestQuery.duration.toFixed(2)}ms`);
      console.log(`  ${this.truncateQuery(stats.slowestQuery.query)}`);
    }

    const slowQueries = this.getSlowQueries(50);
    if (slowQueries.length > 0) {
      console.log(`\n⚠️  Slow queries (>50ms): ${slowQueries.length}`);
      slowQueries.slice(0, 5).forEach(log => {
        console.log(`  - ${log.duration.toFixed(2)}ms: ${this.truncateQuery(log.query)}`);
      });
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /**
   * Reset query logs
   */
  reset() {
    this.queryLogs = [];
  }

  /**
   * Truncate long queries for display
   */
  private truncateQuery(query: string, maxLength: number = 80): string {
    const cleaned = query.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength 
      ? cleaned.substring(0, maxLength) + '...' 
      : cleaned;
  }
}

// Singleton instance
export const queryLogger = new PrismaQueryLogger();

/**
 * Helper to enable query logging in development
 * Add this to your DatabaseService initialization
 */
export function enableQueryLogging(prisma: PrismaClient) {
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_QUERY_LOGGING === 'true') {
    queryLogger.enableLogging(prisma);
  }
}

export default queryLogger;
