import prisma from '@/lib/prisma';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { z } from 'zod';
import { createOrganisationSchema, updateOrganisationSchema } from '@/lib/validations';

export class OrganisationService {
  static async create(data: z.infer<typeof createOrganisationSchema>) {
    const existing = await prisma.organisation.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new ConflictError(`An organisation with slug "${data.slug}" already exists`);
    }

    return prisma.organisation.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        logo: data.logo || null,
      },
    });
  }

  static async list() {
    return prisma.organisation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            workshops: true,
            labTemplates: true,
          },
        },
      },
    });
  }

  static async getById(id: string) {
    const org = await prisma.organisation.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        },
        workshops: {
          take: 10,
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!org) {
      throw new NotFoundError(`Organisation with ID "${id}" was not found`);
    }
    return org;
  }

  static async update(id: string, data: z.infer<typeof updateOrganisationSchema>) {
    await this.getById(id);
    return prisma.organisation.update({
      where: { id },
      data,
    });
  }
}
