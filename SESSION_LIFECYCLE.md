# GDG LabOps – Container Session Lifecycle & State Machine

## 1. Overview

Each cloud lab environment transitions through a formal finite state machine. Transitions are strictly validated by `SessionService` and `validSessionTransitions` to maintain data integrity and prevent container leakage or phantom processes.

```
       [ Student Launches Lab ]
                  |
                  v
             +---------+
             | PENDING |
             +----+----+
                  |
                  v
          +---------------+
          | PROVISIONING  +------------------------+
          +-------+-------+                        |
                  |                                | (Failure)
                  v                                v
             +---------+                      +----------+
             | RUNNING |                      |  FAILED  |
             +----+----+                      +----+-----+
                  |                                |
       +----------+----------+                     |
       |                     |                     |
       v                     v                     |
  +---------+           +---------+                |
  | STOPPED |           | EXPIRED |                |
  +----+----+           +----+----+                |
       |                     |                     |
       +----------+----------+                     |
                  |                                |
                  v                                v
            +------------+                 +---------------+
            | TERMINATED | <---------------+ (Destroyed)   |
            +------------+
```

---

## 2. State Machine Definitions

| Status | Description | Allowed Next States |
| :--- | :--- | :--- |
| `PENDING` | Session request received; quota and registration verified. | `PROVISIONING`, `FAILED`, `TERMINATED` |
| `PROVISIONING` | Execution runner allocating container, cgroups, network, and initial token. | `RUNNING`, `FAILED`, `TERMINATED` |
| `RUNNING` | Container active; PTY WebSocket gateway accessible; countdown active. | `STOPPING`, `STOPPED`, `COMPLETED`, `FAILED`, `TERMINATED`, `EXPIRED` |
| `STOPPING` | Graceful SIGTERM signal sent to container. | `STOPPED`, `FAILED`, `TERMINATED` |
| `STOPPED` | Container stopped; disk preserved temporarily; can resume or terminate. | `PROVISIONING`, `TERMINATED` |
| `COMPLETED` | Student completed all lab milestones; session successfully concluded. | Terminal state (cannot restart) |
| `FAILED` | Container failed to start or runner returned error. | `TERMINATED` |
| `EXPIRED` | Max duration lease or idle timeout elapsed. Container destroyed. | `TERMINATED` |
| `TERMINATED` | Container stopped, resources unmounted, and container removed from host. | Terminal state |

---

## 3. Quota Management & Concurrency Rules

1. **Per-Student Quota**:
   - Each student is permitted a maximum of **1 active environment** (`PROVISIONING` or `RUNNING`) at any time.
   - If a student requests to launch an environment while already running one in the same workshop, the platform is idempotent: it refreshes the ticket and resumes the existing session.
   - If a student attempts to launch a lab in a different workshop while another is active, the request is rejected with a 409 Conflict prompting them to terminate the existing session first.
2. **Lease Management & Hard Caps**:
   - Every lab template has an `estimatedDuration` (e.g. 45–90 minutes).
   - Hard cap defaults to 60–120 minutes.
   - Once `expiresAt` is reached, the automated reaper terminates the session.
3. **Idle Timeout Detection**:
   - Heartbeats and terminal keystrokes update `lastActivityAt`.
   - If a container receives zero activity for 15–20 minutes, the reaper initiates graceful cleanup.
