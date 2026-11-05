# GDG LabOps — Lab Template Library & Curriculum Architecture

## Overview

The **Lab Template Library** provides GDG on Campus organisers with a reusable, version-controlled catalog of hands-on technical workshop curricula. Templates encapsulate learning objectives, technical prerequisites, environment profiles, tooling specifications, and challenge milestones.

---

## 1. Domain Categorization

Templates are classified under 11 standardized developer and engineering domains:

1. `Web Development`
2. `Cybersecurity`
3. `Cloud & Infrastructure`
4. `DevOps & CI/CD`
5. `Linux & System Administration`
6. `Artificial Intelligence`
7. `Machine Learning`
8. `Data Science & Analytics`
9. `Git & Open Source`
10. `Programming Fundamentals`
11. `Other`

---

## 2. Data Model & Versioning

### `LabTemplate`

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `organisationId` | UUID | Owning organization (multi-tenant boundary) |
| `createdBy` | UUID | Creator User ID |
| `name` | String | Template title (3–150 chars) |
| `shortDescription` | String? | 1-line summary |
| `description` | Text | Full Markdown curriculum overview |
| `domain` | String | Standardized domain category |
| `difficulty` | Enum | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `estimatedDuration` | Int | Duration in minutes |
| `coverImageUrl` | String? | Unsplash or hosted image URL |
| `tags` | String[] | Searchable keyword tags |
| `requiredTools` | Json? | Array of required CLI tools (`[{ name, version, description }]`) |
| `version` | Int | Semantic version incremented on curriculum updates |
| `environmentType` | String | `terminal`, `vscode`, `web-app` |
| `learningObjectives`| Json | Array of strings detailing concrete student outcomes |
| `prerequisites` | Json | Array of strings detailing expected student background |
| `status` | Enum | `DRAFT`, `PUBLISHED`, `ARCHIVED` |

---

## 3. Workshop Lab Snapshot Strategy

To protect running workshops from unexpected changes when an organiser edits a shared library template, GDG LabOps implements an **Immutable Snapshot Strategy**:

```
[ Lab Template Library ]
       │
       ▼ (Attach to Workshop)
[ WorkshopLab ] ──► Stores `labSnapshot` JSON:
                      ├── snapshotAt (timestamp)
                      ├── template metadata & version
                      └── frozen array of all challenges & solutionData
```

### Key Guarantees:
- **Zero In-Flight Disruption**: Edits, deletions, or reordering of challenges in the template library **do not** alter existing workshop snapshots.
- **Manual Sync**: Organisers can explicitly trigger `POST /api/workshops/[id]/labs/[labId]` with `{ action: 'sync_snapshot' }` to refresh an attached lab to the library's latest version prior to event launch.
- **Student Isolation**: Students interact with the snapshot challenges, guaranteeing consistent grading criteria across all participant cohorts.

---

## 4. API Endpoints

- `GET /api/templates`: Search and filter templates (`domain`, `difficulty`, `status`, `search`).
- `POST /api/templates`: Create new template with metadata and curriculum specifications.
- `GET /api/templates/[id]`: Retrieve template details and attached challenge milestones.
- `PATCH /api/templates/[id]`: Update template metadata (increments `version`).
- `DELETE /api/templates/[id]`: Delete template (blocked if attached to active workshops).
- `POST /api/templates/[id]/duplicate`: Deep clone template and all challenges into a new `DRAFT`.
- `POST /api/templates/[id]/publish`: Publish template (requires >= 1 challenge and objectives).
- `POST /api/templates/[id]/archive`: Archive template.
- `GET /api/templates/[id]/preview`: Simulated student view with instructor inspector.
- `GET /api/templates/[id]/analytics`: Aggregated completion rates, attempt telemetry, and workshop usage.
