# GDG LabOps — Analytics, Reports, Gamification & Leaderboards (Prompt 9)

## Architecture Overview

Prompt 9 introduces a comprehensive, database-backed telemetry, reporting, gamification, and privacy-first leaderboard system for GDG LabOps. All calculations are performed directly against production PostgreSQL records; no random numbers or fabricated statistics are ever used.

```
                      +---------------------------------------+
                      |       Next.js Control Plane           |
                      |  (Analytics, Reports, Gamification)   |
                      +-------------------+-------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+------------------+             +------------------+             +--------------------+
|  Gamification    |             | Feedback &       |             | Analytics &        |
|  Ledger Engine   |             | Reviews Engine   |             | Report Engine      |
|                  |             |                  |             |                    |
| • Append-Only Tx |             | • 5-Star Metrics |             | • Difficulty Curve |
| • Idempotency Key|             | • 1 Per Student  |             | • RFC 4180 CSV     |
| • Compensating Rx|             | • Aggregation    |             | • Executive Summary|
+--------+---------+             +--------+---------+             +---------+----------+
         |                                |                                 |
         +--------------------------------+---------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |         Neon PostgreSQL               |
                      | (points_transactions, feedbacks, etc.)|
                      +---------------------------------------+
```

---

## 1. Database Schema Additions

### `PointsTransaction`
Append-only ledger table tracking every point movement:
- `id` (`UUID`, primary key)
- `userId` (`UUID`, foreign key to `users`)
- `organisationId` (`UUID?`, foreign key to `organisations`)
- `workshopId` (`UUID?`, foreign key to `workshops`)
- `challengeId` (`UUID?`, foreign key to `challenges`)
- `amount` (`Int`, positive for awards, negative for reversals)
- `type` (`PointsTransactionType`: `EARNED`, `REVERSED`, `ADJUSTED`, `BONUS`)
- `reason` (`String`)
- `sourceActivity` (`String`, e.g., `CHALLENGE_COMPLETION`, `WORKSHOP_ATTENDANCE`, `LAB_COMPLETION`, `BONUS`)
- `referenceId` (`String?`, ID of submission, registration, or original transaction for reversals)
- `idempotencyKey` (`String @unique`, e.g., `challenge_completion-<userId>-<submissionId>`)
- `createdAt` (`DateTime`)

### `WorkshopFeedback`
Structured post-workshop feedback:
- `id` (`UUID`, primary key)
- `workshopId` (`UUID`, foreign key to `workshops`)
- `studentId` (`UUID`, foreign key to `users`)
- `contentRating` (`Int`, 1–5)
- `instructorRating` (`Int`, 1–5)
- `labQualityRating` (`Int`, 1–5)
- `platformExperienceRating` (`Int`, 1–5)
- `overallRating` (`Float`, 1.0–5.0)
- `comments` (`String?`)
- `suggestions` (`String?`)
- Unique constraint: `@@unique([workshopId, studentId])`

### `Achievement` & `User` Extensions
- `Achievement`: added `slug String @unique`, `criteria Json?`, `badgeUrl String?`, `isActive Boolean`.
- `User`: added `totalPoints Int @default(0)`, `leaderboardOptOut Boolean @default(false)`.

---

## 2. Gamification & Ledger Implementation

### Idempotency & Reversal Guarantees
- **Awarding Points**: Evaluated strictly server-side. The idempotency key `${sourceActivity.toLowerCase()}-${userId}-${refKey}` prevents double-awarding if a client retries or submits multiple times.
- **Compensating Reversals**: When an organiser invalidates or disqualifies a submission, `GamificationService.revertPoints` creates a negative compensating transaction with `type: 'REVERSED'` and references the original transaction. Past records are never deleted from the ledger.
- **Atomic Balance Updates**: `user.totalPoints` is updated atomically inside a PostgreSQL transaction.

### Automated Achievement Engine
Evaluates milestones against real database records:
1. `first-workshop`: Triggered when `workshopRegistration` attendance is confirmed.
2. `first-lab`: Triggered when a student completes their first cloud lab session.
3. `first-challenge`: Triggered when the student passes their first challenge evaluation.
4. `quick-learner`: Triggered when a challenge is solved on the first attempt without viewing hints.
5. `lab-master`: Triggered when a student achieves 100% completion in a lab.
6. `domain-explorer`: Triggered when challenges are passed across 3 or more distinct technical domains.

---

## 3. Privacy-First Multi-Level Leaderboards

### Privacy Architecture
- **Opt-Out Toggle**: Students can toggle `leaderboardOptOut` from their Learning Journey page.
- **Masking Rules**: When `leaderboardOptOut === true`, other participants see `"Anonymous Explorer"` and a generic avatar placeholder. The current user always sees their own real rank and points.
- **Zero Email Leakage**: The leaderboard API endpoint (`/api/leaderboard`) strictly selects and returns only `userId`, `name`, `avatar`, `points`, `badgesCount`, and `rank`. Email addresses are never queried or sent to the client.

