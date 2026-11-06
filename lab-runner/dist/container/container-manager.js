"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerManager = void 0;
const docker_client_1 = require("./docker-client");
const image_registry_1 = require("../config/image-registry");
class ContainerManager {
    docker;
    // Map of sessionId -> ContainerInfo
    sessionContainers = new Map();
    // Map of sessionId -> lastActivity timestamp
    sessionActivity = new Map();
    constructor() {
        this.docker = docker_client_1.DockerClientManager.getAdapter();
    }
    /**
     * Provision a strictly isolated container for a student lab session
     */
    async provision(req) {
        // 1. Strict whitelist validation: image must be in approved registry
        if (!image_registry_1.APPROVED_IMAGE_REGISTRY[req.profileId]) {
            throw new Error(`Profile "${req.profileId}" is not in the approved image registry.`);
        }
        const profile = (0, image_registry_1.getApprovedImageProfile)(req.profileId);
        // 2. Prevent duplicate running containers for the same session
        const existing = this.sessionContainers.get(req.sessionId);
        if (existing && existing.status === 'running') {
            const started = existing.startedAt || existing.createdAt;
            const durationMin = req.customMaxDurationMinutes || profile.defaultLimits.maxDurationMinutes;
            const expires = new Date(started.getTime() + durationMin * 60 * 1000);
            return {
                sessionId: req.sessionId,
                containerId: existing.id,
                status: existing.status,
                profileId: existing.profileId,
                startedAt: started.toISOString(),
                expiresAt: expires.toISOString(),
                limits: {
                    memoryMb: existing.limits.memoryMb,
                    nanoCpus: existing.limits.nanoCpus,
                    pidsLimit: existing.limits.pidsLimit,
                    maxDurationMinutes: durationMin,
                },
            };
        }
        // 3. Name container with deterministic secure pattern
        const containerName = `gdg_lab_${req.workshopId.slice(0, 8)}_${req.sessionId.slice(0, 8)}`;
        // 4. Create and start container through Docker adapter
        const container = await this.docker.createAndStartContainer({
            containerName,
            profile,
            sessionId: req.sessionId,
            studentId: req.studentId,
            workshopId: req.workshopId,
        });
        const now = Date.now();
        this.sessionContainers.set(req.sessionId, container);
        this.sessionActivity.set(req.sessionId, now);
        const durationMin = req.customMaxDurationMinutes || profile.defaultLimits.maxDurationMinutes;
        const expiresAt = new Date(now + durationMin * 60 * 1000);
        return {
            sessionId: req.sessionId,
            containerId: container.id,
            status: container.status,
            profileId: profile.id,
            startedAt: new Date(now).toISOString(),
            expiresAt: expiresAt.toISOString(),
            limits: {
                memoryMb: profile.defaultLimits.memoryMb,
                nanoCpus: profile.defaultLimits.nanoCpus,
                pidsLimit: profile.defaultLimits.pidsLimit,
                maxDurationMinutes: durationMin,
            },
        };
    }
    /**
     * Record activity timestamp for idle timeout tracking
     */
    touchActivity(sessionId) {
        this.sessionActivity.set(sessionId, Date.now());
    }
    getLastActivity(sessionId) {
        return this.sessionActivity.get(sessionId) || Date.now();
    }
    /**
     * Get status & telemetry metrics for a session
     */
    async getSessionStatus(sessionId) {
        const container = this.sessionContainers.get(sessionId);
        if (!container)
            return null;
        const stats = await this.docker.getContainerStats(container.id);
        return {
            sessionId,
            containerId: container.id,
            status: container.status,
            profileId: container.profileId,
            createdAt: container.createdAt,
            startedAt: container.startedAt,
            stoppedAt: container.stoppedAt,
            lastActivityAt: new Date(this.getLastActivity(sessionId)),
            metrics: stats || container.metrics,
            limits: container.limits,
        };
    }
    /**
     * Stop a session's container gracefully
     */
    async stopSession(sessionId) {
        const container = this.sessionContainers.get(sessionId);
        if (!container)
            return false;
        const stopped = await this.docker.stopContainer(container.id, 5);
        if (stopped) {
            container.status = 'stopped';
            container.stoppedAt = new Date();
        }
        return stopped;
    }
    /**
     * Terminate and purge container resources
     */
    async destroySession(sessionId) {
        const container = this.sessionContainers.get(sessionId);
        if (!container)
            return false;
        await this.docker.stopContainer(container.id, 2);
        await this.docker.removeContainer(container.id);
        this.sessionContainers.delete(sessionId);
        this.sessionActivity.delete(sessionId);
        return true;
    }
    /**
     * Get the underlying container ID for terminal stream attachment
     */
    getContainerForSession(sessionId) {
        return this.sessionContainers.get(sessionId) || null;
    }
    /**
     * List all currently active containers
     */
    getAllActiveSessions() {
        const list = [];
        this.sessionContainers.forEach((container, sessionId) => {
            list.push({
                sessionId,
                container,
                lastActivity: this.sessionActivity.get(sessionId) || Date.now(),
            });
        });
        return list;
    }
}
exports.ContainerManager = ContainerManager;
