import { ContainerManager } from '../container/container-manager';

export interface ReaperConfig {
  checkIntervalMs: number; // e.g. 15000 (15 seconds)
  enabled: boolean;
}

export type ReaperCallback = (
  sessionId: string,
  reason: 'MAX_DURATION_EXCEEDED' | 'IDLE_TIMEOUT_EXCEEDED'
) => void;

export class SessionReaper {
  private containerManager: ContainerManager;
  private timer: NodeJS.Timeout | null = null;
  private config: ReaperConfig;
  private onReapCallback?: ReaperCallback;

  constructor(
    containerManager: ContainerManager,
    config: Partial<ReaperConfig> = {},
    onReap?: ReaperCallback
  ) {
    this.containerManager = containerManager;
    this.config = {
      checkIntervalMs: config.checkIntervalMs || 15000,
      enabled: config.enabled ?? true,
    };
    this.onReapCallback = onReap;
  }

  public start() {
    if (!this.config.enabled || this.timer) return;

    this.timer = setInterval(async () => {
      await this.runReapCycle();
    }, this.config.checkIntervalMs);

    console.log(`[SessionReaper] Started reaper interval (${this.config.checkIntervalMs}ms)`);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[SessionReaper] Stopped reaper');
    }
  }

  public async runReapCycle(): Promise<number> {
    const active = this.containerManager.getAllActiveSessions();
    const now = Date.now();
    let reapedCount = 0;

    for (const item of active) {
      const { sessionId, container, lastActivity } = item;
      if (container.status !== 'running') continue;

      const startedAt = (container.startedAt || container.createdAt).getTime();
      const maxDurationMs = container.limits.maxDurationMinutes * 60 * 1000;
      const idleTimeoutMs = container.limits.idleTimeoutMinutes * 60 * 1000;

      // Check max duration hard cap
      if (now - startedAt > maxDurationMs) {
        console.warn(`[SessionReaper] Session ${sessionId} exceeded max duration (${container.limits.maxDurationMinutes}m). Reaping...`);
        await this.containerManager.destroySession(sessionId);
        this.onReapCallback?.(sessionId, 'MAX_DURATION_EXCEEDED');
        reapedCount++;
        continue;
      }

      // Check idle timeout
      if (now - lastActivity > idleTimeoutMs) {
        console.warn(`[SessionReaper] Session ${sessionId} idle for > ${container.limits.idleTimeoutMinutes}m. Reaping...`);
        await this.containerManager.destroySession(sessionId);
        this.onReapCallback?.(sessionId, 'IDLE_TIMEOUT_EXCEEDED');
        reapedCount++;
      }
    }

    return reapedCount;
  }
}
