import { prisma } from '@/lib/prisma';
import { RealtimeEventService } from './realtime-event.service';

export interface PresenceRecord {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  clientCount: number;
  lastHeartbeat: Date;
  connectedAt: Date;
}

export class PresenceService {
  /**
   * Heartbeat or initial connect. Increments tab/client counter if isNewClient is true.
   */
  static async recordHeartbeat(params: {
    workshopId: string;
    userId: string;
    isNewClient?: boolean;
    status?: 'ONLINE' | 'IDLE';
  }) {
    const { workshopId, userId, isNewClient = false, status = 'ONLINE' } = params;
    const now = new Date();

    const existing = await prisma.workshopPresence.findUnique({
      where: {
        unique_workshop_user_presence: {
          workshopId,
          userId,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
      },
    });

    let record;
    let wasOffline = false;

    if (!existing) {
      wasOffline = true;
      record = await prisma.workshopPresence.create({
        data: {
          workshopId,
          userId,
          status,
          clientCount: 1,
          lastHeartbeat: now,
          connectedAt: now,
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        },
      });
    } else {
      wasOffline = existing.status === 'OFFLINE';
      const newCount = isNewClient ? existing.clientCount + 1 : Math.max(1, existing.clientCount);

      record = await prisma.workshopPresence.update({
        where: { id: existing.id },
        data: {
          status,
          clientCount: newCount,
          lastHeartbeat: now,
          disconnectedAt: null,
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        },
      });
    }

    // Broadcast join event if user just came online
    if (wasOffline) {
      await RealtimeEventService.publish({
        workshopId,
        eventType: 'workshop:participant:joined',
        data: {
          userId: record.userId,
          name: record.user.name,
          email: record.user.email,
          role: record.user.role,
          status: record.status,
          connectedAt: record.connectedAt,
        },
      });
    }

    return record;
  }

  /**
   * Client tab/connection disconnects. Only marks OFFLINE when clientCount reaches 0.
   */
  static async recordDisconnect(workshopId: string, userId: string) {
    const existing = await prisma.workshopPresence.findUnique({
      where: {
        unique_workshop_user_presence: {
          workshopId,
          userId,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!existing) return null;

    const remainingClients = Math.max(0, existing.clientCount - 1);
    const now = new Date();

    if (remainingClients === 0) {
      const updated = await prisma.workshopPresence.update({
        where: { id: existing.id },
        data: {
          status: 'OFFLINE',
          clientCount: 0,
          disconnectedAt: now,
        },
      });

      // Broadcast participant left event
      await RealtimeEventService.publish({
        workshopId,
        eventType: 'workshop:participant:left',
        data: {
          userId,
          name: existing.user.name,
          role: existing.user.role,
          disconnectedAt: now,
        },
      });

      return updated;
    } else {
      // Still has other tabs open
      return prisma.workshopPresence.update({
        where: { id: existing.id },
        data: {
          clientCount: remainingClients,
        },
      });
    }
  }

  /**
   * Sweep stale presences where heartbeat is older than timeoutSeconds (default 45s)
   */
  static async cleanupStalePresences(workshopId?: string, timeoutSeconds: number = 45) {
    const threshold = new Date(Date.now() - timeoutSeconds * 1000);

    const staleRecords = await prisma.workshopPresence.findMany({
      where: {
        ...(workshopId ? { workshopId } : {}),
        status: { in: ['ONLINE', 'IDLE'] },
        lastHeartbeat: { lt: threshold },
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    const now = new Date();
    for (const record of staleRecords) {
      await prisma.workshopPresence.update({
        where: { id: record.id },
        data: {
          status: 'OFFLINE',
          clientCount: 0,
          disconnectedAt: now,
        },
      });

      await RealtimeEventService.publish({
        workshopId: record.workshopId,
        eventType: 'workshop:participant:left',
        data: {
          userId: record.userId,
          name: record.user.name,
          role: record.user.role,
          disconnectedAt: now,
          reason: 'HEARTBEAT_TIMEOUT',
        },
      });
    }

    return staleRecords.length;
  }

  /**
   * Get all participant presences for a workshop
   */
  static async getWorkshopPresences(workshopId: string) {
    // Run stale cleanup first
    await this.cleanupStalePresences(workshopId);

    const presences = await prisma.workshopPresence.findMany({
      where: { workshopId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // ONLINE comes first in sort or custom order
        { lastHeartbeat: 'desc' },
      ],
    });

    const summary = {
      online: presences.filter((p) => p.status === 'ONLINE').length,
      idle: presences.filter((p) => p.status === 'IDLE').length,
      offline: presences.filter((p) => p.status === 'OFFLINE').length,
      totalTracked: presences.length,
      participants: presences.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        email: p.user.email,
        avatar: p.user.avatar,
        role: p.user.role,
        status: p.status,
        clientCount: p.clientCount,
        lastHeartbeat: p.lastHeartbeat,
        connectedAt: p.connectedAt,
      })),
    };

    return summary;
  }
}
