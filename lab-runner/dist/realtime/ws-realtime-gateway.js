"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkshopRealtimeGateway = void 0;
const ws_1 = require("ws");
const url_1 = require("url");
class WorkshopRealtimeGateway {
    wss;
    security;
    // Map of client contexts by WebSocket
    clients = new Map();
    // Map of room name -> Set of WebSockets
    rooms = new Map();
    constructor(wss, security) {
        this.wss = wss;
        this.security = security;
        this.init();
    }
    init() {
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        // Periodic heartbeat cleaner: disconnect sockets dead > 60s
        setInterval(() => {
            const threshold = Date.now() - 60000;
            for (const [ws, ctx] of this.clients.entries()) {
                if (ctx.lastPing.getTime() < threshold) {
                    try {
                        ws.terminate();
                    }
                    catch {
                        // ignore
                    }
                    this.handleDisconnect(ws);
                }
            }
        }, 15000);
    }
    handleConnection(ws, req) {
        try {
            const reqUrl = req.url || '';
            const parsedUrl = new url_1.URL(reqUrl, 'http://localhost');
            const workshopId = parsedUrl.searchParams.get('workshopId');
            const userId = parsedUrl.searchParams.get('userId');
            const role = (parsedUrl.searchParams.get('role') || 'STUDENT');
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
            const clientContext = {
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
            ws.send(JSON.stringify({
                type: 'gateway:connected',
                workshopId,
                userId,
                role,
                timestamp: new Date().toISOString(),
            }));
            // Handle incoming messages
            ws.on('message', (data) => {
                this.handleMessage(ws, data);
            });
            ws.on('close', () => {
                this.handleDisconnect(ws);
            });
            ws.on('error', () => {
                this.handleDisconnect(ws);
            });
        }
        catch (err) {
            console.error('[WorkshopRealtimeGateway] Connection handshake error:', err.message);
            try {
                ws.close(1011, 'Handshake failure');
            }
            catch {
                // ignore
            }
        }
    }
    handleMessage(ws, data) {
        const ctx = this.clients.get(ws);
        if (!ctx)
            return;
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'ping' || msg.type === 'heartbeat') {
                ctx.lastPing = new Date();
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            }
        }
        catch {
            // non-JSON frame
        }
    }
    handleDisconnect(ws) {
        const ctx = this.clients.get(ws);
        if (!ctx)
            return;
        this.leaveRoom(`workshop:${ctx.workshopId}`, ws);
        this.leaveRoom(`workshop:${ctx.workshopId}:organisers`, ws);
        this.leaveRoom(`user:${ctx.userId}`, ws);
        this.clients.delete(ws);
    }
    joinRoom(room, ws) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        this.rooms.get(room).add(ws);
    }
    leaveRoom(room, ws) {
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
    broadcast(event) {
        let targetRoomName = `workshop:${event.workshopId}`;
        if (event.targetRoom === 'organisers') {
            targetRoomName = `workshop:${event.workshopId}:organisers`;
        }
        else if (event.targetRoom === 'user' && event.targetUserId) {
            targetRoomName = `user:${event.targetUserId}`;
        }
        const recipients = this.rooms.get(targetRoomName);
        if (!recipients || recipients.size === 0) {
            return 0;
        }
        const payloadStr = JSON.stringify(event);
        let sentCount = 0;
        for (const ws of recipients) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    ws.send(payloadStr);
                    sentCount++;
                }
                catch {
                    // ignore dead socket
                }
            }
        }
        return sentCount;
    }
    getConnectedCount(workshopId) {
        if (workshopId) {
            return this.rooms.get(`workshop:${workshopId}`)?.size || 0;
        }
        return this.clients.size;
    }
}
exports.WorkshopRealtimeGateway = WorkshopRealtimeGateway;
