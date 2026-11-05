# GDG LabOps — REST API Documentation

> **Base URL:** `/api`  
> **Protocol:** HTTP/1.1 over TLS  
> **Content-Type:** `application/json`  
> **Version:** 1.0.0  

---

## 1. Global API Conventions

### 1.1. Response Format
All route handlers follow a standardized envelope structure for predictable client consumption.

#### Success Envelope (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message"
}
```

#### Error Envelope (`4xx Client Error`, `5xx Server Error`):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | CONFLICT | FORBIDDEN | RESOURCE_EXHAUSTED | INTERNAL_ERROR",
    "message": "Human-readable explanation of error",
    "details": [ ... ]
  }
}
```

### 1.2. HTTP Status Code Conventions
| Status Code | Reason | Domain Error Class |
| :--- | :--- | :--- |
| `200 OK` | Successful query or idempotent update | — |
| `201 Created` | Entity successfully provisioned | — |
| `400 Bad Request` | Zod validation failure or capacity exhausted | `ValidationError`, `ResourceExhaustedError` |
| `401 Unauthorized` | Missing or invalid authentication token | `UnauthorizedError` |
| `403 Forbidden` | Authenticated user lacks permission | `ForbiddenError` |
| `404 Not Found` | Entity with specified UUID not found | `NotFoundError` |
| `409 Conflict` | Unique constraint violated (e.g. duplicate slug or registration) | `ConflictError` |
| `500 Server Error` | Unhandled runtime exception | `InternalServerError` |

---

## 2. Organisations API

### 2.1. List Organisations
- **Endpoint:** `GET /api/organisations`
- **Query Parameters:**
  - `search` *(string, optional)*: Filter by organisation name or slug.

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "a0000000-0000-4000-8000-000000000001",
      "name": "GDG on Campus Silicon Valley",
      "slug": "gdg-silicon-valley",
      "description": "Premier Google Developer Groups on Campus chapter focusing on Cloud, AI and Web technologies.",
      "logo": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=128&h=128&fit=crop",
      "createdAt": "2026-11-05T00:00:00.000Z",
      "updatedAt": "2026-11-05T00:00:00.000Z",
      "_count": {
        "members": 4,
        "workshops": 3,
        "labTemplates": 3
      }
    }
  ]
}
```

---

### 2.2. Create Organisation
- **Endpoint:** `POST /api/organisations`
- **Request Body:**
```json
{
  "name": "GDG on Campus Berlin",
  "slug": "gdg-berlin",
  "description": "Developer chapter in Berlin focused on Kubernetes and Cloud Architecture.",
  "logo": "https://example.com/logo.png"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "c1111111-2222-3333-4444-555555555555",
    "name": "GDG on Campus Berlin",
    "slug": "gdg-berlin",
    "description": "Developer chapter in Berlin focused on Kubernetes and Cloud Architecture.",
    "logo": "https://example.com/logo.png",
    "createdAt": "2026-11-05T12:00:00.000Z",
    "updatedAt": "2026-11-05T12:00:00.000Z"
  },
  "message": "Organisation created successfully"
}
```

---

### 2.3. Get Organisation by ID
- **Endpoint:** `GET /api/organisations/:id`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "a0000000-0000-4000-8000-000000000001",
    "name": "GDG on Campus Silicon Valley",
    "slug": "gdg-silicon-valley",
    "description": "Premier Google Developer Groups on Campus chapter.",
    "logo": "https://example.com/logo.png",
    "workshops": [],
    "labTemplates": [],
    "_count": {
      "members": 4,
      "workshops": 3
    }
  }
}
```

---

## 3. Workshops API

