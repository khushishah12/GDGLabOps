import prisma from '@/lib/prisma';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { createWorkshopSchema, updateWorkshopSchema } from '@/lib/validations';
import { generateUniqueJoiningCode } from '@/lib/workshop/joining-code';
import { computeEffectiveWorkshopStatus } from '@/lib/workshop/lifecycle';
import { WorkshopStatus, VenueType, Difficulty } from '@prisma/client';

export class WorkshopService {
  /**
   * Create a new workshop with cryptographic registration code and optional lab blueprints
   */
  static async create(raw: z.input<typeof createWorkshopSchema>, organiserId?: string) {
    const data = createWorkshopSchema.parse(raw);
    const finalOrganiserId = organiserId || data.organiserId;
    if (!finalOrganiserId) {
      throw new ValidationError('Organiser identity is required to create a workshop.');
    }

    // 1. Verify Organisation exists
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
    });
    if (!org) {
      throw new NotFoundError(`Organisation with ID "${data.organisationId}" does not exist`);
    }

    // 2. Verify slug uniqueness
    const existingSlug = await prisma.workshop.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new ConflictError(`Workshop slug "${data.slug}" is already in use`);
    }

    // 3. Generate or verify registration code
    let finalCode = data.registrationCode;
    if (!finalCode) {
      finalCode = await generateUniqueJoiningCode(data.domain || 'DEV');
    } else {
      const existingCode = await prisma.workshop.findUnique({
        where: { registrationCode: finalCode },
      });
      if (existingCode) {
        throw new ConflictError(`Registration code "${finalCode}" is already in use`);
      }
    }

    // 4. Create workshop record inside transaction
    return prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.create({
        data: {
          organisationId: data.organisationId,
          organiserId: finalOrganiserId,
          title: data.title.trim(),
          slug: data.slug.trim(),
          shortDescription: data.shortDescription?.trim() || null,
          description: data.description.trim(),
          domain: data.domain,
          difficulty: (data.difficulty as Difficulty) || Difficulty.BEGINNER,
          bannerUrl: data.bannerUrl || null,
          tags: data.tags || [],
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          duration: data.duration,
          timezone: data.timezone || 'UTC',
          venueType: (data.venueType as VenueType) || VenueType.ONLINE,
          venueAddress: data.venueAddress || null,
          instructorName: data.instructorName || null,
          instructorBio: data.instructorBio || null,
          registrationOpensAt: data.registrationOpensAt ? new Date(data.registrationOpensAt) : null,
          registrationDeadline: new Date(data.registrationDeadline),
          participantLimit: data.participantLimit || 50,
          requiresApproval: data.requiresApproval || false,
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          codeJoinEnabled: data.codeJoinEnabled !== undefined ? data.codeJoinEnabled : true,
          registrationCode: finalCode,
          status: (data.status as WorkshopStatus) || WorkshopStatus.DRAFT,
        },
      });

      if (data.labTemplateIds && data.labTemplateIds.length > 0) {
        for (let i = 0; i < data.labTemplateIds.length; i++) {
          await tx.workshopLab.create({
            data: {
              workshopId: workshop.id,
              labTemplateId: data.labTemplateIds[i],
              displayOrder: i + 1,
              isRequired: true,
            },
          });
        }
      }

      return workshop;
    });
  }

  /**
   * Duplicate an existing workshop as a draft starting point
   */
  static async duplicate(id: string, organiserId: string) {
    const original = await this.getById(id);

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const newSlug = `${original.slug}-copy-${randomSuffix}`;
    const newTitle = `${original.title} (Copy)`;
    const newRegistrationCode = await generateUniqueJoiningCode(original.domain || 'DEV');

    // Default dates 7 days ahead
    const now = new Date();
    const newStartDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newEndDate = new Date(newStartDate.getTime() + original.duration * 60 * 1000);
    const newDeadline = new Date(newStartDate.getTime() - 24 * 60 * 60 * 1000);

    return prisma.$transaction(async (tx) => {
      const duplicated = await tx.workshop.create({
        data: {
          organisationId: original.organisationId,
          organiserId,
          title: newTitle,
          slug: newSlug,
          shortDescription: original.shortDescription,
          description: original.description,
          domain: original.domain,
          difficulty: original.difficulty,
          bannerUrl: original.bannerUrl,
          tags: original.tags,
          startDate: newStartDate,
          endDate: newEndDate,
          duration: original.duration,
          timezone: original.timezone,
          venueType: original.venueType,
          venueAddress: original.venueAddress,
          instructorName: original.instructorName,
          instructorBio: original.instructorBio,
          registrationOpensAt: now,
          registrationDeadline: newDeadline,
          participantLimit: original.participantLimit,
          requiresApproval: original.requiresApproval,
          isPublic: false, // Private by default until published
          codeJoinEnabled: true,
          registrationCode: newRegistrationCode,
          status: WorkshopStatus.DRAFT,
        },
      });

      // Clone attached lab templates
      if (original.workshopLabs && original.workshopLabs.length > 0) {
        for (const lab of original.workshopLabs) {
          await tx.workshopLab.create({
            data: {
              workshopId: duplicated.id,
              labTemplateId: lab.labTemplateId,
              displayOrder: lab.displayOrder,
              isRequired: lab.isRequired,
            },
          });
        }
      }

      return duplicated;
    });
  }

  /**
   * List workshops with rich filtering, search, pagination, and calculated effective statuses
   */
  static async list(params?: {
    domain?: string;
    difficulty?: string;
    venueType?: string;
    status?: string;
    search?: string;
    organisationId?: string;
    isPublic?: boolean;
    upcomingOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};

    if (params?.domain && params.domain !== 'ALL') {
      where.domain = params.domain;
    }

    if (params?.difficulty && params.difficulty !== 'ALL') {
      where.difficulty = params.difficulty;
    }

    if (params?.venueType && params.venueType !== 'ALL') {
      where.venueType = params.venueType;
    }

    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params?.organisationId) {
      where.organisationId = params.organisationId;
    }

    if (params?.isPublic !== undefined) {
      where.isPublic = params.isPublic;
    }

    if (params?.upcomingOnly) {
      where.startDate = { gte: new Date() };
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { shortDescription: { contains: params.search, mode: 'insensitive' } },
        { registrationCode: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * limit;

    const [total, workshops] = await Promise.all([
      prisma.workshop.count({ where }),
      prisma.workshop.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
        include: {
          organisation: { select: { id: true, name: true, slug: true, logo: true } },
          organiser: { select: { id: true, name: true, email: true, avatar: true } },
          workshopLabs: {
            include: { labTemplate: true },
            orderBy: { displayOrder: 'asc' },
          },
          _count: {
            select: {
              registrations: {
                where: { status: 'REGISTERED' },
              },
            },
          },
        },
      }),
    ]);

    // Compute effective real-time status for each workshop
    const items = workshops.map((w) => {
      const confirmedCount = w._count.registrations;
      const effectiveStatus = computeEffectiveWorkshopStatus(w, confirmedCount);
      return {
        ...w,
        effectiveStatus,
        confirmedRegistrations: confirmedCount,
        availableSeats: Math.max(0, w.participantLimit - confirmedCount),
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve single workshop by ID or slug
   */
  static async getById(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const workshop = await prisma.workshop.findFirst({
      where: isUuid ? { id } : { slug: id },
      include: {
        organisation: true,
        organiser: { select: { id: true, name: true, email: true, avatar: true } },
        workshopLabs: {
          include: {
            labTemplate: {
              include: {
                challenges: {
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    tasks: { orderBy: { displayOrder: 'asc' } },
                  },
                },
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            registrations: { where: { status: 'REGISTERED' } },
            labSessions: true,
          },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundError(`Workshop "${id}" was not found`);
    }

    const confirmedCount = workshop._count.registrations;
    const effectiveStatus = computeEffectiveWorkshopStatus(workshop, confirmedCount);

    return {
      ...workshop,
      effectiveStatus,
      confirmedRegistrations: confirmedCount,
      availableSeats: Math.max(0, workshop.participantLimit - confirmedCount),
    };
  }

  /**
   * Lookup workshop by joining code (safe for students)
   */
  static async getByJoiningCode(code: string) {
    const normalizedCode = code.toUpperCase().trim();

    const workshop = await prisma.workshop.findUnique({
      where: { registrationCode: normalizedCode },
      include: {
        organisation: { select: { id: true, name: true, slug: true, logo: true } },
        workshopLabs: {
          include: { labTemplate: true },
        },
        _count: {
          select: {
            registrations: { where: { status: 'REGISTERED' } },
          },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundError('Invalid invitation code. No workshop matches this code.');
    }

    if (!workshop.codeJoinEnabled) {
      throw new ForbiddenError('Code-based registration is currently disabled for this workshop.');
    }

    const confirmedCount = workshop._count.registrations;
    const effectiveStatus = computeEffectiveWorkshopStatus(workshop, confirmedCount);

    return {
      ...workshop,
      effectiveStatus,
      confirmedRegistrations: confirmedCount,
      availableSeats: Math.max(0, workshop.participantLimit - confirmedCount),
    };
  }

  /**
   * Update workshop details
   */
  static async update(id: string, data: z.infer<typeof updateWorkshopSchema>) {
    await this.getById(id);

    return prisma.workshop.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.shortDescription !== undefined ? { shortDescription: data.shortDescription?.trim() || null } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.domain ? { domain: data.domain } : {}),
        ...(data.difficulty ? { difficulty: data.difficulty as Difficulty } : {}),
        ...(data.bannerUrl !== undefined ? { bannerUrl: data.bannerUrl || null } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        ...(data.duration ? { duration: data.duration } : {}),
        ...(data.timezone ? { timezone: data.timezone } : {}),
        ...(data.venueType ? { venueType: data.venueType as VenueType } : {}),
        ...(data.venueAddress !== undefined ? { venueAddress: data.venueAddress || null } : {}),
        ...(data.instructorName !== undefined ? { instructorName: data.instructorName || null } : {}),
        ...(data.instructorBio !== undefined ? { instructorBio: data.instructorBio || null } : {}),
        ...(data.registrationOpensAt !== undefined
          ? { registrationOpensAt: data.registrationOpensAt ? new Date(data.registrationOpensAt) : null }
          : {}),
        ...(data.registrationDeadline ? { registrationDeadline: new Date(data.registrationDeadline) } : {}),
        ...(data.participantLimit ? { participantLimit: data.participantLimit } : {}),
        ...(data.requiresApproval !== undefined ? { requiresApproval: data.requiresApproval } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(data.codeJoinEnabled !== undefined ? { codeJoinEnabled: data.codeJoinEnabled } : {}),
        ...(data.status ? { status: data.status as WorkshopStatus } : {}),
      },
    });
  }

  /**
   * Publish a draft workshop
   */
  static async publish(id: string) {
    const workshop = await this.getById(id);

    if (workshop.status === WorkshopStatus.PUBLISHED) {
      return workshop;
    }

    if (workshop.status === WorkshopStatus.COMPLETED || workshop.status === WorkshopStatus.CANCELLED) {
      throw new ConflictError(`Cannot publish workshop currently in ${workshop.status} state`);
    }

    return prisma.workshop.update({
      where: { id },
      data: { status: WorkshopStatus.PUBLISHED },
    });
  }

  /**
   * Unpublish a workshop back to DRAFT (Only allowed if zero registered participants)
   */
  static async unpublish(id: string) {
    const workshop = await this.getById(id);

    if (workshop.confirmedRegistrations > 0) {
      throw new ConflictError(
        `Cannot unpublish workshop with ${workshop.confirmedRegistrations} confirmed registrations. Cancel the workshop instead.`
      );
    }

    return prisma.workshop.update({
      where: { id },
      data: { status: WorkshopStatus.DRAFT },
    });
  }

  /**
   * Cancel a workshop
   */
  static async cancel(id: string) {
    const workshop = await this.getById(id);

    if (workshop.status === WorkshopStatus.COMPLETED) {
      throw new ConflictError('Cannot cancel an already completed workshop.');
    }

    return prisma.workshop.update({
      where: { id },
      data: { status: WorkshopStatus.CANCELLED },
    });
  }

  /**
   * Regenerate unique joining code
   */
  static async regenerateCode(id: string) {
    const workshop = await this.getById(id);
    const newCode = await generateUniqueJoiningCode(workshop.domain || 'DEV');

    return prisma.workshop.update({
      where: { id },
      data: { registrationCode: newCode },
      select: { id: true, registrationCode: true },
    });
  }

  /**
   * Toggle code-based joining enabled/disabled
   */
  static async toggleCodeJoin(id: string, enabled: boolean) {
    await this.getById(id);

    return prisma.workshop.update({
      where: { id },
      data: { codeJoinEnabled: enabled },
      select: { id: true, codeJoinEnabled: true, registrationCode: true },
    });
  }

  /**
   * Permanently delete a draft workshop (disallowed if registrations exist)
   */
  static async delete(id: string) {
    const workshop = await this.getById(id);

    if (workshop.confirmedRegistrations > 0) {
      throw new ConflictError('Cannot delete a workshop with confirmed registrations. Cancel it instead.');
    }

    return prisma.$transaction(async (tx) => {
      await tx.workshopLab.deleteMany({ where: { workshopId: id } });
      await tx.workshopRegistration.deleteMany({ where: { workshopId: id } });
      return tx.workshop.delete({ where: { id } });
    });
  }
}
