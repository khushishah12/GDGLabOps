# GDG LabOps — Real-Time Monitoring & Collaboration Architecture

This document describes the design, event flow, security model, and deployment topology of the **Real-Time Workshop Monitoring & Collaboration Engine** implemented in **Prompt 8**.

---

## 1. Architectural Overview

GDG LabOps uses a decoupled event-driven architecture separated into three tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS CONTROL PLANE                    │
│   (Vercel / Cloud Run: App Router, Auth.js, Neon PostgreSQL)│
│                                                             │
│   - Organiser Live Monitoring Dashboard                     │
│   - Student Lab Workspace & Help Modal                      │
│   - Announcement Engine & Activity Timeline                 │
│   - In-App Notification Center                              │
│   - SSE Real-Time Stream (/api/workshops/[id]/events/stream)│
└──────────────┬──────────────────────────────▲───────────────┘
               │ Event Outbox                 │
               │ Persistence                  │ Outbox Replay /
               │ & Internal Dispatch          │ Heartbeat Updates
               ▼                              │
┌──────────────────────────────┐              │
│       NEON POSTGRESQL        │              │
│  - workshop_presences        │──────────────┘
│  - workshop_announcements    │
│  - help_requests & messages  │
│  - workshop_activities       │
│  - realtime_event_outbox     │
│  - notifications             │
└──────────────┬───────────────┘
               │
               │ HTTP Webhook Dispatch (/api/v1/events/broadcast)
               ▼
┌─────────────────────────────────────────────────────────────┐
│              STANDALONE REAL-TIME & LAB RUNNER              │
│           (Linux Cloud VM / Docker / Port 8080)             │
│                                                             │
│   - /ws/terminal: Interactive PTY/Terminal Stream           │
│   - /ws/workshop: Real-Time Event & Presence Gateway        │
│   - Room Management: workshop:<id>, workshop:<id>:orgs      │
│   - Container Lifecycle Events (started, stopped, expired)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Event Flow & Transactional Integrity

All state transitions follow a strict **persisted-before-broadcast** sequence:

1. **User Action / Service Event**:
   - Organiser posts announcement or replies to a ticket.
   - Student submits challenge or connects to workshop.
   - Container starts, stops, or expires in execution plane.
2. **Server-Side Validation**:
   - RBAC check (organisers belong to the workshop's organisation; students own their ticket).
   - Zod schema validation.
3. **Database Transaction / Persistence**:
   - Record created in Neon PostgreSQL (`WorkshopAnnouncement`, `HelpRequest`, `StudentProgress`, `WorkshopActivity`).
   - Transactional Outbox record written to `RealtimeEventOutbox` with unique UUID.
4. **Real-Time Distribution**:
   - Event dispatched in-process to active Server-Sent Event (SSE) connections.
   - Event pushed to Standalone WebSocket Gateway via authenticated HTTP bearer token.
   - Gateway broadcasts only to authorised rooms:
     - `workshop:<workshopId>`: All registered students and organisers.
     - `workshop:<workshopId>:organisers`: Organiser-only ticket updates.
     - `user:<userId>`: Private notifications and personal ticket replies.
5. **Client State Update**:
   - React components re-render without page refresh.

---

## 3. Student Presence Engine

- **Presence States**: `ONLINE`, `IDLE`, `OFFLINE`.
- **Multi-Tab Support**: `clientCount` tracks simultaneous browser tabs/devices. Disconnecting one tab decrements the count without prematurely marking the student `OFFLINE`.
- **Heartbeat & Sweep**:
  - Heartbeat sent every 20s.
  - Periodic background reaper marks stale heartbeats (> 45s without ping) as `OFFLINE`.
- **Anti-Inference Guarantee**: An active Docker container is **never** treated as proof that a student is actively viewing the workshop. Presence requires authenticated browser heartbeats.

---

## 4. Student Help Request System & IDOR Defense

- **Categories**:
  - `ENVIRONMENT_NOT_LAUNCHING`
  - `TERMINAL_NOT_WORKING`
  - `COMMAND_ISSUE`
  - `INSTRUCTIONS_UNCLEAR`
  - `CONCEPTUAL_QUESTION`
  - `OTHER`
- **Statuses**: `OPEN` → `ACKNOWLEDGED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`.
- **Multi-Tenant / IDOR Defense**:
  - Students querying `/api/workshops/[id]/help-requests` only receive their own tickets.
  - Organisers querying the endpoint receive all tickets for their organisation's workshops.
  - Threaded replies between student and instructor are strictly isolated.

---

## 5. Reconnection & Missed Event Replay

When a student experiences temporary network loss or browser refresh:
1. Client hook `useWorkshopRealtime` reconnects with exponential backoff.
2. On reconnect, the client requests missed events:
   `GET /api/workshops/[id]/events/history?since=<lastSyncTimestamp>`
3. Backend fetches from `realtime_event_outbox` where `createdAt > since` (filtered by workshop and target user).
4. Client replays missed announcements, replies, and notifications seamlessly.

---

## 6. Real-Time Event Catalog

| Event Name | Recipient Room | Description |
|---|---|---|
| `workshop:participant:joined` | `workshop:<id>` | User came online |
| `workshop:participant:left` | `workshop:<id>` | User went offline / timed out |
| `workshop:announcement:published` | `workshop:<id>` | Instructor broadcasted announcement |
| `workshop:activity:new` | `workshop:<id>` | New timeline activity entry |
| `workshop:progress:updated` | `workshop:<id>` | Student completed challenge |
| `workshop:help-request:created` | `workshop:<id>:organisers` | Student opened a support ticket |
| `workshop:help-request:updated` | `workshop:<id>` & student | Status updated / assigned / resolved |
| `workshop:help-request:message` | Ticket participants | Threaded message response |
| `workshop:notification:new` | `user:<userId>` | Targeted in-app notification |
| `lab:session:provisioning` | `workshop:<id>` | Container allocation started |
| `lab:session:started` | `workshop:<id>` | Cloud sandbox container running |
| `lab:session:stopped` | `workshop:<id>` | Container stopped by user/organiser |
| `lab:session:expired` | `workshop:<id>` | Lease timeout reached |
| `lab:session:failed` | `workshop:<id>` | Container provisioning error |

---

## 7. Deployment Configuration

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://...neondb?sslmode=require"
DIRECT_URL="postgresql://...neondb?sslmode=require"

# Real-Time & Runner Gateway
RUNNER_SERVICE_URL="http://localhost:8080"
RUNNER_SECRET="gdg-labops-daemon-secret-2026"
```

### Running the Services
1. **Control Plane (Next.js)**:
   ```bash
   npm run dev
   # Accessible at http://localhost:3000
   ```
2. **Standalone Runner & Real-Time Gateway**:
   ```bash
   cd lab-runner
   npm run build
   node dist/server.js
   # Listens on port 8080: /ws/terminal and /ws/workshop
   ```