### 3.1. List Workshops
- **Endpoint:** `GET /api/workshops`
- **Query Parameters:**
  - `status` *(string, optional)*: Filter by `DRAFT`, `PUBLISHED`, `ONGOING`, `COMPLETED`, `CANCELLED`
  - `domain` *(string, optional)*: Filter by domain (e.g. `Cloud`, `Cybersecurity`)
  - `organisationId` *(UUID, optional)*: Filter by organisation ID
  - `search` *(string, optional)*: Match title, description, or registration code

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "b0000000-0000-4000-8000-000000000001",
      "title": "Cloud Native Microservices with Docker & Kubernetes",
      "slug": "cloud-native-microservices-2026",
      "domain": "Cloud Infrastructure",
      "status": "PUBLISHED",
      "startDate": "2026-11-15T10:00:00.000Z",
      "endDate": "2026-11-15T14:00:00.000Z",
      "duration": 240,
      "registrationDeadline": "2026-11-14T23:59:59.000Z",
      "participantLimit": 45,
      "registrationCode": "GDG-K8S-2026",
      "organisation": {
        "id": "a0000000-0000-4000-8000-000000000001",
        "name": "GDG on Campus Silicon Valley"
      },
      "organiser": {
        "id": "00000000-0000-4000-8000-000000000002",
        "name": "Sarah Connor",
        "email": "sarah.connor@gdgcampus.dev"
      },
      "_count": {
        "registrations": 3,
        "workshopLabs": 1,
        "labSessions": 2
      }
    }
  ]
}
```

---

### 3.2. Create Workshop
- **Endpoint:** `POST /api/workshops`
- **Request Body:**
```json
{
  "organisationId": "a0000000-0000-4000-8000-000000000001",
  "organiserId": "00000000-0000-4000-8000-000000000002",
  "title": "Zero Trust Security & Incident Response",
  "slug": "zero-trust-secops-2026",
  "description": "Hands-on threat containment, firewall configuration and audit forensics.",
  "domain": "Cybersecurity",
  "bannerUrl": "https://example.com/banner.jpg",
  "startDate": "2026-12-01T10:00:00.000Z",
  "endDate": "2026-12-01T13:00:00.000Z",
  "duration": 180,
  "registrationDeadline": "2026-11-30T23:59:59.000Z",
  "participantLimit": 60,
  "registrationCode": "GDG-SEC-2026",
  "labTemplateIds": [
    "c0000000-0000-4000-8000-000000000002"
  ]
}
```

#### Validation Invariants:
- `endDate` must be chronologically after `startDate`.
- `registrationDeadline` must be less than or equal to `startDate`.
- `registrationCode` must be uppercase alphanumeric (e.g. `GDG-SEC-2026`).

#### Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "b1111111-3333-4444-5555-666666666666",
    "title": "Zero Trust Security & Incident Response",
    "slug": "zero-trust-secops-2026",
    "status": "DRAFT",
    "registrationCode": "GDG-SEC-2026",
    "createdAt": "2026-11-05T12:00:00.000Z"
  },
  "message": "Workshop created successfully as DRAFT"
}
```

---

### 3.3. Get Workshop by ID
- **Endpoint:** `GET /api/workshops/:id`
- **Response (`200 OK`):**
Returns workshop entity with full lab templates, challenges, registrations count, and active session metrics.

---

### 3.4. Workshop Lifecycle State Actions
- **Publish Workshop:** `POST /api/workshops/:id/publish`
  - Validates that the workshop has at least one associated `WorkshopLab`.
  - Sets `status` to `PUBLISHED`.
- **Cancel Workshop:** `POST /api/workshops/:id/cancel`
  - Sets `status` to `CANCELLED` and marks active lab sessions for orderly termination.

---

### 3.5. Register for Workshop
- **Endpoint:** `POST /api/workshops/register`
- **Request Body (Direct or Event Code):**
```json
{
  "registrationCode": "GDG-K8S-2026",
  "studentId": "00000000-0000-4000-8000-000000000003"
}
```
*Or with explicit workshop ID:*
```json
{
  "workshopId": "b0000000-0000-4000-8000-000000000001",
  "studentId": "00000000-0000-4000-8000-000000000003"
}
```

