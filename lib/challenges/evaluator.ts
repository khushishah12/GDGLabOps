/**
 * GDG LabOps - Safe Challenge Evaluator Engine
 * Pure server-side evaluation for all 5 challenge types.
 *
 * Security:
 * - Hidden keys and solutionData never exposed to students.
 * - Input normalization prevents whitespace and casing bypasses.
 * - Deducts hint penalties safely capped at 50%.
 * - Strictly idempotent scoring to prevent score inflation.
 */

export interface EvaluationResult {
  passed: boolean;
  score: number; // 0 - 100 percentage
  pointsAwarded: number;
  feedback: string;
  totalPenaltyPercent: number;
  requiresManualReview?: boolean;
  unlockedExplanation?: string | null;
}

export interface SanitizedHint {
  id: string;
  orderIndex: number;
  penaltyPercent: number;
  content?: string;
}

export interface SanitizedChallenge {
  id: string;
  labTemplateId: string;
  title: string;
  description: string;
  instructions: string;
  challengeType: string;
  difficulty: string;
  points: number;
  timeLimit?: number | null;
  displayOrder: number;
  referenceMaterial?: string | null;
  hints: SanitizedHint[];
  options?: Array<{ id: string; text: string }>; // For MULTIPLE_CHOICE
  checklist?: Array<{ id: string; text: string; isRequired: boolean }>; // For GUIDED_TASK
  minWordCount?: number; // For RESEARCH_REFLECTION
  codeLanguage?: string; // For CODE_KNOWLEDGE
  codePlaceholder?: string;
  explanation?: string | null; // Only populated after completion or in preview
}

/**
 * Normalizes text for robust comparison.
 */
export function normalizeString(
  val: unknown,
  options?: { caseSensitive?: boolean; collapseWhitespace?: boolean }
): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (options?.collapseWhitespace !== false) {
    str = str.replace(/\s+/g, ' ');
  }
  if (!options?.caseSensitive) {
    str = str.toLowerCase();
  }
  return str;
}

/**
 * Normalizes code content by stripping empty lines, comments, and extra indentation.
 */
export function normalizeCodeSnippet(code: string, language = 'bash'): string {
  if (!code) return '';
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const cleaned: string[] = [];

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;
    // Strip single line comments
    if (language === 'bash' || language === 'python' || language === 'yaml') {
      if (trimmed.startsWith('#')) continue;
      const commentIdx = trimmed.indexOf('#');
      if (commentIdx > 0 && !trimmed.slice(0, commentIdx).includes('"')) {
        trimmed = trimmed.substring(0, commentIdx).trim();
      }
    } else if (language === 'javascript' || language === 'typescript' || language === 'go') {
      if (trimmed.startsWith('//')) continue;
    }
    if (trimmed) cleaned.push(trimmed);
  }

  return cleaned.join('\n');
}

/**
 * Calculates net points after applying penalty for unlocked hints.
 * Penalty is capped at 50% max of challenge points.
 */
export function calculateHintPenalty(
  allHints: Array<{ id: string; penaltyPercent: number }> | null | undefined,
  usedHintIds: string[] = []
): { totalPenaltyPercent: number } {
  if (!allHints || !Array.isArray(allHints) || allHints.length === 0 || !usedHintIds || usedHintIds.length === 0) {
    return { totalPenaltyPercent: 0 };
  }

  const usedSet = new Set(usedHintIds);
  let totalPenalty = 0;

  for (const hint of allHints) {
    if (usedSet.has(hint.id)) {
      totalPenalty += Number(hint.penaltyPercent) || 0;
    }
  }

  // Cap penalty at 50% max
  const cappedPenalty = Math.min(50, Math.max(0, totalPenalty));
  return { totalPenaltyPercent: cappedPenalty };
}

/**
 * Evaluates a challenge submission against its server-side solution data.
 */
