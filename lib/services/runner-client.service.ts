/**
 * GDG LabOps - Control Plane Runner Client Service
 *
 * Manages authenticated service-to-service communication between
 * the Next.js Control Plane and remote Execution Plane nodes.
 */

import { APPROVED_IMAGE_REGISTRY, ApprovedImageProfile, getApprovedImageProfile } from '@/lib/runner/image-registry';
import crypto from 'crypto';

export interface ProvisionResponse {
  success: boolean;
  session: {
    sessionId: string;
    containerId: string;
    status: string;
    profileId: string;
    startedAt: string;
    expiresAt: string;
    limits: {
      memoryMb: number;
      nanoCpus: number;
      pidsLimit: number;
      maxDurationMinutes: number;
    };
  };
  connection: {
    ticket: string;
    wsEndpoint: string;
  };
}

export interface ContainerStatusResponse {
  success: boolean;
  session: {
    sessionId: string;
    containerId: string;
    status: string;
    profileId: string;
    createdAt: string;
    startedAt?: string;
    stoppedAt?: string;
    lastActivityAt?: string;
    metrics: {
      cpuPercent: number;
      memoryUsageMb: number;
      pidsCount: number;
    };
    limits: any;
  };
}

export class RunnerClientService {
  private static runnerBaseUrl = process.env.RUNNER_DAEMON_URL || 'http://localhost:8080';
  private static runnerSecret = process.env.WORKER_DAEMON_SECRET || 'gdg-labops-daemon-hmac-shared-cluster-key';
  private static publicWsBase = process.env.RUNNER_PUBLIC_WS_URL || 'ws://localhost:8080/ws/terminal';

  // Fallback in-memory state for development when external daemon is offline
  private static devFallbackSessions: Map<string, any> = new Map();

  /**
   * Request remote runner to provision an isolated container
   */
  public static async provision(params: {
    sessionId: string;
    studentId: string;
    workshopId: string;
    profileId: string;
    customMaxDurationMinutes?: number;
  }): Promise<ProvisionResponse> {
    const profile = getApprovedImageProfile(params.profileId);

    try {
      const response = await fetch(`${this.runnerBaseUrl}/api/v1/sessions/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.runnerSecret}`,
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(6000), // 6 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Runner provisioning failed [${response.status}]: ${errorText}`);
      }

      return await response.json();
    } catch (err: any) {
      // In local dev/testing without active daemon process, supply reliable simulation
      if (err.code === 'ECONNREFUSED' || err.name === 'TimeoutError' || err.message?.includes('fetch failed')) {
        return this.createFallbackProvision(params, profile);
      }
      throw err;
    }
  }

  /**
   * Query status & live resource metrics from runner
   */
  public static async getStatus(sessionId: string): Promise<ContainerStatusResponse | null> {
    try {
      const response = await fetch(`${this.runnerBaseUrl}/api/v1/sessions/${sessionId}/status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.runnerSecret}`,
        },
        signal: AbortSignal.timeout(3000),
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Runner status failed: ${response.statusText}`);

      return await response.json();
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.name === 'TimeoutError' || err.message?.includes('fetch failed')) {
        return this.getFallbackStatus(sessionId);
      }
      return null;
    }
  }

  /**
   * Stop container execution
   */
  public static async stop(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.runnerBaseUrl}/api/v1/sessions/${sessionId}/stop`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.runnerSecret}`,
        },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = await response.json();
        return data.stopped ?? true;
      }
      return false;
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.name === 'TimeoutError' || err.message?.includes('fetch failed')) {
        const session = this.devFallbackSessions.get(sessionId);
        if (session) {
          session.status = 'stopped';
          session.stoppedAt = new Date().toISOString();
        }
        return true;
      }
      return false;
    }
  }

  /**
   * Terminate and destroy container
   */
  public static async destroy(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.runnerBaseUrl}/api/v1/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.runnerSecret}`,
        },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        return true;
      }
      return false;
    } catch (err: any) {
      this.devFallbackSessions.delete(sessionId);
      return true;
    }
  }

  /**
   * Mint a signed, single-use ticket for establishing terminal WebSocket
   */
  public static generateTicket(
    sessionId: string,
    studentId: string,
    workshopId: string,
    profileId: string,
    ttlSeconds: number = 300
  ): { ticket: string; wsUrl: string } {
    const payload = {
      sessionId,
      studentId,
      workshopId,
      profileId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.runnerSecret)
      .update(encodedPayload)
      .digest('base64url');

    const ticket = `${encodedPayload}.${signature}`;
    const wsUrl = `${this.publicWsBase}?ticket=${ticket}`;

    return { ticket, wsUrl };
  }

  // --- Fallback Handlers for Offline Dev Mode ---
  private static createFallbackProvision(
    params: {
      sessionId: string;
      studentId: string;
      workshopId: string;
      profileId: string;
      customMaxDurationMinutes?: number;
    },
    profile: ApprovedImageProfile
  ): ProvisionResponse {
    const durationMin = params.customMaxDurationMinutes || profile.defaultLimits.maxDurationMinutes;
    const now = Date.now();
    const expiresAt = new Date(now + durationMin * 60 * 1000).toISOString();
    const startedAt = new Date(now).toISOString();
    const containerId = `dev_c_${params.sessionId.slice(0, 8)}_${Math.random().toString(36).substring(2, 7)}`;

    const { ticket, wsUrl } = this.generateTicket(
      params.sessionId,
      params.studentId,
      params.workshopId,
      profile.id
    );

    const sessionData = {
      sessionId: params.sessionId,
      containerId,
      status: 'running',
      profileId: profile.id,
      createdAt: startedAt,
      startedAt,
      expiresAt,
      lastActivityAt: startedAt,
      limits: {
        memoryMb: profile.defaultLimits.memoryMb,
        nanoCpus: profile.defaultLimits.nanoCpus,
        pidsLimit: profile.defaultLimits.pidsLimit,
        maxDurationMinutes: durationMin,
      },
      metrics: {
        cpuPercent: 1.2,
        memoryUsageMb: 54,
        pidsCount: 16,
      },
    };

    this.devFallbackSessions.set(params.sessionId, sessionData);

    return {
      success: true,
      session: {
        sessionId: params.sessionId,
        containerId,
        status: 'running',
        profileId: profile.id,
        startedAt,
        expiresAt,
        limits: sessionData.limits,
      },
      connection: {
        ticket,
        wsEndpoint: wsUrl,
      },
    };
  }

  private static getFallbackStatus(sessionId: string): ContainerStatusResponse | null {
    const session = this.devFallbackSessions.get(sessionId);
    if (!session) return null;
    return {
      success: true,
      session: {
        ...session,
        metrics: {
          cpuPercent: parseFloat((Math.random() * 2.5 + 0.5).toFixed(2)),
          memoryUsageMb: Math.round(50 + Math.random() * 15),
          pidsCount: 16,
        },
      },
    };
  }
}