#### Enforcement Logic:
1. **Duplicate Prevention**: Rejects with `409 Conflict` if the student is already enrolled.
2. **Deadline Check**: Rejects with `400 Bad Request` if `now() > registrationDeadline`.
3. **Capacity Check**: Rejects or waitlists with `400 Bad Request` if `registrationsCount >= participantLimit`.

#### Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "r1111111-2222-3333-4444-555555555555",
    "workshopId": "b0000000-0000-4000-8000-000000000001",
    "studentId": "00000000-0000-4000-8000-000000000003",
    "status": "REGISTERED",
    "attendanceStatus": "ABSENT",
    "registeredAt": "2026-11-05T12:00:00.000Z"
  },
  "message": "Registered successfully for workshop: Cloud Native Microservices with Docker & Kubernetes"
}
```

---

## 4. Lab Templates & Challenges API

### 4.1. List Lab Templates
- **Endpoint:** `GET /api/templates`
- **Query Parameters:**
  - `domain` *(string)*
  - `difficulty` *(`BEGINNER`, `INTERMEDIATE`, `ADVANCED`)*
  - `organisationId` *(UUID)*
  - `search` *(string)*

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "c0000000-0000-4000-8000-000000000001",
      "name": "Docker & Container Basics",
      "domain": "DevOps & Containers",
      "difficulty": "BEGINNER",
      "estimatedDuration": 60,
      "environmentType": "terminal",
      "learningObjectives": [
        "Inspect container namespaces and cgroups",
        "Build multi-stage production Dockerfiles",
        "Mount volumes and configure non-root users"
      ],
      "prerequisites": ["Basic Unix CLI knowledge"],
      "status": "PUBLISHED",
      "_count": {
        "challenges": 2,
        "workshopLabs": 1,
        "labSessions": 2
      }
    }
  ]
}
```

---

### 4.2. Create Lab Template
- **Endpoint:** `POST /api/templates`
- **Request Body:**
```json
{
  "organisationId": "a0000000-0000-4000-8000-000000000001",
  "createdBy": "00000000-0000-4000-8000-000000000002",
  "name": "Linux Security & Hardening",
  "description": "Practical Linux filesystem permissions, sudoers configuration and SSH hardening.",
  "domain": "Cybersecurity",
  "difficulty": "INTERMEDIATE",
  "estimatedDuration": 90,
  "environmentType": "terminal",
  "learningObjectives": [
    "Configure secure file permissions with chmod/chown",
    "Restrict SSH root login and password auth",
    "Audit process memory using ps and procfs"
  ],
  "prerequisites": ["Familiarity with bash commands"]
}
```

---

