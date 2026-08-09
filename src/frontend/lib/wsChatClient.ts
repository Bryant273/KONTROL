// KONTROL ERP - Real-Time WebSocket Client for K-Chat

export interface WsChatMessage {
  type: 'chat:message' | 'chat:typing' | 'chat:read' | 'chat:join';
  conversationId: string;
  senderId: string;
  senderName: string;
  content?: string;
  timestamp: number;
}

type MessageListener = (msg: WsChatMessage) => void;
type ConnectionListener = (connected: boolean) => void;

class WsChatClient {
  private socket: WebSocket | null = null;
  private messageListeners: Set<MessageListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private reconnectTimer: any = null;
  private isConnected = false;

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      console.log('[KCHAT-WS] Connecting to WebSocket Server:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[KCHAT-WS] Connected to WebSocket Server successfully!');
        this.isConnected = true;
        this.notifyConnection(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type && data.type.startsWith('chat:')) {
            this.messageListeners.forEach(listener => listener(data as WsChatMessage));
          }
        } catch (e) {
          // Ignore non-JSON messages or keep-alive pings
        }
      };

      this.socket.onclose = () => {
        console.log('[KCHAT-WS] WebSocket connection closed. Scheduling reconnect...');
        this.isConnected = false;
        this.notifyConnection(false);
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('[KCHAT-WS] WebSocket error observed:', err);
      };
    } catch (e) {
      console.error('[KCHAT-WS] Failed to create WebSocket connection:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  public sendMessage(msg: WsChatMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn('[KCHAT-WS] Socket not open. Message sent via HTTP API / Firestore fallback.');
    }
  }

  public subscribeMessages(listener: MessageListener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public subscribeConnection(listener: ConnectionListener) {
    this.connectionListeners.add(listener);
    listener(this.isConnected);
    return () => this.connectionListeners.delete(listener);
  }

  private notifyConnection(connected: boolean) {
    this.connectionListeners.forEach(l => l(connected));
  }
}

export const wsChatClient = new WsChatClient();
