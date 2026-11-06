"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalWebSocketGateway = void 0;
const ws_1 = require("ws");
const url_1 = require("url");
const docker_client_1 = require("../container/docker-client");
class TerminalWebSocketGateway {
    wss;
    security;
    containerManager;
    activeConnections = new Map();
    constructor(wss, security, containerManager) {
        this.wss = wss;
        this.security = security;
        this.containerManager = containerManager;
        this.initialize();
    }
    initialize() {
        this.wss.on('connection', async (ws, req) => {
            try {
                await this.handleConnection(ws, req);
            }
            catch (err) {
                console.error('[WS-Gateway] Connection setup failed:', err.message);
                ws.close(1011, 'Internal connection error');
            }
        });
        // Periodic heartbeat to prevent stale socket leaks
        setInterval(() => {
            this.activeConnections.forEach((ws, sessionId) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    try {
                        ws.ping();
                    }
                    catch {
                        this.activeConnections.delete(sessionId);
                    }
                }
                else {
                    this.activeConnections.delete(sessionId);
                }
            });
        }, 30000);
    }
    async handleConnection(ws, req) {
        // 1. Parse URL & Ticket parameter
        const fullUrl = `http://localhost${req.url || ''}`;
        const parsedUrl = new url_1.URL(fullUrl);
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
        if (existingWs && existingWs.readyState === ws_1.WebSocket.OPEN) {
            existingWs.close(4000, 'Superseded by new terminal connection');
        }
        this.activeConnections.set(sessionId, ws);
        // 5. Attach container PTY execution stream
        const docker = docker_client_1.DockerClientManager.getAdapter();
        const stream = await docker.attachTerminalStream(container.id);
        // 6. Pipe Container STDOUT -> WebSocket
        stream.stdout.on('data', (data) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(data);
            }
        });
        // 7. Pipe WebSocket Inbound -> Container STDIN / Control
        ws.on('message', (data, isBinary) => {
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
                }
                catch {
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
    getConnectedSessionsCount() {
        return this.activeConnections.size;
    }
}
exports.TerminalWebSocketGateway = TerminalWebSocketGateway;
