import prisma from '@/lib/prisma';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { createWorkshopSchema, updateWorkshopSchema } from '@/lib/validations';

export class WorkshopService {
  static async create(data: z.infer<typeof createWorkshopSchema>) {
    // 1. Verify Organisation exists
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
    });
    if (!org) {
      throw new NotFoundError(`Organisation with ID "${data.organisationId}" does not exist`);
    }

    // 2. Verify Organiser exists
    const organiser = await prisma.user.findUnique({
      where: { id: data.organiserId },
    });
    if (!organiser) {
      throw new NotFoundError(`User organiser with ID "${data.organiserId}" does not exist`);
    }

    // 3. Verify slug and event code uniqueness
    const existingSlug = await prisma.workshop.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new ConflictError(`Workshop slug "${data.slug}" is already in use`);
    }

    const existingCode = await prisma.workshop.findUnique({
      where: { registrationCode: data.registrationCode },
    });
    if (existingCode) {
      throw new ConflictError(`Registration code "${data.registrationCode}" is already in use`);
    }

    // 4. Create workshop with optional initial lab templates inside a transaction
    return prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.create({
        data: {
          organisationId: data.organisationId,
          organiserId: data.organiserId,
          title: data.title,
          slug: data.slug,
          description: data.description,
          domain: data.domain,
          bannerUrl: data.bannerUrl || null,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          duration: data.duration,
          registrationDeadline: new Date(data.registrationDeadline),
          participantLimit: data.participantLimit,
          registrationCode: data.registrationCode,
          status: 'DRAFT',
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

  static async list(params?: {
    domain?: string;
    status?: string;
    search?: string;
    organisationId?: string;
  }) {
    const where: any = {};

    if (params?.domain && params.domain !== 'ALL') {
      where.domain = params.domain;
    }

    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params?.organisationId) {
      where.organisationId = params.organisationId;
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { registrationCode: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return prisma.workshop.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
        organiser: { select: { id: true, name: true, email: true, avatar: true } },
        workshopLabs: {
          include: {
            labTemplate: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            registrations: true,
            labSessions: true,
          },
        },
      },
    });
  }

  static async getById(id: string) {
    const workshop = await prisma.workshop.findUnique({
      where: { id },
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
            registrations: true,
            labSessions: true,
          },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundError(`Workshop with ID "${id}" was not found`);
    }

    return workshop;
  }

  static async getByCode(code: string) {
    const workshop = await prisma.workshop.findUnique({
      where: { registrationCode: code.toUpperCase() },
      include: {
        organisation: true,
        workshopLabs: {
          include: { labTemplate: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundError(`No workshop found matching event code "${code}"`);
    }

    return workshop;
  }

  static async update(id: string, data: z.infer<typeof updateWorkshopSchema>) {
    await this.getById(id);

    return prisma.workshop.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        domain: data.domain,
        bannerUrl: data.bannerUrl !== undefined ? data.bannerUrl : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        duration: data.duration,
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
        participantLimit: data.participantLimit,
        status: data.status as any,
      },
    });
  }

  static async publish(id: string) {
    const workshop = await this.getById(id);

    if (workshop.status === 'PUBLISHED') {
      return workshop;
    }

    if (workshop.status === 'COMPLETED' || workshop.status === 'CANCELLED') {
      throw new ConflictError(`Cannot publish workshop currently in ${workshop.status} state`);
    }

    return prisma.workshop.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  static async cancel(id: string) {
    const workshop = await this.getById(id);
    if (workshop.status === 'COMPLETED') {
      throw new ConflictError('Cannot cancel an already completed workshop');
    }

    return prisma.workshop.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  static async delete(id: string) {
    const workshop = await this.getById(id);

    // Business Rule: Published workshops cannot be silently deleted
    if (workshop.status !== 'DRAFT') {
      throw new ForbiddenError(
        `Workshops with status "${workshop.status}" cannot be deleted. Cancel the workshop instead.`
      );
    }

    return prisma.workshop.delete({
      where: { id },
    });
  }
}
