# GDG LabOps — Workshop & Event Management Architecture

**Platform Module**: Workshop & Event Management (Prompt 5)  
**Status**: Production Ready  
**Engine**: Next.js App Router, Neon PostgreSQL, Prisma ORM, Auth.js RBAC  

---

## 1. Architectural Overview

The Workshop & Event Management module provides a decoupled, secure control-plane orchestration layer designed specifically for Google Developer Groups (GDG) on Campus chapters. It enables chapter organisers to create, schedule, duplicate, and manage practical technical workshops while allowing students to discover, join, and track their participation through unique event codes.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GDG LabOps Control Plane                        │
├───────────────────────────────────┬────────────────────────────────────┤
│       Organiser Experience        │         Student Experience         │
│  - Workshop Builder & Scheduler   │  - Public Catalog (/student/explore│
│  - Unique Joining Code Engine     │  - Code Registration Modal         │
│  - Participant Roster & Approvals │  - My Registrations & Dashboard    │
│  - CSV Export & Audit Logging     │  - Automatic Waitlist Promotion    │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
                  ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Prisma ORM & Neon PostgreSQL                    │
│   - Workshop (Metadata, Capacity, Difficulty, Schedule, Venue)         │
│   - WorkshopRegistration (Atomic Transactions, Waitlist Queue)         │
│   - AuditLog (Full tracking of approvals, rejections, cancellations)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cryptographic Joining Code Engine

GDG LabOps uses cryptographically random event codes (e.g., `GDG-CLOUD-7X9P2`) formatted as `GDG-<DOMAIN>-<RANDOM>`:

1. **Non-Ambiguous Alphabet**: The random token generator uses a custom 31-character alphabet (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`) excluding visually confusable characters (`0`, `O`, `1`, `I`).
2. **Cryptographic Randomness**: Generated via Node.js `crypto.randomInt` rather than `Math.random()`.
3. **Collision Resistance & Verification**: Before persisting, the engine queries Neon PostgreSQL to guarantee absolute uniqueness across all workshops.
4. **Rate Limiting Protection**: The joining code lookup endpoint (`GET /api/workshops/code/[code]`) is protected by an in-memory sliding-window rate limiter (10 attempts per 5 minutes per IP address) to defeat automated brute-force and enumeration attacks.
5. **Code Lifecycle**: Organisers can regenerate event codes on demand or toggle code-based joining on/off without affecting confirmed participants.

---

## 3. Workshop Lifecycle State Machine

```
         ┌────────────┐
         │   DRAFT    │ ◄─── Duplicate Workshop
         └─────┬──────┘
               │ (Publish)
               ▼
         ┌────────────┐     Unpublish (Only if 0 confirmed)
         │ PUBLISHED  ├────────────────────────────────────► [DRAFT]
         └─────┬──────┘
               │ (At capacity)
               ▼
         ┌────────────┐
         │    FULL    │ ◄─── Capacity Reached (Enables Waitlist)
         └─────┬──────┘
               │ (Live session start)
               ▼
         ┌────────────┐
         │  ONGOING   │ ◄─── Docker sandboxes active
         └─────┬──────┘
               │ (End of duration)
               ▼
         ┌────────────┐
         │ COMPLETED  │
         └────────────┘

  * Any state except COMPLETED can transition to CANCELLED with audit reason.
```

### Unpublish Protection
To prevent disruption to students, **unpublishing a workshop back to DRAFT is strictly disallowed** if one or more confirmed registrations exist (`confirmedRegistrations > 0`). In this case, organisers must either cancel individual participants or formally cancel the workshop.

---

## 4. Student Registration Workflow & Waitlist Engine

The registration engine operates inside atomic Prisma transactions (`prisma.$transaction`) to eliminate race conditions under concurrent registration spikes:

### Registration States
- `REGISTERED`: Confirmed seat; container sandbox will be allocated for the student.
- `PENDING_APPROVAL`: Held for organiser review when `requiresApproval = true`.
- `WAITLISTED`: Assigned automatically when `confirmedRegistrations >= participantLimit`.
- `CANCELLED`: Student voluntarily withdrew or organiser cancelled seat.
- `REJECTED`: Organiser rejected the application.

### Automatic Waitlist Promotion
When a confirmed student cancels their registration (or an organiser cancels their seat):
1. The student registration is updated to `CANCELLED` with a `cancelledAt` timestamp.
2. The system checks if any students are in `WAITLISTED` status for that workshop, ordered by registration time (`registeredAt ASC`).
3. If a waitlisted student exists and the workshop does not require manual approval, the oldest waitlisted student is **automatically promoted** to `REGISTERED` status.
4. A system audit note is appended: `"Promoted from waitlist after participant cancellation"`.

---

## 5. Organiser Participant Management

Organisers manage their workshop roster through `/dashboard/workshops/[id]/participants`:

- **Real-Time Participant Roster**: Displays student name, email, avatar, registration time, status badge, attendance status, and notes.
- **Filters & Search**: Fast filtering by status (`ALL`, `REGISTERED`, `PENDING_APPROVAL`, `WAITLISTED`, `CANCELLED`) and real-time name/email substring search.
- **Approval Actions**: Single-click "Approve" (transitions `PENDING_APPROVAL` to `REGISTERED`) and "Reject".
- **Participant Cancellation**: Requires confirmation dialog with optional audit reason. Automatically promotes the next waitlisted student.
- **Sanitized CSV Export**:
  - Endpoint: `GET /api/workshops/[id]/participants/export`
  - Streams standard CSV format: `Participant Name, Email Address, Registration Date (UTC), Status, Attendance, Notes`.
  - Escapes quote marks and dangerous formula injection characters (`=`, `+`, `-`, `@`).
- **Audit Logging**: Every approval, rejection, and cancellation is permanently logged in the `AuditLog` table with user identity, timestamp, and metadata.

---

## 6. Multi-Tenant IDOR Defenses

GDG LabOps strictly isolates chapter data to prevent Insecure Direct Object Reference (IDOR) attacks:

1. **Chapter Membership Verification**: All modification routes invoke `requireOrganisationMembership(workshop.organisationId)`.
2. **Workshop Ownership Verification**: `requireWorkshopOwnership(workshopId)` ensures the requesting organiser belongs to the organisation owning the workshop or holds `SUPER_ADMIN` privileges.
3. **Session Binding**: Organisers cannot spoof `organiserId` or bypass chapter boundary checks.

---

## 7. API Reference

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/workshops` | `GET` | Public / Student | List workshops with category, difficulty, venue, and status filters |
| `/api/workshops` | `POST` | Organiser | Create a new workshop (Draft or Published) |
| `/api/workshops/[id]` | `GET` | Authenticated | Retrieve complete workshop details and statistics |
| `/api/workshops/[id]` | `PATCH` | Organiser | Update workshop attributes (metadata, capacity, schedule, status) |
| `/api/workshops/[id]` | `DELETE` | Organiser | Delete a draft workshop (only if 0 registrations) |
| `/api/workshops/[id]/unpublish` | `POST` | Organiser | Revert published workshop to Draft (prohibited if registrations exist) |
| `/api/workshops/[id]/duplicate` | `POST` | Organiser | Clone an existing workshop into a new Draft |
| `/api/workshops/[id]/code/regenerate` | `POST` | Organiser | Regenerate cryptographic event joining code |
| `/api/workshops/[id]/code/toggle` | `PATCH` | Organiser | Enable or disable code-based joining |
| `/api/workshops/[id]/participants` | `GET` | Organiser | List participant roster with search and status filtering |
| `/api/workshops/[id]/participants/export` | `GET` | Organiser | Stream sanitized CSV participant roster |
| `/api/workshops/[id]/participants/[regId]` | `PATCH` | Organiser | Approve, reject, or cancel participant with audit logging |
| `/api/workshops/register` | `POST` | Student | Register for workshop via workshopId or registrationCode |
| `/api/workshops/registrations/[regId]` | `DELETE` | Student | Cancel registration; triggers automatic waitlist promotion |
| `/api/workshops/code/[code]` | `GET` | Public / Rate-limited | Lookup workshop metadata by event code (10 req / 5m per IP) |
| `/api/dashboard/stats` | `GET` | Organiser | Aggregated real-time platform statistics from Neon PostgreSQL |
