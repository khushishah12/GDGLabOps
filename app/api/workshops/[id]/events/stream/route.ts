import { NextRequest } from 'next/server';
import { RealtimeEventService, RealtimeEventPayload } from '@/lib/services/realtime-event.service';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  const workshopId = params.id;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection beacon
      const initialChunk = `data: ${JSON.stringify({
        type: 'gateway:connected',
        workshopId,
        userId: user?.id || null,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialChunk));

      // 2. Subscribe to real-time events
      unsubscribe = RealtimeEventService.subscribe((event: RealtimeEventPayload) => {
        // Only deliver events for this workshop
        if (event.workshopId !== workshopId && event.workshopId !== 'global') {
          return;
        }

        // Targeted user check: if event is targeted to specific user, ensure match
        if (event.targetRoom === 'user' && event.targetUserId && event.targetUserId !== user?.id) {
          return;
        }

        // Organiser room check
        if (event.targetRoom === 'organisers' && user?.role === 'STUDENT') {
          return;
        }

        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might be closed
        }
      });

      // 3. Keepalive ping every 25 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 25000);

      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
