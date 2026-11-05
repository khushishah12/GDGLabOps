# GDG LabOps — Challenge Builder & Pedagogical Formats

## Overview

The **Challenge Builder** enables workshop creators to construct interactive milestones within lab templates. Challenges are evaluated purely on the server without requiring premature cloud execution or arbitrary shell scripts.

---

## 1. Supported Challenge Formats

### 1. `MULTIPLE_CHOICE` (MCQ)
- **Use Case**: Conceptual understanding, architectural principles, parameter verification.
- **Builder Configuration**:
  - `options`: Array of options `[{ id: string, text: string, isCorrect: boolean }]`.
  - `allowMultiple`: Boolean allowing single or multi-select grading.
- **Security Sanitization**: `isCorrect` flags are stripped before transmission to student clients.

### 2. `SHORT_ANSWER`
- **Use Case**: Naming binaries, ports, exact config flags, or short tokens.
- **Builder Configuration**:
  - `acceptedAnswers`: List of string answers accepted as correct.
  - `caseSensitive`: Toggle for case-sensitive matching (default: `false`).
  - `whitespaceNormalized`: Collapse internal spaces and trim (default: `true`).
  - `regexPattern`: Optional regex pattern matching.

### 3. `CODE_KNOWLEDGE`
- **Use Case**: Command-line invocations, Dockerfile directives, configuration blocks, Python/Bash scripts.
- **Builder Configuration**:
  - `expectedCode`: String snippet.
  - `matchMode`:
    - `NORMALIZED`: Ignores whitespace, line endings, indentation, and comments (`#` / `//`).
    - `EXACT`: Verifies literal string match after trimming.
    - `CONTAINS`: Checks substring inclusion.
    - `REGEX`: Evaluates safe regular expression match.
  - `language`: `bash`, `python`, `javascript`, `sql`, `dockerfile`.

### 4. `GUIDED_TASK`
- **Use Case**: Multi-step workflows and guided procedures.
- **Builder Configuration**:
  - `checklist`: Array of tasks `[{ id: string, text: string, isRequired: boolean }]`.
  - `confirmationCode`: Optional flag or verification token revealed in terminal.

### 5. `RESEARCH_REFLECTION`
- **Use Case**: Open-ended architectural analysis, security post-mortems, design tradeoffs.
- **Builder Configuration**:
  - `minWordCount`: Enforces minimum word count threshold (e.g. 40 words).
  - `autoAwardPoints`: Toggle whether points are automatically awarded upon threshold meeting.

---

## 2. Progressive Hint System

Every challenge supports sequential hints with configurable score penalties:

```json
[
  {
    "id": "hint-1",
    "orderIndex": 1,
    "content": "Check octal permission values: Read=4, Write=2, Execute=1.",
    "penaltyPercent": 10
  }
]
```

### Penalty Rules:
- Unlocked hint penalties are summed: `totalPenaltyPercent = sum(hint.penaltyPercent)`.
- Total penalty is capped at **50% max** to maintain student encouragement.
- Net points awarded:
  $$\text{pointsAwarded} = \max\left(1, \operatorname{round}\left(\text{points} \times \frac{100 - \text{penalty}}{100}\right)\right)$$

---

## 3. Educational Explanations

Each challenge includes an `explanation` field containing an educational breakdown of the optimal solution and security best practices.
- **Student Visibility**: Hidden until the student successfully solves the challenge.
- **Organiser Preview**: Visible in preview mode when "Instructor Solution Inspector" is enabled.
