import prisma from '@/lib/prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { z } from 'zod';
import {
  createChallengeSchema,
  updateChallengeSchema,
  createChallengeTaskSchema,
  submitChallengeSchema,
} from '@/lib/validations';
import {
  evaluateChallengeSubmission,
  sanitizeChallengeForStudent,
  EvaluationResult,
} from '@/lib/challenges/evaluator';
import { Prisma } from '@prisma/client';
import { RealtimeEventService } from './realtime-event.service';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { GamificationService } from './gamification.service';

export class ChallengeService {
  /**
   * Create a new challenge milestone attached to a lab template.
   */
  static async create(raw: z.input<typeof createChallengeSchema>) {
    const data = createChallengeSchema.parse(raw);
    const template = await prisma.labTemplate.findUnique({
      where: { id: data.labTemplateId },
      include: { _count: { select: { challenges: true } } },
    });

    if (!template) {
      throw new NotFoundError(`Lab template with ID "${data.labTemplateId}" was not found`);
    }

    const nextOrder = data.displayOrder || template._count.challenges + 1;

    return prisma.challenge.create({
      data: {
        labTemplateId: data.labTemplateId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        challengeType: data.challengeType,
        difficulty: data.difficulty,
        points: data.points,
        timeLimit: data.timeLimit || null,
        displayOrder: nextOrder,
        hints: (data.hints as Prisma.InputJsonValue) || Prisma.JsonNull,
        referenceMaterial: data.referenceMaterial || null,
        solutionData: (data.solutionData as Prisma.InputJsonValue) || Prisma.JsonNull,
        explanation: data.explanation || null,
        evaluationType: data.evaluationType,
        status: data.status || 'ACTIVE',
      },
      include: {
        tasks: { orderBy: { displayOrder: 'asc' } },
        labTemplate: { select: { id: true, name: true, domain: true } },
      },
    });
  }

