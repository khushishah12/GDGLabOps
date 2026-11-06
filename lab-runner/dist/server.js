"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRunnerApp = createRunnerApp;
exports.startRunnerServer = startRunnerServer;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const auth_1 = require("./security/auth");
const container_manager_1 = require("./container/container-manager");
const ws_gateway_1 = require("./terminal/ws-gateway");
const ws_realtime_gateway_1 = require("./realtime/ws-realtime-gateway");
const reaper_1 = require("./monitoring/reaper");
const image_registry_1 = require("./config/image-registry");
function createRunnerApp(options = {}) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    const security = new auth_1.SecurityManager(options.secret);
    const containerManager = new container_manager_1.ContainerManager();
    // Middleware: Protect control-plane internal API routes
    const requireDaemonAuth = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!security.validateDaemonAuth(authHeader)) {
            return res.status(401).json({ error: 'Unauthorized: Invalid daemon secret' });
        }
        next();
    };
    // 1. Health & Readiness probes
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', service: 'gdg-labops-runner', timestamp: new Date() });
    });
    app.get('/ready', (_req, res) => {
        res.json({
            status: 'ready',
            activeSessions: containerManager.getAllActiveSessions().length,
            approvedProfiles: Object.keys(image_registry_1.APPROVED_IMAGE_REGISTRY),
        });
    });
    // 2. Metrics endpoint
    app.get('/api/v1/metrics', requireDaemonAuth, (_req, res) => {
        const active = containerManager.getAllActiveSessions();
        res.json({
            activeContainersCount: active.length,
            uptimeSeconds: Math.floor(process.uptime()),
            memoryUsage: process.memoryUsage(),
        });
    });
    // 3. Provisioning
    app.post('/api/v1/sessions/provision', requireDaemonAuth, async (req, res) => {
        try {
            const { sessionId, studentId, workshopId, profileId, customMaxDurationMinutes } = req.body;
            if (!sessionId || !studentId || !workshopId) {
                return res.status(400).json({ error: 'Missing required session parameters' });
            }
            const effectiveProfileId = profileId || 'ubuntu-fundamentals';
            const result = await containerManager.provision({
                sessionId,
                studentId,
                workshopId,
                profileId: effectiveProfileId,
                customMaxDurationMinutes,
            });
            // Generate initial connection ticket
            const ticket = security.generateTicket(sessionId, studentId, workshopId, effectiveProfileId);
            res.status(201).json({
                success: true,
                session: result,
                connection: {
                    ticket,
                    wsEndpoint: `/ws/terminal?ticket=${ticket}`,
                },
            });
        }
        catch (err) {
            console.error('[Runner] Provisioning failed:', err.message);
            res.status(400).json({ error: err.message });
        }
    });
    // 4. Session Query
    app.get('/api/v1/sessions/:id/status', requireDaemonAuth, async (req, res) => {
        try {
            const status = await containerManager.getSessionStatus(req.params.id);
            if (!status) {
                return res.status(404).json({ error: 'Session container not found' });
            }
            res.json({ success: true, session: status });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 5. Generate fresh ticket for reconnects
    app.post('/api/v1/tickets/generate', requireDaemonAuth, (req, res) => {
        try {
            const { sessionId, studentId, workshopId, profileId, ttlSeconds } = req.body;
            if (!sessionId || !studentId || !workshopId) {
                return res.status(400).json({ error: 'Missing ticket generation parameters' });
            }
            const ticket = security.generateTicket(sessionId, studentId, workshopId, profileId || 'ubuntu-fundamentals', ttlSeconds);
            res.json({
                success: true,
                ticket,
                wsEndpoint: `/ws/terminal?ticket=${ticket}`,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 6. Stop session
    app.post('/api/v1/sessions/:id/stop', requireDaemonAuth, async (req, res) => {
        try {
            const stopped = await containerManager.stopSession(req.params.id);
            res.json({ success: true, stopped });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 7. Destroy session
    app.delete('/api/v1/sessions/:id', requireDaemonAuth, async (req, res) => {
        try {
            const destroyed = await containerManager.destroySession(req.params.id);
            res.json({ success: true, destroyed });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 8. Workshop Real-Time Broadcast
    let realtimeGateway = null;
    app.post('/api/v1/events/broadcast', requireDaemonAuth, (req, res) => {
        try {
            const deliveredCount = realtimeGateway?.broadcast(req.body) || 0;
            res.json({ success: true, deliveredSockets: deliveredCount });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 9. Reaper setup
    let reaper = null;
    if (options.enableReaper !== false) {
        reaper = new reaper_1.SessionReaper(containerManager, { checkIntervalMs: 15000 });
        reaper.start();
    }
    const setRealtimeGateway = (gw) => {
        realtimeGateway = gw;
    };
    return { app, security, containerManager, reaper, setRealtimeGateway };
}
function startRunnerServer(port = 8080) {
    const { app, security, containerManager, reaper, setRealtimeGateway } = createRunnerApp();
    const server = http_1.default.createServer(app);
    const terminalWss = new ws_1.WebSocketServer({ noServer: true });
    new ws_gateway_1.TerminalWebSocketGateway(terminalWss, security, containerManager);
    const workshopWss = new ws_1.WebSocketServer({ noServer: true });
    const realtimeGateway = new ws_realtime_gateway_1.WorkshopRealtimeGateway(workshopWss, security);
    setRealtimeGateway(realtimeGateway);
    server.on('upgrade', (request, socket, head) => {
        try {
            const pathname = new URL(request.url || '', 'http://localhost').pathname;
            if (pathname === '/ws/terminal') {
                terminalWss.handleUpgrade(request, socket, head, (ws) => {
                    terminalWss.emit('connection', ws, request);
                });
            }
            else if (pathname === '/ws/workshop') {
                workshopWss.handleUpgrade(request, socket, head, (ws) => {
                    workshopWss.emit('connection', ws, request);
                });
            }
            else {
                socket.destroy();
            }
        }
        catch {
            socket.destroy();
        }
    });
    server.listen(port, () => {
        console.log(`[GDG LabOps Runner] Execution Plane listening on port ${port}`);
        console.log(`[GDG LabOps Runner] WebSocket Terminal Gateway at ws://localhost:${port}/ws/terminal`);
        console.log(`[GDG LabOps Runner] WebSocket Real-Time Gateway at ws://localhost:${port}/ws/workshop`);
    });
    // Graceful shutdown handling
    const shutdown = async () => {
        console.log('[GDG LabOps Runner] Shutting down gracefully...');
        reaper?.stop();
        server.close(() => {
            console.log('[GDG LabOps Runner] Server terminated.');
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    return { server, app, containerManager, reaper };
}
// Auto-run if executed directly
if (require.main === module) {
    const port = parseInt(process.env.RUNNER_PORT || '8080', 10);
    startRunnerServer(port);
}
