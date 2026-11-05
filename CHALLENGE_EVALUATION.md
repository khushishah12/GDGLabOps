# GDG LabOps — Safe Challenge Evaluation & Progress Engine

## Overview

The **Challenge Evaluator Engine** (`lib/challenges/evaluator.ts`) performs pure server-side validation of student submissions across all challenge types. It guarantees deterministic grading, defense-in-depth data isolation, and score inflation protection.

---

## 1. Security & Data Isolation Architecture

```
                 [ Student Client ]
                         │
                         ▼ (Submit Answer)
              POST /api/challenges/[id]/submit
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
 [ Server-Side Solution ]        [ Evaluation Engine ]
 (solutionData strictly          - Normalizes whitespace & comments
  retained on Neon DB)           - Computes hint penalty (capped at 50%)
                                 - Scores answer deterministically
                                         │
                                         ▼
                               [ Scoring Idempotency ]
                               Checks prior passing submissions
                                         │
                                         ▼
                              [ StudentProgress Update ]
                              Recalculates completion %
```

### Sanitization Policy:
The `sanitizeChallengeForStudent(challenge)` function strictly filters all outgoing challenge payloads to ensure:
- `solutionData` is completely omitted.
- `isCorrect` booleans are stripped from MCQ option arrays.
- `explanation` text is locked until a passing submission is registered.
- Hints reveal content only alongside explicit penalty metadata.

---

## 2. Normalization Engine

Bypassing evaluation through accidental whitespace, tab differences, Windows CRLF line-endings, or casing is eliminated via specialized normalizers:

1. **`normalizeString(val, options)`**:
   - Trims leading and trailing whitespace.
   - Collapses internal whitespace sequences `\s+` to a single space.
   - Converts to lower-case unless `caseSensitive: true`.

2. **`normalizeCodeSnippet(code, language)`**:
   - Replaces Windows `\r\n` with standard `\n`.
   - Trims every line and skips blank lines.
   - Strips single-line comments (`#` for bash/python/yaml, `//` for js/ts/go).

---

## 3. Anti-Score-Inflation & Idempotency

To prevent gaming leaderboards by repeatedly resubmitting correct answers:
1. When a student submits a passing answer, the engine checks existing records for `(studentId, challengeId, workshopId)`.
2. If the student has **already passed** the challenge:
   $$\text{netPointsAwarded} = \max(0, \text{newPointsAwarded} - \text{priorPointsAwarded})$$
3. If previously awarded 100 points, subsequent submissions award **0 net points**.
4. Student `totalPoints` in `StudentProgress` remains strictly monotonic and capped at the workshop maximum.
