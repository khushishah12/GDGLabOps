import prisma from '@/lib/prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { ActivityService } from './activity.service';

export interface SubmitFeedbackParams {
  workshopId: string;
  studentId: string;
  contentRating: number;
  instructorRating: number;
  labQualityRating: number;
  platformExperienceRating: number;
  overallRating?: number;
  comments?: string;
  suggestions?: string;
}

export class FeedbackService {
  /**
   * Submits or updates feedback for a workshop by a registered/attended student.
   */
  static async submitFeedback(params: SubmitFeedbackParams) {
    const {
      workshopId,
      studentId,
      contentRating,
      instructorRating,
      labQualityRating,
      platformExperienceRating,
      comments,
      suggestions,
    } = params;

    // 1. Validate ratings between 1 and 5
    const ratings = [contentRating, instructorRating, labQualityRating, platformExperienceRating];
    for (const r of ratings) {
      if (typeof r !== 'number' || r < 1 || r > 5) {
        throw new ValidationError('All rating categories must be integers between 1 and 5');
      }
    }

    // 2. Check if student is registered for this workshop
    const registration = await prisma.workshopRegistration.findUnique({
      where: {
        unique_workshop_student_registration: {
          workshopId,
          studentId,
        },
      },
      include: {
        workshop: { select: { id: true, title: true, organiserId: true } },
      },
    });

    if (!registration) {
      throw new ForbiddenError('You can only submit feedback for workshops you have registered for');
    }

    // 3. Compute overall rating
    const overallRating =
      params.overallRating && params.overallRating >= 1 && params.overallRating <= 5
        ? Math.round(params.overallRating * 10) / 10
        : Math.round(((contentRating + instructorRating + labQualityRating + platformExperienceRating) / 4) * 10) / 10;

    // 4. Upsert feedback record (1 per student per workshop)
    const feedback = await prisma.workshopFeedback.upsert({
      where: {
        unique_workshop_student_feedback: {
          workshopId,
          studentId,
        },
      },
      create: {
        workshopId,
        studentId,
        contentRating,
        instructorRating,
        labQualityRating,
        platformExperienceRating,
        overallRating,
        comments: comments?.trim() || null,
        suggestions: suggestions?.trim() || null,
      },
      update: {
        contentRating,
        instructorRating,
        labQualityRating,
        platformExperienceRating,
        overallRating,
        comments: comments?.trim() || null,
        suggestions: suggestions?.trim() || null,
      },
      include: {
        student: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // 5. Log activity
    await ActivityService.record({
      workshopId,
      actorId: studentId,
      eventType: 'student:feedback_submitted',
      relatedEntityId: feedback.id,
      metadata: {
        overallRating,
      },
    });

    return feedback;
  }

  /**
   * Retrieves student's own feedback for a workshop if submitted.
   */
  static async getStudentFeedback(workshopId: string, studentId: string) {
    return prisma.workshopFeedback.findUnique({
      where: {
        unique_workshop_student_feedback: {
          workshopId,
          studentId,
        },
      },
    });
  }

  /**
   * Returns aggregated feedback metrics and student reviews for organisers.
   */
  static async getWorkshopFeedbackSummary(workshopId: string) {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        feedbacks: {
          include: {
            student: { select: { id: true, name: true, avatar: true, leaderboardOptOut: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundError(`Workshop with ID "${workshopId}" not found`);
    }

    const feedbacks = workshop.feedbacks;
    const totalCount = feedbacks.length;

    if (totalCount === 0) {
      return {
        totalResponses: 0,
        averageOverall: 0,
        averageContent: 0,
        averageInstructor: 0,
        averageLabQuality: 0,
        averagePlatform: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recentFeedbacks: [],
      };
    }

    let sumOverall = 0;
    let sumContent = 0;
    let sumInstructor = 0;
    let sumLabQuality = 0;
    let sumPlatform = 0;
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    for (const fb of feedbacks) {
      sumOverall += fb.overallRating;
      sumContent += fb.contentRating;
      sumInstructor += fb.instructorRating;
      sumLabQuality += fb.labQualityRating;
      sumPlatform += fb.platformExperienceRating;

      const roundedStar = Math.min(5, Math.max(1, Math.round(fb.overallRating)));
      distribution[roundedStar] = (distribution[roundedStar] || 0) + 1;
    }

    const averageOverall = Math.round((sumOverall / totalCount) * 10) / 10;
    const averageContent = Math.round((sumContent / totalCount) * 10) / 10;
    const averageInstructor = Math.round((sumInstructor / totalCount) * 10) / 10;
    const averageLabQuality = Math.round((sumLabQuality / totalCount) * 10) / 10;
    const averagePlatform = Math.round((sumPlatform / totalCount) * 10) / 10;

    const recentFeedbacks = feedbacks.map((fb) => ({
      id: fb.id,
      studentName: fb.student.leaderboardOptOut ? 'Anonymous Student' : fb.student.name,
      overallRating: fb.overallRating,
      contentRating: fb.contentRating,
      instructorRating: fb.instructorRating,
      labQualityRating: fb.labQualityRating,
      platformExperienceRating: fb.platformExperienceRating,
      comments: fb.comments,
      suggestions: fb.suggestions,
      createdAt: fb.createdAt,
    }));

    return {
      totalResponses: totalCount,
      averageOverall,
      averageContent,
      averageInstructor,
      averageLabQuality,
      averagePlatform,
      ratingDistribution: distribution,
      recentFeedbacks,
    };
  }
}
