import type { QueuedRequest } from './types';

export class RequestQueue {
  private queue: Map<string, QueuedRequest> = new Map();
  private requestCounter = 0;

  enqueue(retry: () => Promise<unknown>): Promise<unknown> {
    const id = `req_${++this.requestCounter}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      this.queue.set(id, {
        id,
        retry: async () => {
          try {
            const result = await retry();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        reject,
      });
    });
  }

  async retryAll(): Promise<void> {
    const requests = Array.from(this.queue.values());
    this.queue.clear();

    const results = await Promise.allSettled(requests.map((req) => req.retry()));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        requests[index].reject(result.reason);
      }
    });
  }

  rejectAll(error: Error): void {
    const requests = Array.from(this.queue.values());
    this.queue.clear();

    for (const request of requests) {
      request.reject(error);
    }
  }

  clear(): void {
    this.queue.clear();
  }

  size(): number {
    return this.queue.size;
  }

  isEmpty(): boolean {
    return this.queue.size === 0;
  }
}