### 4.3. List Challenges for a Template
- **Endpoint:** `GET /api/challenges?labTemplateId=c0000000-0000-4000-8000-000000000001`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "d0000000-0000-4000-8000-000000000001",
      "labTemplateId": "c0000000-0000-4000-8000-000000000001",
      "title": "Build a Secure Distroless Node.js Image",
      "description": "Construct a minimal Docker image without shell or package managers.",
      "instructions": "1. Inspect Dockerfile.secure\n2. Run `docker build -t app:v1 .`\n3. Verify non-root user execution",
      "difficulty": "BEGINNER",
      "points": 100,
      "timeLimit": 30,
      "displayOrder": 1,
      "evaluationType": "COMMAND_EXIT_CODE",
      "status": "ACTIVE",
      "tasks": [
        {
          "id": "e0000000-0000-4000-8000-000000000001",
          "title": "Verify Non-Root User",
          "taskType": "PROCESS_CHECK",
          "evaluationConfig": {
            "ruleType": "PROCESS_STATUS",
            "processName": "node"
          },
          "points": 50
        }
      ]
    }
  ]
}
```

---

### 4.4. Create Predefined Challenge Task
- **Endpoint:** `POST /api/challenges/:id/tasks`
- **Request Body (Structured Assertion Schema):**
```json
{
  "challengeId": "d0000000-0000-4000-8000-000000000001",
  "title": "Verify File Permissions on /app/config.json",
  "description": "Ensure configuration file has strict 640 octal permissions",
  "taskType": "FILE_CHECK",
  "evaluationConfig": {
    "ruleType": "FILE_PERMISSIONS",
    "targetPath": "/app/config.json",
    "expectedOctalPermissions": "0640",
    "expectedGroup": "appuser"
  },
  "points": 50,
  "displayOrder": 2
}
```

---

## 5. Lab Sessions API

### 5.1. Allocate / Start Lab Session
- **Endpoint:** `POST /api/sessions`
- **Request Body:**
```json
{
  "studentId": "00000000-0000-4000-8000-000000000003",
  "workshopId": "b0000000-0000-4000-8000-000000000001",
  "labTemplateId": "c0000000-0000-4000-8000-000000000001"
}
```

#### Enforcement:
- Validates student is enrolled in the workshop.
- Verifies session state machine transitions.
- Yields a client-safe proxy `accessUrl`.
- **Excludes `containerReference` from the response.**

#### Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "s1111111-2222-3333-4444-555555555555",
    "studentId": "00000000-0000-4000-8000-000000000003",
    "workshopId": "b0000000-0000-4000-8000-000000000001",
    "labTemplateId": "c0000000-0000-4000-8000-000000000001",
    "status": "RUNNING",
    "accessUrl": "https://proxy.labops.dev/session/s1111111-2222-3333-4444-555555555555",
    "startedAt": "2026-11-05T12:00:00.000Z",
    "expiresAt": "2026-11-05T14:00:00.000Z"
  },
  "message": "Lab session provisioned and ready"
}
```

---

### 5.2. Update Lab Session State
- **Endpoint:** `PATCH /api/sessions/:id`
- **Request Body:**
```json
{
  "status": "COMPLETED"
}
```

#### Valid State Machine Transitions:
- `PENDING` ➔ `PROVISIONING` \| `FAILED` \| `TERMINATED`
- `PROVISIONING` ➔ `RUNNING` \| `FAILED` \| `TERMINATED`
- `RUNNING` ➔ `COMPLETED` \| `FAILED` \| `TERMINATED` \| `EXPIRED`
- `FAILED` ➔ `TERMINATED`
- `COMPLETED` ➔ *(Terminal state; cannot be altered)*
- `TERMINATED` ➔ *(Terminal state)*
- `EXPIRED` ➔ `TERMINATED`

Any illegal transition returns `400 Bad Request`.

---

## 6. Student Portal API