  /**
   * Update challenge details, hints, or solution configuration.
   */
  static async update(id: string, raw: z.input<typeof updateChallengeSchema>) {
    const data = updateChallengeSchema.parse(raw);
    await this.getById(id);

    const updateData: Prisma.ChallengeUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.challengeType !== undefined) updateData.challengeType = data.challengeType;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.timeLimit !== undefined) updateData.timeLimit = data.timeLimit;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.hints !== undefined) {
      updateData.hints = (data.hints as Prisma.InputJsonValue) || Prisma.JsonNull;
    }
    if (data.referenceMaterial !== undefined) updateData.referenceMaterial = data.referenceMaterial;
    if (data.solutionData !== undefined) {
      updateData.solutionData = (data.solutionData as Prisma.InputJsonValue) || Prisma.JsonNull;
    }
    if (data.explanation !== undefined) updateData.explanation = data.explanation;
    if (data.evaluationType !== undefined) updateData.evaluationType = data.evaluationType;
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.challenge.update({
      where: { id },
      data: updateData,
      include: {
        tasks: { orderBy: { displayOrder: 'asc' } },
        labTemplate: { select: { id: true, name: true, domain: true } },
      },
    });
  }

  /**
   * Delete a challenge and re-order the remaining challenges in the template.
   */
  static async delete(id: string) {
    const challenge = await this.getById(id);

    return prisma.$transaction(async (tx) => {
      await tx.challenge.delete({ where: { id } });

      // Renumber remaining challenges
      const remaining = await tx.challenge.findMany({
        where: { labTemplateId: challenge.labTemplateId },
        orderBy: { displayOrder: 'asc' },
      });

      for (let i = 0; i < remaining.length; i++) {
        await tx.challenge.update({
          where: { id: remaining[i].id },
          data: { displayOrder: i + 1 },
        });
      }

      return { deletedId: id, reorderedCount: remaining.length };
    });
  }

  /**
   * Reorder challenges within a lab template.
   */
  static async reorder(labTemplateId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, i) =>
      prisma.challenge.update({
        where: { id, labTemplateId },
        data: { displayOrder: i + 1 },
      })
    );
    await prisma.$transaction(updates);

    return prisma.challenge.findMany({
      where: { labTemplateId },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, title: true, displayOrder: true, points: true },
    });
  }

  /**
   * List challenges for a template. If student requested, strip solution data.
   */
  static async list(labTemplateId?: string, isStudent = false) {
    const where: Prisma.ChallengeWhereInput = {};
    if (labTemplateId) {
      where.labTemplateId = labTemplateId;
    }

    const challenges = await prisma.challenge.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        tasks: { orderBy: { displayOrder: 'asc' } },
        labTemplate: { select: { id: true, name: true, domain: true } },
      },
    });

    if (isStudent) {
      return challenges.map((ch) => sanitizeChallengeForStudent(ch));
    }

    return challenges;
  }

  /**
   * Retrieve challenge by ID (Organiser / Admin view with full solutionData).
   */
  static async getById(id: string) {
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { displayOrder: 'asc' } },
        labTemplate: true,
      },
    });

    if (!challenge) {
      throw new NotFoundError(`Challenge with ID "${id}" was not found`);
    }

    return challenge;
  }

  /**
   * Retrieve challenge for student view with all secret keys and solutionData stripped.
   */
  static async getStudentView(id: string, options?: { isCompleted?: boolean; isPreviewMode?: boolean }) {
    const challenge = await this.getById(id);
    return sanitizeChallengeForStudent(challenge, options);
  }

  /**
   * Submit an answer to a challenge and evaluate it on the server
   */
  static async submit(params: {
    studentId: string;
    challengeId: string;
    workshopId?: string | null;
    labSessionId?: string | null;
    answer: any;
    usedHintIds?: string[];
  }) {
    return this.submitAndEvaluate(params);
  }

  /**
   * Pure server-side evaluation of challenge submission.
   * Updates challenge submission record, student progress, and user points idempotently.
   */
  static async submitAndEvaluate(params: {
    studentId: string;
    challengeId: string;
    workshopId?: string | null;
    labSessionId?: string | null;
    answer: any;
    usedHintIds?: string[];
  }): Promise<{
    submission: any;
    evaluation: EvaluationResult;
    netPointsAwarded: number;
    alreadyPassed: boolean;
  }> {
    const { studentId, challengeId, workshopId, labSessionId, answer, usedHintIds = [] } = params;

    // 1. Fetch challenge with server-side solution data
    const challenge = await this.getById(challengeId);

    // 2. Run pure server-side evaluator
    const evaluation = evaluateChallengeSubmission(challenge, answer, usedHintIds);

    // 3. Score Inflation Defense:
    // Check if student already passed this challenge
    const priorPassingSubmissions = await prisma.challengeSubmission.findMany({
      where: {
        studentId,
        challengeId,
        status: 'PASSED',
        ...(workshopId ? { workshopId } : {}),
      },
      orderBy: { pointsAwarded: 'desc' },
    });

    const alreadyPassed = priorPassingSubmissions.length > 0;
    const maxPriorPoints = alreadyPassed ? priorPassingSubmissions[0].pointsAwarded : 0;

    let netPointsAwarded = 0;
    if (evaluation.passed) {
      // Award difference if new score is higher, otherwise 0
      netPointsAwarded = Math.max(0, evaluation.pointsAwarded - maxPriorPoints);
    }

    // 4. Record submission in database
    const submission = await prisma.challengeSubmission.create({
      data: {
        studentId,
        challengeId,
        workshopId: workshopId || null,
        labSessionId: labSessionId || null,
        submissionData: {
          answer,
          usedHintIds,
          totalPenaltyPercent: evaluation.totalPenaltyPercent,
        } as Prisma.InputJsonValue,
        score: evaluation.score,
        pointsAwarded: evaluation.passed ? evaluation.pointsAwarded : 0,
        status: evaluation.passed ? 'PASSED' : 'FAILED',
        feedback: evaluation.feedback,
        evaluatedAt: new Date(),
      },
    });

    // 5. Update StudentProgress if submitted within a workshop context
    if (workshopId) {
      // Fetch or create StudentProgress
      const progress = await prisma.studentProgress.findFirst({
        where: {
          studentId,
          workshopId,
          labTemplateId: challenge.labTemplateId,
        },
      });

      // Determine total challenges attached to this workshop
      const workshopLabs = await prisma.workshopLab.findMany({
        where: { workshopId },
        include: {
          labTemplate: {
            include: { challenges: { select: { id: true } } },
          },
        },
      });

      const allWorkshopChallengeIds = new Set<string>();
      for (const wl of workshopLabs) {
        for (const ch of wl.labTemplate.challenges) {
          allWorkshopChallengeIds.add(ch.id);
        }
      }
      const totalWorkshopChallenges = Math.max(1, allWorkshopChallengeIds.size);

      const currentChallengeProgress =
        progress && progress.challengeProgress && typeof progress.challengeProgress === 'object'
          ? (progress.challengeProgress as Record<string, any>)
          : {};

      const existingChData = currentChallengeProgress[challengeId] || {
        attempts: 0,
        status: 'NOT_STARTED',
        pointsAwarded: 0,
      };

      const updatedChData = {
        status: evaluation.passed ? 'PASSED' : existingChData.status === 'PASSED' ? 'PASSED' : 'FAILED',
        score: Math.max(existingChData.score || 0, evaluation.score),
        pointsAwarded: Math.max(existingChData.pointsAwarded || 0, evaluation.pointsAwarded),
        attempts: (existingChData.attempts || 0) + 1,
        lastAttemptAt: new Date().toISOString(),
        completedAt: evaluation.passed
          ? existingChData.completedAt || new Date().toISOString()
          : existingChData.completedAt || null,
      };

      currentChallengeProgress[challengeId] = updatedChData;

      // Recalculate metrics
      let completedChallengesCount = 0;
      let totalPointsSum = 0;

      for (const [_, chData] of Object.entries(currentChallengeProgress)) {
        if (chData && chData.status === 'PASSED') {
          completedChallengesCount++;
          totalPointsSum += Number(chData.pointsAwarded) || 0;
        }
      }

      const completionPercentage = Math.min(
        100,
        Math.round((completedChallengesCount / totalWorkshopChallenges) * 100 * 10) / 10
      );

      if (!progress) {
        await prisma.studentProgress.create({
          data: {
            studentId,
            workshopId,
            labTemplateId: challenge.labTemplateId,
            completedChallenges: completedChallengesCount,
            totalChallenges: totalWorkshopChallenges,
            totalPoints: totalPointsSum,
            completionPercentage,
            challengeProgress: currentChallengeProgress as Prisma.InputJsonValue,
            completedAt: completionPercentage >= 100 ? new Date() : null,
          },
        });
      } else {
        await prisma.studentProgress.update({
          where: { id: progress.id },
          data: {
            completedChallenges: completedChallengesCount,
            totalChallenges: totalWorkshopChallenges,
            totalPoints: totalPointsSum,
            completionPercentage,
            challengeProgress: currentChallengeProgress as Prisma.InputJsonValue,
            completedAt: completionPercentage >= 100 ? progress.completedAt || new Date() : null,
          },
        });
      }

      // Real-time Event Publishing (Prompt 8)
      await RealtimeEventService.publish({
        workshopId,
        eventType: 'workshop:progress:updated',
        data: {
          studentId,
          challengeId,
          challengeTitle: challenge.title,
          passed: evaluation.passed,
          score: evaluation.score,
          pointsAwarded: evaluation.pointsAwarded,
          netPointsAwarded,
          completedChallenges: completedChallengesCount,
          totalChallenges: totalWorkshopChallenges,
          completionPercentage,
          totalPoints: totalPointsSum,
          completedAt: evaluation.passed ? new Date().toISOString() : null,
        },
      });

      if (evaluation.passed) {
        const pointsToAward = netPointsAwarded > 0 ? netPointsAwarded : evaluation.pointsAwarded;
        if (pointsToAward > 0) {
          try {
            await GamificationService.awardPoints({
              userId: studentId,
              amount: pointsToAward,
              reason: `Challenge Passed: ${challenge.title}`,
              sourceActivity: 'CHALLENGE_COMPLETION',
              referenceId: submission.id,
              workshopId: workshopId || undefined,
              challengeId: challengeId,
              organisationId: challenge.labTemplate?.organisationId,
              metadata: {
                score: evaluation.score,
                submissionId: submission.id,
              },
            });
          } catch (ptsErr) {
            console.warn('Failed to award gamification points for challenge submission:', ptsErr);
          }
        }

        await ActivityService.record({
          workshopId,
          eventType: 'CHALLENGE_COMPLETED',
          actorId: studentId,
          relatedEntityId: challengeId,
          metadata: {
            challengeTitle: challenge.title,
            points: evaluation.pointsAwarded,
            score: evaluation.score,
          },
        });

        await NotificationService.create({
          userId: studentId,
          type: 'CHALLENGE_COMPLETED',
          title: `Challenge Completed: ${challenge.title}`,
          message: `Congratulations! You earned ${evaluation.pointsAwarded} points on "${challenge.title}".`,
          link: `/student/workshops/${workshopId}`,
          metadata: { challengeId, points: evaluation.pointsAwarded },
        });
      }
    }

    // 6. Cumulative points are persisted on StudentProgress and ChallengeSubmission

    return {
      submission,
      evaluation,
      netPointsAwarded,
      alreadyPassed,
    };
  }

  /**
   * Helper to add a granular predefined task check.
   */
  static async createTask(data: z.infer<typeof createChallengeTaskSchema>) {
    await this.getById(data.challengeId);

    return prisma.challengeTask.create({
      data: {
        challengeId: data.challengeId,
        title: data.title,
        description: data.description,
        taskType: data.taskType,
        evaluationConfig: data.evaluationConfig as Prisma.InputJsonValue,
        points: data.points,
        displayOrder: data.displayOrder,
      },
    });
  }
}