### Multi-Level Scopes
- **All-Time**: Global rankings by lifetime points.
- **Monthly**: Points earned in the current calendar month.
- **Workshop**: Points earned specifically within a given workshop.
- **Organisation**: Chapter-level rankings.

---

## 4. Learning Analytics & Challenge Difficulty

### Minimum Sample Threshold
To avoid small-sample distortion (e.g., 1 attempt failing making a challenge look impossible), challenges are only flagged as **High Difficulty** when:
$$\text{passRate} < 50\% \quad \text{AND} \quad \text{totalSubmissions} \ge 3$$

### Metrics Computed:
- **Pass Rate**: $\frac{\text{Passed Submissions}}{\text{Total Submissions}} \times 100$
- **Average Attempts**: $\frac{\text{Total Submissions}}{\text{Unique Students Attempted}}$
- **Abandonment Rate**: Percentage of students who attempted a challenge but never passed.

---

## 5. Reports & Export Engine

1. **CSV Export** (`/api/workshops/[id]/reports/csv`):
   - RFC 4180 compliant export with participant name, email, registration status, attendance status, sessions launched, challenges completed, points earned, and feedback score.
2. **Executive Summary** (`/api/workshops/[id]/reports/summary`):
   - Standalone printable HTML report with `@media print` stylesheets for PDF printing.
   - Includes KPI summary cards, challenge difficulty table, support request breakdown, and student review distributions.

---

## 6. Test Suite Verification

Test suite `scripts/test-analytics-gamification.ts` ran against live Neon PostgreSQL:
```
================================================================
  PROMPT 9: ANALYTICS, REPORTS, GAMIFICATION & LEADERBOARD TESTS
================================================================
  ✅ PASS: Points transaction appended to ledger with amount 100
  ✅ PASS: Transaction marked as EARNED type
  ✅ PASS: User totalPoints atomically incremented by 100
  ✅ PASS: Idempotency key prevents duplicate transaction creation
  ✅ PASS: Duplicate award does not inflate user points (idempotent)
  ✅ PASS: Compensating transaction created with negative amount (-100)
  ✅ PASS: Compensating transaction has REVERSED type
  ✅ PASS: Reversal references original transaction ID
  ✅ PASS: User points correctly reduced back to initial level without record deletion
  ✅ PASS: Original transaction remains immutable in append-only ledger
  ✅ PASS: Legitimate participation points awarded successfully
  ✅ PASS: Catalog contains standard achievements (found 10)
  ✅ PASS: Catalog contains "first-workshop" achievement
  ✅ PASS: Catalog contains "first-lab" achievement
  ✅ PASS: Catalog contains "first-challenge" achievement
  ✅ PASS: Achievement evaluation completes smoothly
  ✅ PASS: Student has earned achievements (count: 3)
  ✅ PASS: All-time leaderboard returns ranked participant entries
  ✅ PASS: Top entry has rank #1
  ✅ PASS: Entries ordered descending by points
  ✅ PASS: Leaderboard NEVER exposes student email addresses on public records
  ✅ PASS: Monthly leaderboard query returns valid entries list
  ✅ PASS: Workshop-scoped leaderboard query functions accurately
  ✅ PASS: Opted-out student appears as "Anonymous Explorer" to other users
  ✅ PASS: Avatar is masked for opted-out student
  ✅ PASS: Privacy opt-out toggle reverted to public visibility
  ✅ PASS: Workshop feedback submitted and saved
  ✅ PASS: Overall rating accurately calculated as average (4.5)
  ✅ PASS: Submitting second feedback updates existing record (1 per student)
  ✅ PASS: Updated overall rating is 5.0
  ✅ PASS: Feedback summary aggregated (responses: 1)
  ✅ PASS: Average rating accurately aggregated (5)
  ✅ PASS: 5-star rating count accurately reflected in distribution
  ✅ PASS: Organiser analytics computes total workshops from DB
  ✅ PASS: Organiser analytics computes total registrations from DB
  ✅ PASS: Attendance rate calculated
  ✅ PASS: Domain breakdown returned
  ✅ PASS: Registration trends returned
  ✅ PASS: Workshop performance analytics targeted to workshop
  ✅ PASS: Capacity utilisation % computed
  ✅ PASS: Attendance rate % computed
  ✅ PASS: Challenge difficulty analysis returned
  ✅ PASS: Challenge metrics array populated with real database evaluations
  ✅ PASS: Student learning journey retrieved for student
  ✅ PASS: Total points accurately retrieved
  ✅ PASS: Global rank accurately calculated from higher scores
  ✅ PASS: Achievements catalog returned with unlocked status
  ✅ PASS: Recent points ledger transactions returned
  ✅ PASS: CSV export generated
  ✅ PASS: CSV includes standard headers
  ✅ PASS: CSV includes enrolled participant records
  ✅ PASS: HTML summary report generated
  ✅ PASS: Valid HTML5 document output
  ✅ PASS: Includes workshop title
  ✅ PASS: Includes print stylesheet for PDF/paper exports

================================================================
  TEST RESULTS: 55 PASSED, 0 FAILED
================================================================
```