### 6.1. Get Student Profile & Overall Metrics
- **Endpoint:** `GET /api/student/profile?studentId=00000000-0000-4000-8000-000000000003`

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "00000000-0000-4000-8000-000000000003",
    "name": "Alex Chen",
    "email": "alex.chen@student.gdg.dev",
    "role": "STUDENT",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop",
    "enrolledWorkshopsCount": 3,
    "totalPoints": 420,
    "completedLabsCount": 3,
    "achievementsCount": 2,
    "recentProgress": [
      {
        "workshop": {
          "title": "Cloud Native Microservices with Docker & Kubernetes",
          "slug": "cloud-native-microservices-2026"
        },
        "labTemplate": {
          "name": "Docker & Container Basics"
        },
        "completionPercentage": 100,
        "totalPoints": 200
      }
    ]
  }
}
```

---

### 6.2. Get Student Enrolled Workshops
- **Endpoint:** `GET /api/student/workshops?studentId=00000000-0000-4000-8000-000000000003`
- Returns array of enrolled workshops with dates, status, domain, and progress percentages.

---

### 6.3. Get Student Unlocked Achievements
- **Endpoint:** `GET /api/student/achievements?studentId=00000000-0000-4000-8000-000000000003`
- Returns earned badges with award dates alongside all available achievements in the catalog.

---

## 7. Workshop & Event Management APIs (Prompt 5)

### 7.1. List Workshops with Advanced Query Filters
- **Endpoint:** `GET /api/workshops`
- **Query Parameters:**
  - `domain` *(string, optional)*: Filter by technical domain (e.g. `Cloud Computing`, `DevOps`, `Cybersecurity`)
  - `difficulty` *(string, optional)*: `BEGINNER` | `INTERMEDIATE` | `ADVANCED`
  - `venueType` *(string, optional)*: `ONLINE` | `OFFLINE` | `HYBRID`
  - `status` *(string, optional)*: `DRAFT` | `PUBLISHED` | `REGISTRATION_CLOSED` | `FULL` | `ONGOING` | `COMPLETED` | `CANCELLED`
  - `isPublic` *(boolean, optional)*: Filter by public discovery listing
  - `search` *(string, optional)*: Case-insensitive match on title, description, or event code
  - `page` *(number, optional, default: 1)*
  - `limit` *(number, optional, default: 20)*

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "dbbbf7dd-562e-44c9-ad97-439886fb056d",
      "title": "Hands-on Linux & Cloud Shell Mastery",
      "slug": "hands-on-linux-cloud-shell-mastery",
      "domain": "DevOps",
      "difficulty": "BEGINNER",
      "status": "PUBLISHED",
      "registrationCode": "GDG-LNX-2026",
      "codeJoinEnabled": true,
      "participantLimit": 50,
      "confirmedRegistrations": 42,
      "waitlistedRegistrations": 0,
      "duration": 120,
      "startDate": "2026-11-20T14:00:00.000Z",
      "endDate": "2026-11-20T16:00:00.000Z",
      "venueType": "ONLINE"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

### 7.2. Workshop Duplicate & Unpublish
- **Duplicate Endpoint:** `POST /api/workshops/:id/duplicate`
  - Clones workshop parameters and blueprints into a fresh `DRAFT` with a new slug and unique event code.
- **Unpublish Endpoint:** `POST /api/workshops/:id/unpublish`
  - Reverts a `PUBLISHED` workshop to `DRAFT`.
  - **Constraint:** Strictly returns `409 Conflict` if any confirmed registrations exist (`confirmedRegistrations > 0`).

---

### 7.3. Event Joining Code Operations
- **Regenerate Code:** `POST /api/workshops/:id/code/regenerate`
  - Generates a fresh cryptographic joining code using non-ambiguous characters.
- **Toggle Code Joining:** `PATCH /api/workshops/:id/code/toggle`
  - Body: `{ "enabled": boolean }`
- **Rate-Limited Code Lookup:** `GET /api/workshops/code/:code`
  - Resolves workshop metadata for student preview. Rate limited to 10 requests per 5 minutes per IP.

---

### 7.4. Student Workshop Registration
- **Endpoint:** `POST /api/workshops/register`
- **Request Body (Direct or Code):**
```json
{
  "workshopId": "dbbbf7dd-562e-44c9-ad97-439886fb056d",
  "registrationCode": "GDG-LNX-2026",
  "studentId": "00000000-0000-4000-8000-000000000003",
  "notes": "Looking forward to learning POSIX shell commands."
}
```
- **Behavior:**
  - If seats available: assigns `REGISTERED`.
  - If capacity reached: assigns `WAITLISTED`.
  - If approval required: assigns `PENDING_APPROVAL`.
  - If already registered: returns `409 Conflict`.

---

### 7.5. Participant Self-Cancellation & Automatic Waitlist Promotion
- **Endpoint:** `DELETE /api/workshops/registrations/:id`
- **Behavior:**
  - Updates student registration to `CANCELLED`.
  - If the cancelled seat was confirmed, automatically queries the oldest waitlisted registration (`registeredAt ASC`) and promotes them to `REGISTERED`.

---

### 7.6. Organiser Participant Management & CSV Export
- **List Participants:** `GET /api/workshops/:id/participants?status=REGISTERED&search=Elena`
- **Manage Participant:** `PATCH /api/workshops/:id/participants/:regId`
  - Body: `{ "action": "APPROVE" | "REJECT" | "CANCEL", "notes": "Optional reason" }`
  - Writes audit record to `AuditLog`.
- **Export Participant CSV:** `GET /api/workshops/:id/participants/export`
  - Returns `text/csv` stream with headers: `Participant Name, Email Address, Registration Date (UTC), Status, Attendance, Notes`.

---

## 8. Lab Template Library & Challenge Builder APIs (Prompt 6)

### 8.1. List Lab Templates
- **Endpoint:** `GET /api/templates`
- **Query Parameters:** `domain`, `difficulty`, `status`, `organisationId`, `search`
- **Response:** List of templates with challenge counts and attached workshop counts.

### 8.2. Create Lab Template
- **Endpoint:** `POST /api/templates`
- **Body:**
```json
{
  "organisationId": "a0000000-0000-4000-8000-000000000001",
  "name": "Linux Permissions & Hardening Workshop",
  "shortDescription": "Auditing and securing Linux access controls",
  "description": "## Objectives\nComprehensive security walkthrough...",
  "domain": "Cybersecurity",
  "difficulty": "INTERMEDIATE",
  "estimatedDuration": 60,
  "environmentType": "terminal",
  "learningObjectives": ["Master octal permissions", "Audit shadow files"],
  "prerequisites": ["Basic command line familiarity"],
  "tags": ["linux", "security"],
  "requiredTools": [{ "name": "bash", "version": "5.0+" }],
  "status": "DRAFT"
}
```

### 8.3. Template Actions
- **Get Details:** `GET /api/templates/:id`
- **Update Template:** `PATCH /api/templates/:id` (automatically increments `version`)
- **Delete Template:** `DELETE /api/templates/:id` (blocked if attached to active workshops)
- **Deep Clone Template:** `POST /api/templates/:id/duplicate` (clones template and all challenges as `DRAFT`)
- **Publish Template:** `POST /api/templates/:id/publish` (validates >= 1 challenge and objectives)
- **Archive Template:** `POST /api/templates/:id/archive`
- **Organiser Preview:** `GET /api/templates/:id/preview?instructorMode=true`
- **Template Analytics:** `GET /api/templates/:id/analytics`

### 8.4. Challenge Milestone Operations
- **List Challenges:** `GET /api/templates/:id/challenges` (student view sanitizes `solutionData`)
- **Create Challenge:** `POST /api/templates/:id/challenges`
  - Supports 5 types: `MULTIPLE_CHOICE`, `SHORT_ANSWER`, `CODE_KNOWLEDGE`, `GUIDED_TASK`, `RESEARCH_REFLECTION`
- **Reorder Challenges:** `PATCH /api/templates/:id/challenges`
  - Body: `{ "orderedIds": ["uuid-1", "uuid-2", ...] }`
- **Get Challenge:** `GET /api/challenges/:id` (sanitized for students)
- **Update Challenge:** `PATCH /api/challenges/:id`
- **Delete Challenge:** `DELETE /api/challenges/:id` (renumbers remaining challenges)

### 8.5. Safe Challenge Submission & Evaluation
- **Endpoint:** `POST /api/challenges/:id/submit`
- **Body:**
```json
{
  "workshopId": "uuid-workshop",
  "answer": "opt-640",
  "usedHintIds": ["hint-1"]
}
```
- **Behavior:**
  - Evaluates submission purely on the server.
  - Applies progressive hint score deduction (capped at 50% max).
  - Anti-score-inflation idempotency: repeated passing submissions do not award duplicate points.
  - Updates `StudentProgress` (`challengeProgress`, `completionPercentage`, `totalPoints`).
  - Returns `{ passed: true, score: 90, pointsAwarded: 90, feedback: "...", unlockedExplanation: "..." }`.

### 8.6. Workshop Lab Attachment & Snapshot Strategy
- **List Workshop Labs:** `GET /api/workshops/:id/labs`
- **Attach Lab Template:** `POST /api/workshops/:id/labs`
  - Body: `{ "labTemplateId": "uuid", "isRequired": true, "createSnapshot": true }`
  - Stores immutable `labSnapshot` JSON freezing the template & challenges.
- **Reorder Workshop Labs:** `PATCH /api/workshops/:id/labs`
  - Body: `{ "orderedTemplateIds": ["uuid-1", "uuid-2"] }`
- **Detach Lab:** `DELETE /api/workshops/:id/labs/:labId`
- **Sync Snapshot:** `POST /api/workshops/:id/labs/:labId` with `{ "action": "sync_snapshot" }`
- **Student Workshop Lab Workspace:** `GET /api/student/workshops/:workshopId/labs/:labId`
  - Verifies registration, delivers sanitized challenges, and student's progress tracking.

---

## 9. Cloud Lab Execution Engine API (Prompt 7)

### 9.1. Launch Remote Lab Environment
- **Endpoint:** `POST /api/sessions`
- **Authentication:** Student Session or API Token
- **Body:**
```json
{
  "workshopId": "dbbbf7dd-562e-44c9-ad97-439886fb056d",
  "labTemplateId": "c0000000-0000-4000-8000-000000000001",
  "environmentProfile": "ubuntu-fundamentals"
}
```
- **Validation & Quota Enforcement:**
  - Verifies student registration in workshop (`REGISTERED` or `ATTENDED`).
  - Verifies workshop is `PUBLISHED` or `ONGOING`.
  - Enforces per-student concurrent quota (max 1 active lab). Returns existing session if already launched for the same lab.
- **Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "e4567890-1234-4567-8901-234567890123",
    "workshopId": "dbbbf7dd-562e-44c9-ad97-439886fb056d",
    "labTemplateId": "c0000000-0000-4000-8000-000000000001",
    "status": "RUNNING",
    "environmentProfile": "ubuntu-fundamentals",
    "startedAt": "2026-11-05T14:00:00.000Z",
    "expiresAt": "2026-11-05T15:00:00.000Z",
    "connectionTicket": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accessUrl": "ws://runner.labops.internal:8080/ws/terminal?ticket=...",
    "resourceLimits": {
      "memoryMb": 512,
      "nanoCpus": 1000000000,
      "pidsLimit": 64,
      "maxDurationMinutes": 60
    }
  },
  "message": "Lab environment provisioned and ready"
}
```

