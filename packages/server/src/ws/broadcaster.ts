import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export type BroadcastEvent =
  | 'note:created'
  | 'note:updated'
  | 'note:deleted'
  | 'blocks:updated'
  | 'tags:updated'
  | 'search:reindexed'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted';

export class Broadcaster {
  private wss: WebSocketServer | null = null;

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server });
  }

  broadcast(event: BroadcastEvent, data: unknown): void {
    if (!this.wss) return;
    const message = JSON.stringify({ event, data });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  getClientCount(): number {
    return this.wss ? this.wss.clients.size : 0;
  }
}
