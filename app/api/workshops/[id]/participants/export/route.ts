import { NextRequest, NextResponse } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { WorkshopService } from '@/lib/services/workshop.service';
import { apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (user) {
      await requireWorkshopOwnership(params.id);
    }

    const workshop = await WorkshopService.getById(params.id);
    const csvContent = await RegistrationService.exportParticipantsCSV(workshop.id);

    const filename = `participants-${workshop.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