---

### 9.2. Session Query & Heartbeat Keepalive
- **Get Active Session:** `GET /api/sessions`
  - Returns current user's active `PROVISIONING` or `RUNNING` lab session.
- **Get Session Details & Live Telemetry:** `GET /api/sessions/:id`
  - Returns session status, remaining lease duration, and live CPU/memory telemetry.
- **Heartbeat Keepalive:** `POST /api/sessions/:id/heartbeat`
  - Updates `lastActivityAt`. Prevents idle cleanup.
- **Refresh Connection Ticket:** `POST /api/sessions/:id/ticket`
  - Mints fresh single-use ticket for WebSocket reconnection after tab refresh.

---

### 9.3. Terminate Session
- **Student Stop:** `DELETE /api/sessions/:id`
  - Reclaims container resources, marks status `TERMINATED` with `terminationReason: "STUDENT_STOPPED"`.
- **Organiser Emergency Kill:** `POST /api/organiser/sessions/:sessionId/terminate`
  - Requires `ORGANISER` role. Reclaims container with `terminationReason: "ADMIN_TERMINATED"`.

---

### 9.4. Organiser Workshop Session Telemetry
- **Endpoint:** `GET /api/organiser/workshops/:workshopId/sessions`
- **Requires:** Organiser membership in workshop's organisation.
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "e4567890-1234-4567-8901-234567890123",
      "studentName": "Alex Chen",
      "studentEmail": "alex.chen@student.gdg.org",
      "labName": "Docker & Container Basics",
      "status": "RUNNING",
      "environmentProfile": "ubuntu-fundamentals",
      "startedAt": "2026-11-05T14:00:00.000Z",
      "expiresAt": "2026-11-05T15:00:00.000Z",
      "createdAt": "2026-11-05T13:59:50.000Z"
    }
  ]
}
```
