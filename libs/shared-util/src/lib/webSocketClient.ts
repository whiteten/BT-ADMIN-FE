import { LOG } from './log';
import { createUUID } from './util';

export default class WebSocketClient {
  #ws: WebSocket | null;
  #url: string;
  #key: string;
  #Log: InstanceType<typeof LOG>;
  #messageLog: boolean;

  onopen?: () => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;

  constructor(url: string, options?: { messageLog?: boolean }) {
    this.#url = url;
    this.#ws = null;
    this.#key = createUUID().split('-')[0];
    this.#Log = new LOG(`WS-Client-${this.#key}`);
    this.#messageLog = options?.messageLog ?? true;
  }

  setmessageLog(enabled: boolean): this {
    this.#messageLog = enabled;
    return this;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<this> {
    return new Promise((resolve, reject) => {
      try {
        this.#Log.info('[connect]', `Connecting to ${this.#url}`);

        this.#ws = new WebSocket(this.#url);

        this.#ws.onopen = () => {
          this.#Log.success('[onopen]', this.#url);
          this.onopen?.();
          resolve(this);
        };

        this.#ws.onmessage = (event) => {
          if (this.#messageLog) this.#Log.success('[onmessage]', event.data);
          this.onmessage?.(event);
        };

        this.#ws.onerror = (event) => {
          this.#Log.error('[onerror]', event);
          this.onerror?.(event);
          reject(event);
        };

        this.#ws.onclose = (event) => {
          this.#Log.warn('[onclose]', `Code: ${event.code}, Reason: ${event.reason}`);
          this.onclose?.(event);
        };
      } catch (error) {
        this.#Log.error('[connect error]', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): this {
    if (this.#messageLog) this.#Log.success('[disconnect]', 'Disconnecting');

    if (this.#ws) {
      this.#ws.close();
      this.#ws = null;
    }

    return this;
  }

  /**
   * Send message to server
   */
  send(data: string | Record<string, unknown>): this {
    if (!this.isConnected() || !this.#ws) {
      this.#Log.error('[send]', 'WebSocket is not connected');
      return this;
    }
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.#ws.send(message);
      if (this.#messageLog) this.#Log.success('[send]', data);
    } catch (error) {
      this.#Log.error('[send error]', error);
    }
    return this;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.#ws !== null && this.#ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get WebSocket ready state
   */
  getState(): number {
    return this.#ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Get WebSocket state as string
   */
  getStateString(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
    const state = this.getState();
    switch (state) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
      default:
        return 'CLOSED';
    }
  }
}
