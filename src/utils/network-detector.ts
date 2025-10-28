import type { NetworkStatus } from '../core/types';

export class NetworkDetector {
  private status: NetworkStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChecked: Date.now(),
  };

  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.onlineHandler = () => {
      this.updateStatus(true);
    };

    this.offlineHandler = () => {
      this.updateStatus(false);
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  private updateStatus(isOnline: boolean): void {
    this.status = {
      isOnline,
      lastChecked: Date.now(),
    };

    this.notifyListeners(isOnline);
  }

  private notifyListeners(isOnline: boolean): void {
    for (const listener of this.listeners) {
      listener(isOnline);
    }
  }

  isOnline(): boolean {
    return this.status.isOnline;
  }

  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  addListener(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  async waitForOnline(timeoutMs = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);

      const cleanup = this.addListener((isOnline) => {
        if (isOnline) {
          clearTimeout(timeout);
          cleanup();
          resolve(true);
        }
      });
    });
  }

  destroy(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }

    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
      this.offlineHandler = null;
    }

    this.listeners.clear();
  }
}
