import type { MultiTabSyncMessage, TokenPair } from '../core/types';

const CHANNEL_NAME = 'auxios_sync';
const STORAGE_KEY = 'auxios_sync_event';

export class MultiTabSync {
  private channel: BroadcastChannel | null = null;
  private onTokenUpdate: ((tokens: TokenPair) => void) | null = null;
  private onLogout: (() => void) | null = null;
  private onTokenBlacklisted: (() => void) | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private isEnabled: boolean;

  constructor(enabled = true) {
    this.isEnabled = enabled;
    if (enabled) {
      this.initialize();
    }
  }

  private initialize(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      this.initializeBroadcastChannel();
    } else {
      this.initializeStorageEvents();
    }
  }

  private initializeBroadcastChannel(): void {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent<MultiTabSyncMessage>) => {
      this.handleMessage(event.data);
    };
  }

  private initializeStorageEvents(): void {
    this.storageListener = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const message: MultiTabSyncMessage = JSON.parse(event.newValue);
          this.handleMessage(message);
        } catch {
          // Ignore invalid messages
        }
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  private handleMessage(message: MultiTabSyncMessage): void {
    switch (message.type) {
      case 'TOKEN_UPDATED':
        if (message.payload && this.onTokenUpdate) {
          this.onTokenUpdate(message.payload);
        }
        break;
      case 'LOGOUT':
        if (this.onLogout) {
          this.onLogout();
        }
        break;
      case 'TOKEN_BLACKLISTED':
        if (this.onTokenBlacklisted) {
          this.onTokenBlacklisted();
        }
        break;
    }
  }

  broadcastTokenUpdate(tokens: TokenPair): void {
    if (!this.isEnabled) return;

    const message: MultiTabSyncMessage = {
      type: 'TOKEN_UPDATED',
      payload: tokens,
      timestamp: Date.now(),
    };

    this.broadcast(message);
  }

  broadcastLogout(): void {
    if (!this.isEnabled) return;

    const message: MultiTabSyncMessage = {
      type: 'LOGOUT',
      timestamp: Date.now(),
    };

    this.broadcast(message);
  }

  broadcastTokenBlacklisted(): void {
    if (!this.isEnabled) return;

    const message: MultiTabSyncMessage = {
      type: 'TOKEN_BLACKLISTED',
      timestamp: Date.now(),
    };

    this.broadcast(message);
  }

  private broadcast(message: MultiTabSyncMessage): void {
    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  setOnTokenUpdate(callback: (tokens: TokenPair) => void): void {
    this.onTokenUpdate = callback;
  }

  setOnLogout(callback: () => void): void {
    this.onLogout = callback;
  }

  setOnTokenBlacklisted(callback: () => void): void {
    this.onTokenBlacklisted = callback;
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }

    this.onTokenUpdate = null;
    this.onLogout = null;
    this.onTokenBlacklisted = null;
  }
}
