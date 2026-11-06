'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeEventPayload, WorkshopEventType } from '@/lib/services/realtime-event.service';

export interface UseWorkshopRealtimeOptions {
  workshopId: string;
  userId?: string;
  role?: string;
  onEvent?: (event: RealtimeEventPayload) => void;
  onAnnouncement?: (announcement: any) => void;
  onActivity?: (activity: any) => void;
  onProgress?: (progress: any) => void;
  onHelpRequest?: (helpRequest: any) => void;
  onHelpMessage?: (message: any) => void;
  onPresenceChange?: (presence: any) => void;
  onNotification?: (notification: any) => void;
}

export function useWorkshopRealtime(options: UseWorkshopRealtimeOptions) {
  const {
    workshopId,
    userId,
    onEvent,
    onAnnouncement,
    onActivity,
    onProgress,
    onHelpRequest,
    onHelpMessage,
    onPresenceChange,
    onNotification,
  } = options;

  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>('CONNECTING');
  const [lastEventAt, setLastEventAt] = useState<string>(new Date().toISOString());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastSyncTimeRef = useRef<string>(new Date().toISOString());

  // 1. Send Presence Heartbeats
  useEffect(() => {
    if (!workshopId || !userId) return;

    // Initial presence connect
    fetch(`/api/workshops/${workshopId}/presence?newClient=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ONLINE' }),
    }).catch(() => {});

    // Periodic heartbeat every 20 seconds
    const interval = setInterval(() => {
      const isVisible = document.visibilityState === 'visible';
      fetch(`/api/workshops/${workshopId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isVisible ? 'ONLINE' : 'IDLE' }),
      }).catch(() => {});
    }, 20000);

    // Disconnect cleanup on tab close
    const handleUnload = () => {
      navigator.sendBeacon(`/api/workshops/${workshopId}/presence/disconnect`);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      fetch(`/api/workshops/${workshopId}/presence/disconnect`, {
        method: 'POST',
      }).catch(() => {});
    };
  }, [workshopId, userId]);

  // 2. Replay missed events after reconnection
  const fetchMissedEvents = useCallback(async () => {
    if (!workshopId) return;
    try {
      const res = await fetch(
        `/api/workshops/${workshopId}/events/history?since=${encodeURIComponent(lastSyncTimeRef.current)}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.events)) {
          for (const ev of json.data.events) {
            handleIncomingEvent(ev);
          }
        }
      }
    } catch {
      // Replay failure fallback
    }
  }, [workshopId]);

  // 3. Central Event Dispatcher
  const handleIncomingEvent = useCallback(
    (event: RealtimeEventPayload) => {
      lastSyncTimeRef.current = event.timestamp || new Date().toISOString();
      setLastEventAt(lastSyncTimeRef.current);

      if (onEvent) onEvent(event);

      switch (event.eventType) {
        case 'workshop:announcement:published':
          if (onAnnouncement) onAnnouncement(event.data);
          break;
        case 'workshop:activity:new':
          if (onActivity) onActivity(event.data);
          break;
        case 'workshop:progress:updated':
          if (onProgress) onProgress(event.data);
          break;
        case 'workshop:help-request:created':
        case 'workshop:help-request:updated':
          if (onHelpRequest) onHelpRequest(event.data);
          break;
        case 'workshop:help-request:message':
          if (onHelpMessage) onHelpMessage(event.data);
          break;
        case 'workshop:participant:joined':
        case 'workshop:participant:left':
        case 'workshop:presence:sync':
          if (onPresenceChange) onPresenceChange(event.data);
          break;
        case 'workshop:notification:new':
          if (onNotification) onNotification(event.data);
          break;
      }
    },
    [onEvent, onAnnouncement, onActivity, onProgress, onHelpRequest, onHelpMessage, onPresenceChange, onNotification]
  );

  // 4. Connect SSE Stream with Automatic Reconnect
  useEffect(() => {
    if (!workshopId) return;

    let active = true;

    const connectSSE = () => {
      if (!active) return;

      setConnectionState((prev) => (prev === 'OFFLINE' ? 'RECONNECTING' : 'CONNECTING'));

      const sse = new EventSource(`/api/workshops/${workshopId}/events/stream`);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        if (!active) return;
        setConnectionState('CONNECTED');
        setReconnectAttempts(0);
        // Replay missed events that occurred while disconnected
        fetchMissedEvents();
      };

      sse.onmessage = (e) => {
        if (!active) return;
        try {
          const payload = JSON.parse(e.data);
          if (payload.eventType) {
            handleIncomingEvent(payload);
          }
        } catch {
          // non-JSON heartbeat
        }
      };

      sse.onerror = () => {
        if (!active) return;
        sse.close();
        setConnectionState('OFFLINE');
        setReconnectAttempts((prev) => prev + 1);

        // Exponential backoff reconnect: 2s, 4s, 8s (max 10s)
        const delay = Math.min(10000, 2000 * Math.pow(1.5, reconnectAttempts));
        setTimeout(() => {
          if (active) connectSSE();
        }, delay);
      };
    };

    connectSSE();

    return () => {
      active = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [workshopId, fetchMissedEvents, handleIncomingEvent, reconnectAttempts]);

  return {
    connectionState,
    lastEventAt,
    reconnect: fetchMissedEvents,
  };
}
