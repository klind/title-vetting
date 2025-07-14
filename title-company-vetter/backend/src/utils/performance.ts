/**
 * Measures the performance of an async function
 * 
 * @param label - Label for the measurement
 * @param fn - Async function to measure
 * @returns Object with result and duration
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    // Log performance metrics if in debug mode
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`⚡ Performance: ${label}`, {
        duration: `${duration}ms`,
        memoryDelta: {
          heapUsed: `${(endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024}MB`,
          external: `${(endMemory.external - startMemory.external) / 1024 / 1024}MB`,
        },
      });
    }

    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed performance measurement
    if (process.env.LOG_LEVEL === 'debug') {
      console.error(`❌ Performance (failed): ${label}`, {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    throw error;
  }
}

/**
 * Generates a unique request ID
 * 
 * @returns Unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 