import type { RetryConfig } from '../core/types';

export class RetryStrategy {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  async execute<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: unknown, attempt: number) => boolean = () => true,
  ): Promise<T> {
    let lastError: unknown;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt >= this.config.maxAttempts || !shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.initialDelay;
    }

    const exponentialDelay = this.config.initialDelay * 2 ** (attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    const delay = exponentialDelay + jitter;

    return Math.min(delay, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConfig(): RetryConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
