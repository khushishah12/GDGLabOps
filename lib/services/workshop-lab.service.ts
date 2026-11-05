import prisma from '@/lib/prisma';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { TemplateService } from '@/lib/services/template.service';
import { sanitizeChallengeForStudent } from '@/lib/challenges/evaluator';
import { Prisma } from '@prisma/client';

export class WorkshopLabService {
  /**
   * Attach a lab template to a workshop with an immutable snapshot.
   */
  static async attach(params: {
    workshopId: string;
    labTemplateId: string;
    displayOrder?: number;
    isRequired?: boolean;
    availableFrom?: Date | null;
    availableUntil?: Date | null;
    createSnapshot?: boolean;
  }) {
    const {
      workshopId,
      labTemplateId,
      displayOrder,
      isRequired = true,
      availableFrom,
      availableUntil,
      createSnapshot = true,
    } = params;

    // Verify workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: { _count: { select: { workshopLabs: true } } },
    });
    if (!workshop) {
      throw new NotFoundError(`Workshop with ID "${workshopId}" was not found`);
    }

    // Verify template exists
    const template = await prisma.labTemplate.findUnique({
      where: { id: labTemplateId },
    });
    if (!template) {
      throw new NotFoundError(`Lab template with ID "${labTemplateId}" was not found`);
    }

    // Check if already attached
    const existing = await prisma.workshopLab.findFirst({
      where: {
        workshopId,
        labTemplateId,
      },
    });

    if (existing) {
      throw new ConflictError('This lab template is already attached to this workshop.');
    }

    // Generate snapshot if requested
    let snapshotJson: Prisma.InputJsonValue | undefined = undefined;
    if (createSnapshot) {
      const snapshot = await TemplateService.createSnapshot(labTemplateId);
      snapshotJson = snapshot as unknown as Prisma.InputJsonValue;
    }

    const order = displayOrder || workshop._count.workshopLabs + 1;

    return prisma.workshopLab.create({
      data: {
        workshopId,
        labTemplateId,
        displayOrder: order,
        isRequired,
        availableFrom,
        availableUntil,
        ...(snapshotJson ? { labSnapshot: snapshotJson } : {}),
      },
      include: {
        labTemplate: {
          include: {
            challenges: { orderBy: { displayOrder: 'asc' } },
          },
        },
      },
    });
  }

  /**
   * Detach a lab template from a workshop.
   */
  static async detach(workshopId: string, labTemplateId: string) {
    const existing = await prisma.workshopLab.findFirst({
      where: {
        workshopId,
        labTemplateId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Lab template is not attached to this workshop');
    }

    await prisma.workshopLab.delete({
      where: { id: existing.id },
    });

    return { detached: true, workshopId, labTemplateId };
  }

  /**
   * Reorder attached lab templates within a workshop.
   */
  static async reorder(workshopId: string, orderedTemplateIds: string[]) {
    return prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedTemplateIds.length; i++) {
        await tx.workshopLab.updateMany({
          where: {
            workshopId,
            labTemplateId: orderedTemplateIds[i],
          },
          data: {
            displayOrder: i + 1,
          },
        });
      }

      return tx.workshopLab.findMany({
        where: { workshopId },
        orderBy: { displayOrder: 'asc' },
        include: {
          labTemplate: {
            select: { id: true, name: true, domain: true, difficulty: true },
          },
        },
      });
    });
  }

  /**
   * Refresh the immutable snapshot of an attached lab template to its latest state.
   */
  static async syncSnapshot(workshopLabId: string) {
    const workshopLab = await prisma.workshopLab.findUnique({
      where: { id: workshopLabId },
    });

    if (!workshopLab) {
      throw new NotFoundError(`Attached workshop lab with ID "${workshopLabId}" was not found`);
    }

    const snapshot = await TemplateService.createSnapshot(workshopLab.labTemplateId);

    return prisma.workshopLab.update({
      where: { id: workshopLabId },
      data: {
        labSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * List all attached labs for a workshop.
   * If a studentId is provided, attaches student's completion progress and sanitizes challenges.
   */
  static async listForWorkshop(workshopId: string, studentId?: string) {
    const workshopLabs = await prisma.workshopLab.findMany({
      where: { workshopId },
      orderBy: { displayOrder: 'asc' },
      include: {
        labTemplate: {
          include: {
            challenges: {
              orderBy: { displayOrder: 'asc' },
              include: { tasks: { orderBy: { displayOrder: 'asc' } } },
            },
          },
        },
      },
    });

    // If student view, retrieve progress map and sanitize challenges
    let challengeProgressMap: Record<string, any> = {};
    if (studentId) {
      const studentProgressList = await prisma.studentProgress.findMany({
        where: {
          studentId,
          workshopId,
        },
      });

      for (const sp of studentProgressList) {
        if (sp.challengeProgress && typeof sp.challengeProgress === 'object') {
          Object.assign(challengeProgressMap, sp.challengeProgress as Record<string, any>);
        }
      }
    }

    return workshopLabs.map((wl) => {
      // Use snapshot challenges if present, else fallback to live template challenges
      const snapshot = wl.labSnapshot as any;
      const rawChallenges = snapshot?.challenges || wl.labTemplate.challenges;

      const challenges = rawChallenges.map((ch: any) => {
        const studentChProgress = challengeProgressMap[ch.id];
        const isCompleted = studentChProgress?.status === 'PASSED';

        if (studentId) {
          const sanitized = sanitizeChallengeForStudent(ch, { isCompleted });
          return {
            ...sanitized,
            studentProgress: studentChProgress || { status: 'NOT_STARTED', score: 0, attempts: 0 },
          };
        }
        return ch;
      });

      return {
        id: wl.id,
        workshopId: wl.workshopId,
        labTemplateId: wl.labTemplateId,
        displayOrder: wl.displayOrder,
        isRequired: wl.isRequired,
        availableFrom: wl.availableFrom,
        availableUntil: wl.availableUntil,
        hasSnapshot: Boolean(wl.labSnapshot),
        snapshotAt: snapshot?.snapshotAt || null,
        template: {
          id: wl.labTemplate.id,
          name: wl.labTemplate.name,
          shortDescription: wl.labTemplate.shortDescription,
          description: wl.labTemplate.description,
          domain: wl.labTemplate.domain,
          difficulty: wl.labTemplate.difficulty,
          estimatedDuration: wl.labTemplate.estimatedDuration,
          coverImageUrl: wl.labTemplate.coverImageUrl,
          tags: wl.labTemplate.tags,
          environmentType: wl.labTemplate.environmentType,
          learningObjectives: wl.labTemplate.learningObjectives,
          prerequisites: wl.labTemplate.prerequisites,
          version: wl.labTemplate.version,
        },
        challenges,
      };
    });
  }

  /**
   * Get single attached lab for a workshop.
   */
  static async getWorkshopLab(workshopId: string, labTemplateId: string, studentId?: string) {
    const labs = await this.listForWorkshop(workshopId, studentId);
    const lab = labs.find((l) => l.labTemplateId === labTemplateId);
    if (!lab) {
      throw new NotFoundError('Lab template is not attached to this workshop');
    }
    return lab;
  }
}
