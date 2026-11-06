import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { SecurityManager } from '../security/auth';

export interface WorkshopClientContext {
  ws: WebSocket;
  workshopId: string;
  userId: string;
  role: 'STUDENT' | 'ORGANISER' | 'SUPER_ADMIN';
  connectedAt: Date;
  lastPing: Date;
}

export class WorkshopRealtimeGateway {
  private wss: WebSocketServer;
  private security: SecurityManager;
  // Map of client contexts by WebSocket
  private clients: Map<WebSocket, WorkshopClientContext> = new Map();
  // Map of room name -> Set of WebSockets
  private rooms: Map<string, Set<WebSocket>> = new Map();

  constructor(wss: WebSocketServer, security: SecurityManager) {
    this.wss = wss;
    this.security = security;
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Periodic heartbeat cleaner: disconnect sockets dead > 60s
    setInterval(() => {
      const threshold = Date.now() - 60000;
      for (const [ws, ctx] of this.clients.entries()) {
        if (ctx.lastPing.getTime() < threshold) {
          try {
            ws.terminate();
          } catch {
            // ignore
          }
          this.handleDisconnect(ws);
        }
      }
    }, 15000);
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    try {
      const reqUrl = req.url || '';
      const parsedUrl = new URL(reqUrl, 'http://localhost');
      const workshopId = parsedUrl.searchParams.get('workshopId');
      const userId = parsedUrl.searchParams.get('userId');
      const role = (parsedUrl.searchParams.get('role') || 'STUDENT') as WorkshopClientContext['role'];
      const ticket = parsedUrl.searchParams.get('ticket');

      if (!workshopId || !userId) {
        ws.close(4001, 'Missing workshopId or userId parameter');
        return;
      }

      // If a ticket is supplied, validate it using SecurityManager
      if (ticket && !this.security.verifyTicket(ticket)) {
        ws.close(4003, 'Invalid or expired connection ticket');
        return;
      }

      const clientContext: WorkshopClientContext = {
        ws,
        workshopId,
        userId,
        role,
        connectedAt: new Date(),
        lastPing: new Date(),
      };

      this.clients.set(ws, clientContext);

      // Join rooms
      this.joinRoom(`workshop:${workshopId}`, ws);
      if (role === 'ORGANISER' || role === 'SUPER_ADMIN') {
        this.joinRoom(`workshop:${workshopId}:organisers`, ws);
      }
      this.joinRoom(`user:${userId}`, ws);

      // Send connection acknowledgement
      ws.send(
        JSON.stringify({
          type: 'gateway:connected',
          workshopId,
          userId,
          role,
          timestamp: new Date().toISOString(),
        })
      );

      // Handle incoming messages
      ws.on('message', (data: Buffer | string) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', () => {
        this.handleDisconnect(ws);
      });
    } catch (err: any) {
      console.error('[WorkshopRealtimeGateway] Connection handshake error:', err.message);
      try {
        ws.close(1011, 'Handshake failure');
      } catch {
        // ignore
      }
    }
  }

  private handleMessage(ws: WebSocket, data: Buffer | string) {
    const ctx = this.clients.get(ws);
    if (!ctx) return;

    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping' || msg.type === 'heartbeat') {
        ctx.lastPing = new Date();
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch {
      // non-JSON frame
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const ctx = this.clients.get(ws);
    if (!ctx) return;

    this.leaveRoom(`workshop:${ctx.workshopId}`, ws);
    this.leaveRoom(`workshop:${ctx.workshopId}:organisers`, ws);
    this.leaveRoom(`user:${ctx.userId}`, ws);
    this.clients.delete(ws);
  }

  private joinRoom(room: string, ws: WebSocket) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(ws);
  }

  private leaveRoom(room: string, ws: WebSocket) {
    const members = this.rooms.get(room);
    if (members) {
      members.delete(ws);
      if (members.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  /**
   * Broadcast an event received from the Control Plane to authorised recipients
   */
  public broadcast(event: {
    workshopId: string;
    eventType: string;
    targetUserId?: string | null;
    targetRoom?: 'all' | 'organisers' | 'user';
    timestamp: string;
    data: any;
  }) {
    let targetRoomName = `workshop:${event.workshopId}`;

    if (event.targetRoom === 'organisers') {
      targetRoomName = `workshop:${event.workshopId}:organisers`;
    } else if (event.targetRoom === 'user' && event.targetUserId) {
      targetRoomName = `user:${event.targetUserId}`;
    }

    const recipients = this.rooms.get(targetRoomName);
    if (!recipients || recipients.size === 0) {
      return 0;
    }

    const payloadStr = JSON.stringify(event);
    let sentCount = 0;

    for (const ws of recipients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payloadStr);
          sentCount++;
        } catch {
          // ignore dead socket
        }
      }
    }

    return sentCount;
  }

  public getConnectedCount(workshopId?: string): number {
    if (workshopId) {
      return this.rooms.get(`workshop:${workshopId}`)?.size || 0;
    }
    return this.clients.size;
  }
}
