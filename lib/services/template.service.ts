import prisma from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';
import { z } from 'zod';
import { createLabTemplateSchema, updateLabTemplateSchema } from '@/lib/validations';

export class TemplateService {
  static async create(data: z.infer<typeof createLabTemplateSchema>) {
    // Verify Organisation exists
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
    });
    if (!org) {
      throw new NotFoundError(`Organisation with ID "${data.organisationId}" does not exist`);
    }

    // Verify creator user exists
    const creator = await prisma.user.findUnique({
      where: { id: data.createdBy },
    });
    if (!creator) {
      throw new NotFoundError(`User creator with ID "${data.createdBy}" does not exist`);
    }

    return prisma.labTemplate.create({
      data: {
        organisationId: data.organisationId,
        createdBy: data.createdBy,
        name: data.name,
        description: data.description,
        domain: data.domain,
        difficulty: data.difficulty,
        estimatedDuration: data.estimatedDuration,
        environmentType: data.environmentType,
        learningObjectives: data.learningObjectives,
        prerequisites: data.prerequisites,
        status: 'PUBLISHED',
      },
    });
  }

  static async list(params?: { domain?: string; organisationId?: string }) {
    const where: any = {};
    if (params?.domain && params.domain !== 'ALL') {
      where.domain = params.domain;
    }
    if (params?.organisationId) {
      where.organisationId = params.organisationId;
    }

    return prisma.labTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
        creator: { select: { id: true, name: true, email: true } },
        challenges: {
          select: { id: true, title: true, points: true, difficulty: true },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            workshopLabs: true,
            challenges: true,
          },
        },
      },
    });
  }

  static async getById(id: string) {
    const template = await prisma.labTemplate.findUnique({
      where: { id },
      include: {
        organisation: true,
        creator: { select: { id: true, name: true, email: true } },
        challenges: {
          orderBy: { displayOrder: 'asc' },
          include: {
            tasks: { orderBy: { displayOrder: 'asc' } },
          },
        },
        workshopLabs: {
          include: {
            workshop: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundError(`Lab template with ID "${id}" was not found`);
    }

    return template;
  }

  static async update(id: string, data: z.infer<typeof updateLabTemplateSchema>) {
    await this.getById(id);
    return prisma.labTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        domain: data.domain,
        difficulty: data.difficulty,
        estimatedDuration: data.estimatedDuration,
        environmentType: data.environmentType,
        learningObjectives: data.learningObjectives,
        prerequisites: data.prerequisites,
      },
    });
  }

  static async archive(id: string) {
    await this.getById(id);
    return prisma.labTemplate.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }
}
