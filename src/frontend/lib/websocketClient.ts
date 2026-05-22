import { useState, useEffect } from 'react';

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

// Singleton state to share websocket connection status across multiple mounted hooks
class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private listeners: Set<(status: ConnectionStatus, retryCount: number, nextRetryDelay: number) => void> = new Set();
  
  private retryCount = 0;
  private maxDelay = 30000; // max 30 seconds
  private initialDelay = 1000; // start with 1 second
  private reconnectTimeoutId: any = null;
  private nextRetryDelay = 0;

  private constructor() {
    // Auto-initiate connection in browser context
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public subscribe(listener: (status: ConnectionStatus, retryCount: number, nextRetryDelay: number) => void) {
    this.listeners.add(listener);
    // Emit current state immediately to the new listener
    listener(this.status, this.retryCount, this.nextRetryDelay);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(newStatus: ConnectionStatus) {
    this.status = newStatus;
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener(this.status, this.retryCount, this.nextRetryDelay);
    });
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ws`;

    if (this.retryCount > 0) {
      this.setStatus('RECONNECTING');
    } else {
      this.setStatus('CONNECTING');
    }

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[KONTROL-WS] Connexion établie avec succès');
        this.retryCount = 0;
        this.nextRetryDelay = 0;
        this.setStatus('CONNECTED');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') {
            this.socket?.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // Plain message or unparseable
        }
      };

      this.socket.onclose = () => {
        if (this.status === 'CONNECTED') {
          console.warn('[KONTROL-WS] Connexion fermée par le serveur');
        }
        this.handleDisconnect();
      };

      this.socket.onerror = (error) => {
        // Suppress noisy console warnings for expected development/preview drops
        console.warn('[KONTROL-WS] Erreur réseau détectée, reconnexion programmée');
        this.socket?.close();
      };
    } catch (e) {
      console.error('[KONTROL-WS] Erreur d\'initialisation du WebSocket:', e);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.setStatus('DISCONNECTED');
    this.socket = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimeoutId) return;

    // Exponential Backoff: delay = Math.min(maxDelay, initialDelay * (2 ^ retryCount))
    const rawDelay = Math.min(this.maxDelay, this.initialDelay * Math.pow(2, this.retryCount));
    // Add Jitter: add or subtract up to 20% of the delay randomly to stagger parallel re-connections
    const jitter = (Math.random() * 0.4 - 0.2) * rawDelay;
    const finalDelay = Math.round(rawDelay + jitter);

    this.nextRetryDelay = finalDelay;
    this.retryCount++;

    console.log(`[KONTROL-WS] Tentative de reconnexion #${this.retryCount} dans ${Math.round(finalDelay / 1000)}s`);
    this.notify();

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      this.connect();
    }, finalDelay);
  }

  public getStatus() {
    return {
      status: this.status,
      retryCount: this.retryCount,
      nextRetryDelay: this.nextRetryDelay,
    };
  }

  public forceReconnect() {
    this.retryCount = 0;
    this.nextRetryDelay = 0;
    if (this.socket) {
      this.socket.close();
    }
    this.connect();
  }
}

export function useWebSocket() {
  const manager = WebSocketManager.getInstance();
  const [state, setState] = useState<{
    status: ConnectionStatus;
    retryCount: number;
    nextRetryDelay: number;
  }>(manager.getStatus());

  useEffect(() => {
    const unsubscribe = manager.subscribe((status, retryCount, nextRetryDelay) => {
      setState({ status, retryCount, nextRetryDelay });
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    forceReconnect: () => manager.forceReconnect(),
  };
}
