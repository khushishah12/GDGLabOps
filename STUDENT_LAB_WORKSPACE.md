# GDG LabOps — Student Lab Workspace

## Overview

The **Student Lab Workspace** (`app/student/workshops/[workshopId]/labs/[labId]/page.tsx`) provides students with a focused, distraction-free environment to complete hands-on technical milestones during workshops.

---

## 1. Interface Layout & Components

### Top Progress Bar & Header
- **Breadcrumb Navigation**: Direct access back to workshop dashboard.
- **Curriculum Progress Bar**: Real-time progress bar reflecting percentage of completed milestones.
- **Score Counter**: Cumulative points earned vs total possible lab points.

### Left Navigation Panel (Col 4)
- **Milestone List**: Numbered checklist indicating status:
  - `Not Started`: Slate counter badge.
  - `Attempted`: Amber counter badge indicating ongoing troubleshooting.
  - `Solved`: Green checkmark badge with points awarded.
- **Learning Objectives**: Interactive accordion listing outcomes and prerequisites.

### Right Challenge Workspace (Col 8)
- **Header**: Challenge title, domain badge, difficulty badge, points value.
- **Instructions Box**: Step-by-step instructions rendered with syntax-highlighted code blocks.
- **Reference & Documentation**: Hyperlinks or embedded technical documentation.
- **Type-Specific Input Widget**:
  - `MULTIPLE_CHOICE`: Custom radio / checkbox cards with active state borders.
  - `SHORT_ANSWER`: Monospace single-line input field.
  - `CODE_KNOWLEDGE`: Monospace code editor with language indicator and quick reset.
  - `GUIDED_TASK`: Interactive task checklist where students check items as they execute steps.
  - `RESEARCH_REFLECTION`: Monospace text area with live word counter (`X / Y words minimum`).
- **Hint Drawer**: Collapsible drawer with confirmation step before revealing hints and applying score deductions.
- **Feedback Banner**: Immediate visual feedback alert upon submission (Pass / Fail with constructive guidance).
- **Explanation Modal**: Revealed automatically once the challenge is solved.

---

## 2. Organiser Preview Mode

Organisers can test the student workspace at `/dashboard/templates/[id]/preview`:
- Fully simulated interactive grading without modifying real student database records.
- Toggle for "Instructor Solution Inspector" to view answers, regex patterns, and grading rules.
- Test hints and penalties in real time.
