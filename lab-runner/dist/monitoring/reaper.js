"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionReaper = void 0;
class SessionReaper {
    containerManager;
    timer = null;
    config;
    onReapCallback;
    constructor(containerManager, config = {}, onReap) {
        this.containerManager = containerManager;
        this.config = {
            checkIntervalMs: config.checkIntervalMs || 15000,
            enabled: config.enabled ?? true,
        };
        this.onReapCallback = onReap;
    }
    start() {
        if (!this.config.enabled || this.timer)
            return;
        this.timer = setInterval(async () => {
            await this.runReapCycle();
        }, this.config.checkIntervalMs);
        console.log(`[SessionReaper] Started reaper interval (${this.config.checkIntervalMs}ms)`);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log('[SessionReaper] Stopped reaper');
        }
    }
    async runReapCycle() {
        const active = this.containerManager.getAllActiveSessions();
        const now = Date.now();
        let reapedCount = 0;
        for (const item of active) {
            const { sessionId, container, lastActivity } = item;
            if (container.status !== 'running')
                continue;
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
exports.SessionReaper = SessionReaper;
