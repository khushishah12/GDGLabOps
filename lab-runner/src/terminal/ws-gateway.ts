import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { SecurityManager } from '../security/auth';
import { ContainerManager } from '../container/container-manager';
import { DockerClientManager } from '../container/docker-client';

export class TerminalWebSocketGateway {
  private wss: WebSocketServer;
  private security: SecurityManager;
  private containerManager: ContainerManager;
  private activeConnections: Map<string, WebSocket> = new Map();

  constructor(
    wss: WebSocketServer,
    security: SecurityManager,
    containerManager: ContainerManager
  ) {
    this.wss = wss;
    this.security = security;
    this.containerManager = containerManager;
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      try {
        await this.handleConnection(ws, req);
      } catch (err: any) {
        console.error('[WS-Gateway] Connection setup failed:', err.message);
        ws.close(1011, 'Internal connection error');
      }
    });

    // Periodic heartbeat to prevent stale socket leaks
    setInterval(() => {
      this.activeConnections.forEach((ws, sessionId) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.ping();
          } catch {
            this.activeConnections.delete(sessionId);
          }
        } else {
          this.activeConnections.delete(sessionId);
        }
      });
    }, 30000);
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage) {
    // 1. Parse URL & Ticket parameter
    const fullUrl = `http://localhost${req.url || ''}`;
    const parsedUrl = new URL(fullUrl);
    const ticket = parsedUrl.searchParams.get('ticket');

    if (!ticket) {
      ws.close(4401, 'Authentication ticket is missing');
      return;
    }

    // 2. Cryptographic ticket verification
    const payload = this.security.verifyTicket(ticket);
    if (!payload) {
      ws.close(4401, 'Invalid or expired connection ticket');
      return;
    }

    const { sessionId } = payload;

    // 3. Verify container is provisioned and running
    const container = this.containerManager.getContainerForSession(sessionId);
    if (!container || container.status !== 'running') {
      ws.close(4404, 'Sandbox container is not active or ready');
      return;
    }

    // 4. Close any previous open WS for this session
    const existingWs = this.activeConnections.get(sessionId);
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      existingWs.close(4000, 'Superseded by new terminal connection');
    }
    this.activeConnections.set(sessionId, ws);

    // 5. Attach container PTY execution stream
    const docker = DockerClientManager.getAdapter();
    const stream = await docker.attachTerminalStream(container.id);

    // 6. Pipe Container STDOUT -> WebSocket
    stream.stdout.on('data', (data: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // 7. Pipe WebSocket Inbound -> Container STDIN / Control
    ws.on('message', (data: any, isBinary: boolean) => {
      this.containerManager.touchActivity(sessionId);

      // Check if control JSON message
      if (!isBinary && typeof data === 'object') {
        try {
          const text = data.toString('utf-8');
          if (text.startsWith('{') && text.endsWith('}')) {
            const parsed = JSON.parse(text);
            if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
              stream.resize(parsed.cols, parsed.rows);
              return;
            }
            if (parsed.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              return;
            }
          }
        } catch {
          // Normal terminal input if not JSON
        }
      }

      // Normal keystroke or command input
      stream.stdin.write(data);
    });

    // 8. Handle socket disconnect & cleanup
    ws.on('close', () => {
      this.activeConnections.delete(sessionId);
      stream.destroy();
    });

    ws.on('error', (err) => {
      console.warn(`[WS-Gateway] WebSocket error on session ${sessionId}:`, err.message);
      this.activeConnections.delete(sessionId);
      stream.destroy();
    });
  }

  public getConnectedSessionsCount(): number {
    return this.activeConnections.size;
  }
}
