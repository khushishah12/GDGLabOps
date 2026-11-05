# GDG LabOps — Technical Workshop Infrastructure Platform

> **Empowering GDG on Campus organizers to deliver practical, zero-friction developer & cybersecurity workshops.**  
> Preconfigured browser-accessible sandbox environments, interactive challenges, live progress telemetry, and automated grading.

---

## 🌟 Overview

**GDG LabOps** is a production-grade workshop management and hands-on lab orchestration platform built for Google Developer Groups (GDG) on Campus and developer communities worldwide.

Traditional tech workshops suffer from the "installation nightmare" — participants spend 45+ minutes debugging OS incompatibilities, Docker daemon issues, and network proxies before writing a single line of code. GDG LabOps eliminates local setup entirely:

1. **Instant Browser Sandboxes**: Ephemeral, remote Linux containers running on an isolated execution plane.
2. **Interactive Technical Milestones**: Structured challenges evaluated in real-time without executing dangerous arbitrary scripts.
3. **Live Organiser Telemetry**: Real-time instructor oversight, student progress tracking, and automated completion verification.
4. **Multi-Chapter Support**: Scalable multi-tenant organisation structure for developer communities across campuses.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Control Plane Frontend** | [Next.js 14 (App Router)](https://nextjs.org/) | Modern React SSR/SSG framework, Route Handlers |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict end-to-end type safety |
| **Styling & Design System** | [Tailwind CSS](https://tailwindcss.com/) | Google-inspired enterprise developer UI |
| **Database** | [Neon PostgreSQL](https://neon.tech/) | Serverless PostgreSQL with auto-scaling compute |
| **ORM Layer** | [Prisma ORM 5.x](https://www.prisma.io/) | Schema modeling, connection pooling, and type generation |
| **Data Validation** | [Zod](https://zod.dev/) | Strict runtime input assertion and sanitization |
| **Icons & Visuals** | [Lucide React](https://lucide.dev/) | Clean developer-centric icon set |
| **Data Visualization** | [Recharts](https://recharts.org/) | Analytics, attendance, and session charts |
| **Execution Plane** *(Upcoming)* | Isolated Docker Host + Socket.IO | Remote Linux container sandboxes and streaming terminal |

---

## 🏗️ System Architecture

GDG LabOps implements a strict separation of concerns between the **Control Plane** (Next.js + Neon PostgreSQL) and the **Execution Plane** (Cloud-hosted Docker Daemon):

```
┌────────────────────────────────────────────────────────┐
│                   BROWSER CLIENTS                      │
│     Organisers, Students, Super Admins (Any OS)       │
└───────────────▲────────────────────────▲───────────────┘
                │ HTTPS                  │ WSS (Terminal)
┌───────────────▼──────────────┐         │
│     CONTROL PLANE (Vercel)    │         │
│   • Next.js App Router       │         │
│   • REST Route Handlers      │         │
│   • Role-Based Access        │         │
└───────────────▲──────────────┘         │
                │ PgBouncer              │
┌───────────────▼──────────────┐         │
│    NEON SERVERLESS POSTGRES  │         │
│   • 16 Relational Tables     │         │
│   • Auto-scaling Storage     │         │
└──────────────────────────────┘         │
                                         │
┌────────────────────────────────────────▼───────────────┐
│              EXECUTION PLANE (Cloud Linux)             │
│   • Secure Docker Daemon                               │
│   • Isolated Student Sandboxes (cgroups/namespaces)    │
│   • WebSocket Proxy Gateway                            │
└────────────────────────────────────────────────────────┘
```

For complete architectural specifications, see [ARCHITECTURE.md](file:///d:/projects/GDGLABOPS/ARCHITECTURE.md).

---

## 🗄️ Database Documentation

The platform features a fully-normalized PostgreSQL relational schema comprising 16 core entities:
- **Tenancy & Users**: `User`, `Organisation`, `OrganisationMembership`
- **Workshop Engine**: `Workshop`, `WorkshopRegistration`, `WorkshopLab`
- **Curriculum & Challenges**: `LabTemplate`, `Challenge`, `ChallengeTask`
- **Execution & Grading**: `LabSession`, `ChallengeSubmission`, `StudentProgress`
- **Gamification & Compliance**: `Achievement`, `UserAchievement`, `Notification`, `AuditLog`

Detailed documentation of all columns, foreign key cascades, unique indexes, and JSON schemas can be found in [DATABASE.md](file:///d:/projects/GDGLABOPS/DATABASE.md).

---

## 🚀 Getting Started

### 1. Clone the repository & install dependencies
```bash
git clone https://github.com/your-org/gdg-labops.git
cd gdg-labops
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate your Neon PostgreSQL pooled and direct connection strings:
```env
DATABASE_URL="postgresql://neondb_owner:YOUR_PWD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://neondb_owner:YOUR_PWD@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
```
*(For complete setup instructions, see [ENVIRONMENT_SETUP.md](file:///d:/projects/GDGLABOPS/ENVIRONMENT_SETUP.md)).*

### 3. Generate Prisma client & apply migrations
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Seed demo workshop catalog
```bash
npm run prisma:seed
```

### 5. Verify backend test suite
```bash
npx tsx scripts/test-backend.ts
```

### 6. Start development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the platform.

---

## 📁 Project Structure

```
d:/projects/GDGLABOPS/
├── app/
│   ├── api/                     # REST Route Handlers
│   │   ├── challenges/          # Challenge milestones & tasks
│   │   ├── organisations/       # Chapter management
│   │   ├── sessions/            # Sandbox session lifecycle
│   │   ├── student/             # Profile, enrollments, achievements
│   │   ├── templates/           # Reusable lab templates
│   │   └── workshops/           # Workshop events & registration
│   ├── dashboard/               # Organiser Control Plane UI
│   │   ├── analytics/
│   │   ├── challenges/
│   │   ├── environments/
│   │   ├── overview/
│   │   ├── participants/
│   │   ├── sessions/
│   │   ├── settings/
│   │   ├── team/
│   │   ├── templates/
│   │   └── workshops/
│   └── student/                 # Student Learning Hub UI
│       ├── challenges/
│       ├── explore/
│       ├── lab/
│       ├── leaderboard/
│       └── overview/
├── components/                  # Reusable UI component library
│   ├── ui/                      # Atoms (Buttons, Badges, Modals, Tables)
│   ├── layout/                  # Navigation, Sidebars, Topbars
│   ├── dashboard/               # Organiser specific widgets
│   └── student/                 # Student specific widgets
├── lib/                         # Server-only utilities & core logic
│   ├── env.ts                   # Environment variable validation
│   ├── prisma.ts                # Prisma Client singleton
│   ├── errors.ts                # Domain error classes & HTTP status codes
│   ├── api-response.ts          # Standard JSON envelope helpers
│   ├── validations/             # Zod input validation schemas
│   └── services/                # Decoupled backend business logic
├── prisma/
│   ├── schema.prisma            # PostgreSQL schema & model definitions
│   ├── migrations/              # Tracked SQL migration history
│   └── seed.ts                  # Idempotent demo database seeder
├── scripts/
│   └── test-backend.ts          # Backend validation & business logic tests
├── ARCHITECTURE.md              # System design & phased roadmap
├── DATABASE.md                  # Comprehensive database schema guide
├── API_DOCUMENTATION.md         # Full REST API specification
├── ENVIRONMENT_SETUP.md         # Neon setup & migration instructions
└── README.md                    # Project documentation
```

---

## 📡 API Reference Overview

The platform exposes an extensive REST API under `/api`. All endpoints return standardized JSON envelopes.

| Category | Method | Path | Description |
| :--- | :--- | :--- | :--- |
| **Organisations** | `GET` | `/api/organisations` | List chapters with filter & search |
| | `POST` | `/api/organisations` | Create new chapter |
| **Workshops** | `GET` | `/api/workshops` | Query workshops by status or domain |
| | `POST` | `/api/workshops` | Create draft workshop |
| | `POST` | `/api/workshops/:id/publish` | Publish workshop with validations |
| | `POST` | `/api/workshops/:id/cancel` | Cancel ongoing or published workshop |
| | `POST` | `/api/workshops/register` | Register student directly or via event code |
| **Templates** | `GET` | `/api/templates` | Catalog of lab blueprints |
| | `POST` | `/api/templates` | Create lab template |
| **Challenges** | `GET` | `/api/challenges` | Challenge milestones for a template |
| | `POST` | `/api/challenges/:id/tasks` | Add predefined evaluation assertions |
| **Sessions** | `POST` | `/api/sessions` | Allocate isolated sandbox session |
| | `PATCH` | `/api/sessions/:id` | Update status (enforces state machine) |
| **Student** | `GET` | `/api/student/profile` | Student dashboard statistics & badges |
| | `GET` | `/api/student/workshops` | Enrolled workshops & live progress |

For the complete API documentation with sample request and response payloads, see [API_DOCUMENTATION.md](file:///d:/projects/GDGLABOPS/API_DOCUMENTATION.md).

---

## 🛡️ Security Features

- **No Arbitrary Shell Scripts**: Evaluation tasks use strict predefined JSON rule schemas (`FILE_PERMISSIONS`, `PORT_LISTENING`, `PROCESS_STATUS`) rather than storing raw execution strings in the database.
- **Infrastructure Masking**: Internal container IDs (`containerReference`) are stripped from all client-facing responses.
- **Connection Isolation**: Next.js server queries route exclusively through Neon's PgBouncer connection pooler to prevent denial of service through connection exhaustion.
- **Database Boundary**: Prisma Client is strictly server-side and credentials are never bundled into client packages.

---

## 🗺️ Development Roadmap

- [x] **Prompt 1**: System Architecture & Technology Planning (`ARCHITECTURE.md`)
- [x] **Prompt 2**: Frontend Foundation & Enterprise UI Design System (Organiser + Student Portals)
- [x] **Prompt 3**: Backend Infrastructure, Neon PostgreSQL Integration & REST APIs (`DATABASE.md`, `API_DOCUMENTATION.md`, `ENVIRONMENT_SETUP.md`)
- [ ] **Prompt 4**: Authentication, Multi-Tenancy & Role-Based Access Control (NextAuth.js v5 / Auth.js)
- [ ] **Prompt 5**: Remote Execution Plane & Isolated Docker Container Daemon
- [ ] **Prompt 6**: Real-time Terminal, WebSockets & Automated Task Evaluation Engine
- [ ] **Prompt 7**: Workshop Analytics, Leaderboards, Certificates & Deployment
