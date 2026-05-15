// ---------------------------------------------------------------------------
// WebSocket event types broadcast by the OctoNote server
// ---------------------------------------------------------------------------

export type WsEvent =
  | 'note:created'
  | 'note:updated'
  | 'note:deleted'
  | 'blocks:updated'
  | 'tags:updated'
  | 'search:reindexed'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted';

export type WsHandler = (data: unknown) => void;

interface WsMessage {
  event: string;
  data: unknown;
}

// ---------------------------------------------------------------------------
// WebSocket client with auto-reconnect (exponential backoff)
// ---------------------------------------------------------------------------

class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<WsHandler>>();
  private shouldReconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;

  /** Base delay in ms; actual delay = base * 2^attempt, capped at max. */
  private readonly baseDelay = 500;
  private readonly maxDelay = 30_000;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Open a WebSocket connection and enable auto-reconnect. */
  connect(): void {
    this.shouldReconnect = true;
    this.reconnectAttempt = 0;
    this.open();
  }

  /** Close the connection and stop reconnecting. */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }
  }

  /** Register a handler for a specific event type. */
  on(event: WsEvent, handler: WsHandler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  /** Unregister a previously registered handler. */
  off(event: WsEvent, handler: WsHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private open(): void {
    if (this.ws) {
      // Already connecting or connected
      if (
        this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN
      ) {
        return;
      }
    }

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${location.host}`);

    this.ws.onopen = () => {
      // Reset backoff on successful connection
      this.reconnectAttempt = 0;
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(String(event.data));
        this.dispatch(msg.event, msg.data);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror; reconnect is handled there.
      this.ws?.close();
    };
  }

  private dispatch(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(data);
      } catch {
        // Don't let a bad handler break the dispatch loop
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    const delay = Math.min(
      this.baseDelay * 2 ** this.reconnectAttempt,
      this.maxDelay,
    );
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const wsClient = new WsClient();
