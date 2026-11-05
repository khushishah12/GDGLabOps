import { NextRequest } from 'next/server';
import { WorkshopLabService } from '@/lib/services/workshop-lab.service';
import { WorkshopService } from '@/lib/services/workshop.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { requireOrganiser, requireOrganisationMembership } from '@/lib/auth/rbac';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; labId: string } }
) {
  try {
    const user = await getCurrentUser();
    const workshop = await WorkshopService.getById(params.id);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(workshop.organisationId);
    }

    const detached = await WorkshopLabService.detach(params.id, params.labId);
    return apiSuccess(detached, 'Lab detached from workshop successfully');
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; labId: string } }
) {
  try {
    const user = await getCurrentUser();
    const workshop = await WorkshopService.getById(params.id);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(workshop.organisationId);
    }

    const body = await req.json().catch(() => ({}));
    if (body.action === 'sync_snapshot' || body.syncSnapshot) {
      // Find workshopLab record id
      const attachedLabs = await WorkshopLabService.listForWorkshop(params.id);
      const target = attachedLabs.find((l) => l.labTemplateId === params.labId || l.id === params.labId);
      if (!target) {
        throw new Error('Attached lab not found');
      }

      const synced = await WorkshopLabService.syncSnapshot(target.id);
      return apiSuccess(synced, 'Template snapshot refreshed to latest version');
    }

    return apiSuccess({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
