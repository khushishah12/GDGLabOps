import prisma from '@/lib/prisma';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import { z } from 'zod';
import { createLabTemplateSchema, updateLabTemplateSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';

export class TemplateService {
  /**
   * Create a new lab template with metadata, objectives, and prerequisites.
   */
  static async create(raw: z.input<typeof createLabTemplateSchema>) {
    const data = createLabTemplateSchema.parse(raw);
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
        shortDescription: data.shortDescription || null,
        description: data.description,
        domain: data.domain,
        difficulty: data.difficulty,
        estimatedDuration: data.estimatedDuration,
        coverImageUrl: data.coverImageUrl || null,
        tags: data.tags || [],
        requiredTools: (data.requiredTools as Prisma.InputJsonValue) || Prisma.JsonNull,
        version: data.version || 1,
        status: data.status || 'DRAFT',
        environmentType: data.environmentType,
        learningObjectives: data.learningObjectives,
        prerequisites: data.prerequisites,
      },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
        creator: { select: { id: true, name: true, email: true } },
        challenges: true,
      },
    });
  }

  /**
   * List templates with filters for domain, difficulty, status, organisation, and search keyword.
   */
  static async list(params?: {
    domain?: string;
    difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    organisationId?: string;
    search?: string;
  }) {
    const where: Prisma.LabTemplateWhereInput = {};

    if (params?.domain && params.domain !== 'ALL') {
      where.domain = params.domain;
    }
    if (params?.difficulty) {
      where.difficulty = params.difficulty;
    }
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.organisationId) {
      where.organisationId = params.organisationId;
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { shortDescription: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ];
    }

    return prisma.labTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
        creator: { select: { id: true, name: true, email: true } },
        challenges: {
          select: {
            id: true,
            title: true,
            points: true,
            difficulty: true,
            challengeType: true,
            displayOrder: true,
          },
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

  /**
   * Retrieve a lab template by its unique ID.
   */
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
            workshop: {
              select: {
                id: true,
                title: true,
                status: true,
                startDate: true,
                registrationCode: true,
              },
            },
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundError(`Lab template with ID "${id}" was not found`);
    }

    return template;
  }

  /**
   * Update a template's metadata or curriculum specifications.
   */
  static async update(id: string, raw: z.input<typeof updateLabTemplateSchema>) {
    const data = updateLabTemplateSchema.parse(raw);
    const existing = await this.getById(id);

    const updateData: Prisma.LabTemplateUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.domain !== undefined) updateData.domain = data.domain;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.estimatedDuration !== undefined) updateData.estimatedDuration = data.estimatedDuration;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.requiredTools !== undefined) {
      updateData.requiredTools = (data.requiredTools as Prisma.InputJsonValue) || Prisma.JsonNull;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.environmentType !== undefined) updateData.environmentType = data.environmentType;
    if (data.learningObjectives !== undefined) updateData.learningObjectives = data.learningObjectives;
    if (data.prerequisites !== undefined) updateData.prerequisites = data.prerequisites;

    // Automatically bump version if major content has been modified
    if (
      data.name !== undefined ||
      data.description !== undefined ||
      data.learningObjectives !== undefined ||
      data.requiredTools !== undefined
    ) {
      updateData.version = (existing.version || 1) + 1;
    }

    return prisma.labTemplate.update({
      where: { id },
      data: updateData,
      include: {
        challenges: { orderBy: { displayOrder: 'asc' } },
        organisation: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /**
   * Deep clone a lab template including all of its challenges and hints.
   * Cloned template is initialized in DRAFT status with version 1.
   */
  static async duplicate(id: string, createdBy: string, organisationId?: string) {
    const source = await this.getById(id);
    const targetOrgId = organisationId || source.organisationId;

    // 1. Create duplicated template
    const newTemplate = await prisma.labTemplate.create({
      data: {
        organisationId: targetOrgId,
        createdBy,
        name: `${source.name} (Copy)`,
        shortDescription: source.shortDescription,
        description: source.description,
        domain: source.domain,
        difficulty: source.difficulty,
        estimatedDuration: source.estimatedDuration,
        coverImageUrl: source.coverImageUrl,
        tags: source.tags,
        requiredTools: (source.requiredTools as Prisma.InputJsonValue) || Prisma.JsonNull,
        version: 1,
        status: 'DRAFT',
        environmentType: source.environmentType,
        learningObjectives: source.learningObjectives as Prisma.InputJsonValue,
        prerequisites: source.prerequisites as Prisma.InputJsonValue,
      },
    });

    // 2. Clone challenges using batch createMany
    if (source.challenges && source.challenges.length > 0) {
      await prisma.challenge.createMany({
        data: source.challenges.map((ch) => ({
          labTemplateId: newTemplate.id,
          title: ch.title,
          description: ch.description,
          instructions: ch.instructions,
          challengeType: ch.challengeType,
          difficulty: ch.difficulty,
          points: ch.points,
          timeLimit: ch.timeLimit,
          displayOrder: ch.displayOrder,
          hints: (ch.hints as Prisma.InputJsonValue) || Prisma.JsonNull,
          referenceMaterial: ch.referenceMaterial,
          solutionData: (ch.solutionData as Prisma.InputJsonValue) || Prisma.JsonNull,
          explanation: ch.explanation,
          evaluationType: ch.evaluationType,
          status: 'ACTIVE',
        })),
      });
    }

    return prisma.labTemplate.findUnique({
      where: { id: newTemplate.id },
      include: {
        challenges: { orderBy: { displayOrder: 'asc' } },
        organisation: true,
      },
    });
  }

  /**
   * Publish a lab template.
   * Enforces that the template contains at least 1 challenge, objectives, and descriptions.
   */
  static async publish(id: string) {
    const template = await this.getById(id);

    if (!template.challenges || template.challenges.length === 0) {
      throw new ValidationError(
        'Cannot publish lab template: Template must contain at least one challenge milestone.'
      );
    }

    const objectives = Array.isArray(template.learningObjectives) ? template.learningObjectives : [];
    if (objectives.length === 0) {
      throw new ValidationError(
        'Cannot publish lab template: At least one learning objective is required.'
      );
    }

    return prisma.labTemplate.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: {
        challenges: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  /**
   * Archive a lab template.
   */
  static async archive(id: string) {
    await this.getById(id);
    return prisma.labTemplate.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  /**
   * Delete a lab template if it is not currently attached to active workshops.
   */
  static async delete(id: string) {
    const template = await this.getById(id);

    const activeWorkshopLabs = template.workshopLabs.filter(
      (wl) => wl.workshop.status === 'PUBLISHED' || wl.workshop.status === 'ONGOING'
    );

    if (activeWorkshopLabs.length > 0) {
      throw new ConflictError(
        `Cannot delete template: It is currently attached to ${activeWorkshopLabs.length} active or ongoing workshop(s).`
      );
    }

    return prisma.labTemplate.delete({
      where: { id },
    });
  }

  /**
   * Creates an immutable JSON snapshot of the template and all challenges.
   * This is attached to `WorkshopLab.labSnapshot` so edits to the template library
   * do not modify or corrupt running workshop curricula.
   */
  static async createSnapshot(templateId: string) {
    const template = await this.getById(templateId);

    return {
      snapshotAt: new Date().toISOString(),
      template: {
        id: template.id,
        name: template.name,
        shortDescription: template.shortDescription,
        description: template.description,
        domain: template.domain,
        difficulty: template.difficulty,
        estimatedDuration: template.estimatedDuration,
        environmentType: template.environmentType,
        coverImageUrl: template.coverImageUrl,
        tags: template.tags,
        requiredTools: template.requiredTools,
        learningObjectives: template.learningObjectives,
        prerequisites: template.prerequisites,
        version: template.version,
      },
      challenges: template.challenges.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        instructions: c.instructions,
        challengeType: c.challengeType,
        difficulty: c.difficulty,
        points: c.points,
        timeLimit: c.timeLimit,
        displayOrder: c.displayOrder,
        hints: c.hints,
        referenceMaterial: c.referenceMaterial,
        solutionData: c.solutionData,
        explanation: c.explanation,
        evaluationType: c.evaluationType,
        tasks: c.tasks,
      })),
    };
  }

  /**
   * Computes usage and performance analytics for a lab template.
   */
  static async getAnalytics(templateId: string) {
    const template = await this.getById(templateId);

    const challengeIds = template.challenges.map((c) => c.id);

    // Fetch all submissions for challenges belonging to this template
    const submissions = await prisma.challengeSubmission.findMany({
      where: {
        challengeId: { in: challengeIds },
      },
      select: {
        id: true,
        challengeId: true,
        studentId: true,
        status: true,
        score: true,
        pointsAwarded: true,
        submittedAt: true,
      },
    });

    const totalSubmissions = submissions.length;
    const passedSubmissions = submissions.filter((s) => s.status === 'PASSED').length;
    const totalStudentsSet = new Set(submissions.map((s) => s.studentId));
    const uniqueStudents = totalStudentsSet.size;

    // Challenge-by-challenge breakdown
    const challengeStats = template.challenges.map((ch) => {
      const chSubs = submissions.filter((s) => s.challengeId === ch.id);
      const chPassed = chSubs.filter((s) => s.status === 'PASSED').length;
      const chFailed = chSubs.filter((s) => s.status === 'FAILED').length;
      const passRate = chSubs.length > 0 ? Math.round((chPassed / chSubs.length) * 100) : 0;
      const avgScore =
        chPassed > 0
          ? Math.round(chSubs.reduce((acc, curr) => acc + (curr.score || 0), 0) / chSubs.length)
          : 0;

      return {
        id: ch.id,
        title: ch.title,
        challengeType: ch.challengeType,
        difficulty: ch.difficulty,
        points: ch.points,
        displayOrder: ch.displayOrder,
        totalAttempts: chSubs.length,
        passedCount: chPassed,
        failedCount: chFailed,
        passRate,
        avgScore,
      };
    });

    return {
      templateId: template.id,
      name: template.name,
      domain: template.domain,
      status: template.status,
      version: template.version,
      totalChallenges: template.challenges.length,
      attachedWorkshopsCount: template.workshopLabs.length,
      attachedWorkshops: template.workshopLabs.map((wl) => ({
        id: wl.workshop.id,
        title: wl.workshop.title,
        status: wl.workshop.status,
        startDate: wl.workshop.startDate,
      })),
      totalSubmissions,
      passedSubmissions,
      overallPassRate: totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) : 0,
      uniqueStudents,
      challengeStats,
    };
  }
}
