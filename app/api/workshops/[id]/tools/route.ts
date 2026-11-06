import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import {
  ENVIRONMENT_PROFILES,
  TOOL_CATALOGUE,
  EnvironmentProfileId,
  getAvailableToolsForProfile,
  validateAndResolveTools,
  getProfileForCategory,
} from '@/lib/workshop/tool-catalogue';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';
import { z } from 'zod';

const updateToolsSchema = z.object({
  toolIds: z.array(z.string()).min(1, 'At least one tool must be selected'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workshop = await WorkshopService.getById(params.id);
    const profileId = (workshop.environmentProfile as EnvironmentProfileId) ||
      getProfileForCategory(workshop.domain);
    const profile = ENVIRONMENT_PROFILES[profileId];

    const currentToolIds = (workshop.requiredTools as string[] | null) ||
      profile?.defaultToolIds ||
      [];

    const validation = validateAndResolveTools(profileId, currentToolIds);
    const availableCatalogue = getAvailableToolsForProfile(profileId);

    return apiSuccess({
      workshopId: workshop.id,
      workshopTitle: workshop.title,
      domain: workshop.domain,
      environmentProfile: profileId,
      profileDetails: profile,
      environmentStatus: workshop.environmentStatus,
      environmentVersion: workshop.environmentVersion,
      selectedToolIds: validation.resolvedToolIds,
      configuredTools: validation.resolvedTools,
      availableCatalogue,
      warnings: validation.warnings,
      requiresDesktop: validation.requiresDesktop,
      accessMethod: validation.requiresDesktop ? 'desktop' : 'terminal',
      targetEnvironmentNotice: profile?.targetEnvironmentNotice || null,
      powerBiNotice: profile?.powerBiNotice || null,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (user) {
      await requireWorkshopOwnership(params.id);
    }

    const body = await req.json();
    const { toolIds } = updateToolsSchema.parse(body);

    const updated = await WorkshopService.updateWorkshopTools(params.id, toolIds);

    const profileId = updated.environmentProfile as EnvironmentProfileId;
    const validation = validateAndResolveTools(
      profileId,
      (updated.requiredTools as string[]) || []
    );

    return apiSuccess({
      workshop: updated,
      configuredTools: validation.resolvedTools,
      warnings: validation.warnings,
      requiresDesktop: validation.requiresDesktop,
      environmentVersion: updated.environmentVersion,
      environmentStatus: updated.environmentStatus,
    }, 'Workshop tools updated and environment configuration updated successfully');
  } catch (err) {
    return apiError(err);
  }
}
