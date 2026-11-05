import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cancelled = await WorkshopService.cancel(params.id);
    return apiSuccess(cancelled, 'Workshop cancelled successfully');
  } catch (err) {
    return apiError(err);
  }
}
