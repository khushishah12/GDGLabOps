import prisma from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';
import { z } from 'zod';
import { createChallengeSchema, createChallengeTaskSchema } from '@/lib/validations';

export class ChallengeService {
  static async create(data: z.infer<typeof createChallengeSchema>) {
    const template = await prisma.labTemplate.findUnique({
      where: { id: data.labTemplateId },
    });
    if (!template) {
      throw new NotFoundError(`Lab template with ID "${data.labTemplateId}" was not found`);
    }

    return prisma.challenge.create({
      data: {
        labTemplateId: data.labTemplateId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        difficulty: data.difficulty,
        points: data.points,
        timeLimit: data.timeLimit || null,
        displayOrder: data.displayOrder,
        evaluationType: data.evaluationType,
        status: 'ACTIVE',
      },
    });
  }

  static async list(labTemplateId?: string) {
    const where: any = {};
    if (labTemplateId) {
      where.labTemplateId = labTemplateId;
    }

    return prisma.challenge.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        tasks: { orderBy: { displayOrder: 'asc' } },
        labTemplate: { select: { id: true, name: true, domain: true } },
      },
    });
  }

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

  static async createTask(data: z.infer<typeof createChallengeTaskSchema>) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: data.challengeId },
    });
    if (!challenge) {
      throw new NotFoundError(`Challenge with ID "${data.challengeId}" was not found`);
    }

    return prisma.challengeTask.create({
      data: {
        challengeId: data.challengeId,
        title: data.title,
        description: data.description,
        taskType: data.taskType,
        evaluationConfig: data.evaluationConfig,
        points: data.points,
        displayOrder: data.displayOrder,
      },
    });
  }
}
