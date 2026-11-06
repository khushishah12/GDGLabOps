import { prisma } from '@/lib/prisma';

export type WorkshopEventType =
  | 'workshop:participant:joined'
  | 'workshop:participant:left'
  | 'workshop:presence:sync'
  | 'workshop:announcement:published'
  | 'workshop:activity:new'
  | 'workshop:progress:updated'
  | 'workshop:help-request:created'
  | 'workshop:help-request:updated'
  | 'workshop:help-request:message'
  | 'workshop:notification:new'
  | 'lab:session:queued'
  | 'lab:session:provisioning'
  | 'lab:session:started'
  | 'lab:session:stopped'
  | 'lab:session:expired'
  | 'lab:session:failed';

export interface RealtimeEventPayload {
  eventId: string;
  workshopId: string;
  eventType: WorkshopEventType;
  targetUserId?: string | null;
  targetRoom?: 'all' | 'organisers' | 'user';
  timestamp: string;
  data: Record<string, any>;
}

// In-memory pub/sub listener registry for SSE streams and tests
type EventListener = (event: RealtimeEventPayload) => void;
const memoryListeners: Set<EventListener> = new Set();

export class RealtimeEventService {
  /**
   * Subscribe to in-process real-time event distribution (used by Next.js SSE streams)
   */
  static subscribe(listener: EventListener): () => void {
    memoryListeners.add(listener);
    return () => {
      memoryListeners.delete(listener);
    };
  }

  /**
   * Persist event to RealtimeEventOutbox and broadcast to subscribers and external gateway
   */
  static async publish(params: {
    workshopId: string;
    eventType: WorkshopEventType;
    data: Record<string, any>;
    targetUserId?: string | null;
    targetRoom?: 'all' | 'organisers' | 'user';
  }): Promise<RealtimeEventPayload> {
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const payload: RealtimeEventPayload = {
      eventId,
      workshopId: params.workshopId,
      eventType: params.eventType,
      targetUserId: params.targetUserId || null,
      targetRoom: params.targetRoom || 'all',
      timestamp,
      data: params.data,
    };

    // 1. Transactional Outbox persistence in Neon PostgreSQL
    try {
      await prisma.realtimeEventOutbox.create({
        data: {
          id: eventId,
          workshopId: params.workshopId,
          eventType: params.eventType,
          targetUserId: params.targetUserId || null,
          payload: payload as any,
          deliveredAt: new Date(),
        },
      });
    } catch (err: any) {
      console.error('[RealtimeEventService] Failed to persist outbox event:', err.message);
    }

    // 2. Dispatch to in-process SSE listeners
    memoryListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err: any) {
        console.error('[RealtimeEventService] Error in local listener:', err);
      }
    });

    // 3. Dispatch to external WebSocket Real-Time Gateway (if configured)
    const runnerUrl = process.env.RUNNER_SERVICE_URL || 'http://localhost:8080';
    const secret = process.env.RUNNER_SECRET || 'gdg-labops-daemon-secret-2026';

    try {
      fetch(`${runnerUrl}/api/v1/events/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Runner might not be active in pure local test or dev mode; fallback is graceful
      });
    } catch {
      // Ignore network transport failures to external runner
    }

    return payload;
  }

  /**
   * Replay missed events for a client reconnecting after a network interruption
   */
  static async getMissedEvents(
    workshopId: string,
    sinceTimestamp: string,
    targetUserId?: string
  ): Promise<RealtimeEventPayload[]> {
    const since = new Date(sinceTimestamp);
    if (isNaN(since.getTime())) {
      return [];
    }

    const where: any = {
      workshopId,
      createdAt: { gt: since },
    };

    if (targetUserId) {
      where.OR = [
        { targetUserId: null }, // broadcast to all
        { targetUserId },      // targeted to this specific user
      ];
    } else {
      where.targetUserId = null;
    }

    const records = await prisma.realtimeEventOutbox.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return records.map((r) => r.payload as unknown as RealtimeEventPayload);
  }
}