export function evaluateChallengeSubmission(
  challenge: {
    id: string;
    points: number;
    challengeType: string;
    solutionData: any;
    hints?: any;
    explanation?: string | null;
  },
  studentAnswer: any,
  usedHintIds: string[] = []
): EvaluationResult {
  const points = challenge.points || 100;
  const hints = Array.isArray(challenge.hints) ? challenge.hints : [];
  const { totalPenaltyPercent } = calculateHintPenalty(hints, usedHintIds);
  const solution = challenge.solutionData || {};

  let passed = false;
  let feedback = '';
  let requiresManualReview = false;

  switch (challenge.challengeType) {
    // ----------------------------------------------------
    // 1. MULTIPLE CHOICE
    // ----------------------------------------------------
    case 'MULTIPLE_CHOICE': {
      const options: Array<{ id: string; text: string; isCorrect: boolean }> =
        Array.isArray(solution.options) ? solution.options : [];

      const correctOptionIds = options.filter((opt) => opt.isCorrect).map((opt) => opt.id);

      // Student answer may be a single ID or an array of IDs
      let studentSelectedIds: string[] = [];
      if (Array.isArray(studentAnswer)) {
        studentSelectedIds = studentAnswer.map((id) => String(id).trim());
      } else if (typeof studentAnswer === 'string' && studentAnswer.trim()) {
        studentSelectedIds = [studentAnswer.trim()];
      } else if (studentAnswer && typeof studentAnswer === 'object' && studentAnswer.selected) {
        studentSelectedIds = Array.isArray(studentAnswer.selected)
          ? studentAnswer.selected.map((s: any) => String(s).trim())
          : [String(studentAnswer.selected).trim()];
      }

      if (correctOptionIds.length === 0) {
        // Fallback if no correct option specified in builder
        passed = true;
        feedback = 'Answer recorded successfully.';
      } else {
        const studentSet = new Set(studentSelectedIds);
        const correctSet = new Set(correctOptionIds);

        const allCorrectSelected = correctOptionIds.every((id) => studentSet.has(id));
        const noIncorrectSelected = studentSelectedIds.every((id) => correctSet.has(id));

        passed = allCorrectSelected && noIncorrectSelected;
        if (passed) {
          feedback = 'Excellent! Your selection is correct.';
        } else {
          feedback =
            studentSelectedIds.length === 0
              ? 'Please select an option to submit your answer.'
              : 'Your selection was incorrect. Review the choices and try again.';
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 2. SHORT ANSWER
    // ----------------------------------------------------
    case 'SHORT_ANSWER': {
      const acceptedAnswers: string[] = Array.isArray(solution.acceptedAnswers)
        ? solution.acceptedAnswers
        : typeof solution.expectedAnswer === 'string'
        ? [solution.expectedAnswer]
        : [];

      const caseSensitive = Boolean(solution.caseSensitive);
      const whitespaceNormalized = solution.whitespaceNormalized !== false;
      const regexPattern = typeof solution.regexPattern === 'string' ? solution.regexPattern.trim() : '';

      const rawAnswer =
        typeof studentAnswer === 'string'
          ? studentAnswer
          : studentAnswer?.answer
          ? String(studentAnswer.answer)
          : '';

      const normalizedStudent = normalizeString(rawAnswer, {
        caseSensitive,
        collapseWhitespace: whitespaceNormalized,
      });

      if (!normalizedStudent) {
        passed = false;
        feedback = 'Please provide an answer before submitting.';
        break;
      }

      // Check regex pattern if defined
      if (regexPattern) {
        try {
          const rx = new RegExp(regexPattern, caseSensitive ? undefined : 'i');
          if (rx.test(rawAnswer.trim())) {
            passed = true;
          }
        } catch {
          // If invalid regex, fall through to literal list
        }
      }

      // Check literal accepted answers
      if (!passed && acceptedAnswers.length > 0) {
        for (const candidate of acceptedAnswers) {
          const normalizedCandidate = normalizeString(candidate, {
            caseSensitive,
            collapseWhitespace: whitespaceNormalized,
          });
          if (normalizedCandidate === normalizedStudent) {
            passed = true;
            break;
          }
        }
      }

      if (passed) {
        feedback = 'Correct! Your answer matches the required solution.';
      } else {
        feedback = 'The answer provided does not match the expected solution. Check formatting and try again.';
      }
      break;
    }

    // ----------------------------------------------------
    // 3. CODE KNOWLEDGE
    // ----------------------------------------------------
    case 'CODE_KNOWLEDGE': {
      const expectedCode = typeof solution.expectedCode === 'string' ? solution.expectedCode : '';
      const matchMode: 'EXACT' | 'CONTAINS' | 'REGEX' | 'NORMALIZED' = solution.matchMode || 'NORMALIZED';
      const language = solution.language || 'bash';

      const rawCode =
        typeof studentAnswer === 'string'
          ? studentAnswer
          : studentAnswer?.code
          ? String(studentAnswer.code)
          : '';

      const trimmedStudent = rawCode.trim();

      if (!trimmedStudent) {
        passed = false;
        feedback = 'Please write or paste your code snippet before submitting.';
        break;
      }

      if (matchMode === 'EXACT') {
        passed = trimmedStudent === expectedCode.trim();
      } else if (matchMode === 'CONTAINS') {
        const normStudent = normalizeString(trimmedStudent);
        const normExpected = normalizeString(expectedCode);
        passed = normStudent.includes(normExpected);
      } else if (matchMode === 'REGEX') {
        try {
          const rx = new RegExp(expectedCode, 'm');
          passed = rx.test(trimmedStudent);
        } catch {
          passed = trimmedStudent.includes(expectedCode.trim());
        }
      } else {
        // NORMALIZED (default)
        const cleanStudent = normalizeCodeSnippet(trimmedStudent, language);
        const cleanExpected = normalizeCodeSnippet(expectedCode, language);

        // Direct normalized match or token equivalence
        passed =
          cleanStudent === cleanExpected ||
          normalizeString(cleanStudent) === normalizeString(cleanExpected);
      }

      if (passed) {
        feedback = 'Code verification passed! Your solution fulfills the technical criteria.';
      } else {
        feedback = 'Code check did not match the expected pattern or command syntax. Double-check your flags and logic.';
      }
      break;
    }

    // ----------------------------------------------------
    // 4. GUIDED TASK
    // ----------------------------------------------------
    case 'GUIDED_TASK': {
      const checklist: Array<{ id: string; text: string; isRequired: boolean }> =
        Array.isArray(solution.checklist) ? solution.checklist : [];
      const requiredItemIds = checklist.filter((item) => item.isRequired !== false).map((item) => item.id);
      const expectedConfirmation = solution.confirmationCode ? String(solution.confirmationCode).trim() : '';

      let checkedIds: string[] = [];
      let studentConfirmation = '';

      if (Array.isArray(studentAnswer)) {
        checkedIds = studentAnswer.map(String);
      } else if (studentAnswer && typeof studentAnswer === 'object') {
        if (Array.isArray(studentAnswer.checkedTaskIds)) {
          checkedIds = studentAnswer.checkedTaskIds.map(String);
        }
        if (studentAnswer.confirmationCode) {
          studentConfirmation = String(studentAnswer.confirmationCode).trim();
        }
      }

      const checkedSet = new Set(checkedIds);
      const allRequiredCompleted = requiredItemIds.every((id) => checkedSet.has(id));

      let confirmationValid = true;
      if (expectedConfirmation) {
        confirmationValid =
          normalizeString(studentConfirmation) === normalizeString(expectedConfirmation);
      }

      passed = allRequiredCompleted && confirmationValid;

      if (passed) {
        feedback = 'All milestones and verification checks for this guided task have been completed!';
      } else if (!allRequiredCompleted) {
        feedback = 'Please complete and check all required task items before submitting.';
      } else {
        feedback = 'The verification confirmation code entered does not match.';
      }
      break;
    }

    // ----------------------------------------------------
    // 5. RESEARCH REFLECTION
    // ----------------------------------------------------
    case 'RESEARCH_REFLECTION': {
      const minWordCount = Number(solution.minWordCount) || 50;
      const autoAwardPoints = solution.autoAwardPoints !== false;

      const rawReflection =
        typeof studentAnswer === 'string'
          ? studentAnswer
          : studentAnswer?.reflection
          ? String(studentAnswer.reflection)
          : '';

      const words = rawReflection.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;

      if (wordCount < minWordCount) {
        passed = false;
        feedback = `Your reflection is ${wordCount} word${wordCount === 1 ? '' : 's'}. A minimum of ${minWordCount} words is required for comprehensive analysis.`;
      } else {
        passed = true;
        requiresManualReview = !autoAwardPoints;
        feedback = `Reflection submitted (${wordCount} words). Insightful and well-structured answer!`;
      }
      break;
    }

    default:
      // Unknown type
      passed = true;
      feedback = 'Submission received.';
      break;
  }

  // Calculate final score and points
  const score = passed ? Math.max(0, 100 - totalPenaltyPercent) : 0;
  const pointsAwarded = passed ? Math.max(1, Math.round(points * (score / 100))) : 0;

  return {
    passed,
    score,
    pointsAwarded,
    feedback,
    totalPenaltyPercent,
    requiresManualReview,
    unlockedExplanation: passed ? challenge.explanation || null : null,
  };
}

/**
 * Sanitizes a challenge object for student transmission.
 * Removes all hidden solutions, keys, and private flags.
 */
export function sanitizeChallengeForStudent(
  challenge: any,
  options?: { isCompleted?: boolean; isPreviewMode?: boolean }
): SanitizedChallenge {
  const solution = challenge.solutionData || {};
  const hints: SanitizedHint[] = Array.isArray(challenge.hints)
    ? challenge.hints.map((h: any) => ({
        id: String(h.id),
        orderIndex: Number(h.orderIndex) || 1,
        penaltyPercent: Number(h.penaltyPercent) || 10,
        content: h.content, // Content is delivered with penalty metadata for student choice
      }))
    : [];

  const sanitized: SanitizedChallenge = {
    id: challenge.id,
    labTemplateId: challenge.labTemplateId,
    title: challenge.title,
    description: challenge.description,
    instructions: challenge.instructions,
    challengeType: challenge.challengeType,
    difficulty: challenge.difficulty,
    points: challenge.points,
    timeLimit: challenge.timeLimit,
    displayOrder: challenge.displayOrder,
    referenceMaterial: challenge.referenceMaterial,
    hints,
    explanation: options?.isCompleted || options?.isPreviewMode ? challenge.explanation : null,
  };

  // Provide public student fields tailored to challenge type
  if (challenge.challengeType === 'MULTIPLE_CHOICE' && Array.isArray(solution.options)) {
    sanitized.options = solution.options.map((opt: any) => ({
      id: opt.id,
      text: opt.text,
    }));
  } else if (challenge.challengeType === 'GUIDED_TASK' && Array.isArray(solution.checklist)) {
    sanitized.checklist = solution.checklist.map((item: any) => ({
      id: item.id,
      text: item.text,
      isRequired: item.isRequired !== false,
    }));
  } else if (challenge.challengeType === 'RESEARCH_REFLECTION') {
    sanitized.minWordCount = Number(solution.minWordCount) || 50;
  } else if (challenge.challengeType === 'CODE_KNOWLEDGE') {
    sanitized.codeLanguage = solution.language || 'bash';
    sanitized.codePlaceholder = solution.placeholder || '# Enter your command or script here...';
  }

  return sanitized;
}
