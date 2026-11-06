import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { SecurityManager } from './security/auth';
import { ContainerManager } from './container/container-manager';
import { TerminalWebSocketGateway } from './terminal/ws-gateway';
import { WorkshopRealtimeGateway } from './realtime/ws-realtime-gateway';
import { SessionReaper } from './monitoring/reaper';
import { APPROVED_IMAGE_REGISTRY } from './config/image-registry';

export function createRunnerApp(options: {
  secret?: string;
  enableReaper?: boolean;
} = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const security = new SecurityManager(options.secret);
  const containerManager = new ContainerManager();

  // Middleware: Protect control-plane internal API routes
  const requireDaemonAuth = (req: Request, res: Response, next: NextFunction) => {
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
      approvedProfiles: Object.keys(APPROVED_IMAGE_REGISTRY),
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
    } catch (err: any) {
      console.error('[Runner] Provisioning failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // 4. Session Query
  app.get('/api/v1/sessions/:id/status', requireDaemonAuth, async (req, res) => {
    try {
      const status = await containerManager.getSessionStatus(req.params.id as string);
      if (!status) {
        return res.status(404).json({ error: 'Session container not found' });
      }
      res.json({ success: true, session: status });
    } catch (err: any) {
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

      const ticket = security.generateTicket(
        sessionId,
        studentId,
        workshopId,
        profileId || 'ubuntu-fundamentals',
        ttlSeconds
      );

      res.json({
        success: true,
        ticket,
        wsEndpoint: `/ws/terminal?ticket=${ticket}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Stop session
  app.post('/api/v1/sessions/:id/stop', requireDaemonAuth, async (req, res) => {
    try {
      const stopped = await containerManager.stopSession(req.params.id as string);
      res.json({ success: true, stopped });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Destroy session
  app.delete('/api/v1/sessions/:id', requireDaemonAuth, async (req, res) => {
    try {
      const destroyed = await containerManager.destroySession(req.params.id as string);
      res.json({ success: true, destroyed });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Workshop Real-Time Broadcast
  let realtimeGateway: WorkshopRealtimeGateway | null = null;
  app.post('/api/v1/events/broadcast', requireDaemonAuth, (req, res) => {
    try {
      const deliveredCount = realtimeGateway?.broadcast(req.body) || 0;
      res.json({ success: true, deliveredSockets: deliveredCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Reaper setup
  let reaper: SessionReaper | null = null;
  if (options.enableReaper !== false) {
    reaper = new SessionReaper(containerManager, { checkIntervalMs: 15000 });
    reaper.start();
  }

  const setRealtimeGateway = (gw: WorkshopRealtimeGateway) => {
    realtimeGateway = gw;
  };

  return { app, security, containerManager, reaper, setRealtimeGateway };
}

export function startRunnerServer(port: number = 8080) {
  const { app, security, containerManager, reaper, setRealtimeGateway } = createRunnerApp();
  const server = http.createServer(app);

  const terminalWss = new WebSocketServer({ noServer: true });
  new TerminalWebSocketGateway(terminalWss, security, containerManager);

  const workshopWss = new WebSocketServer({ noServer: true });
  const realtimeGateway = new WorkshopRealtimeGateway(workshopWss, security);
  setRealtimeGateway(realtimeGateway);

  server.on('upgrade', (request, socket, head) => {
    try {
      const pathname = new URL(request.url || '', 'http://localhost').pathname;
      if (pathname === '/ws/terminal') {
        terminalWss.handleUpgrade(request, socket, head, (ws) => {
          terminalWss.emit('connection', ws, request);
        });
      } else if (pathname === '/ws/workshop') {
        workshopWss.handleUpgrade(request, socket, head, (ws) => {
          workshopWss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch {
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
