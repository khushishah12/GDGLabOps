import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const published = await WorkshopService.publish(params.id);
    return apiSuccess(published, 'Workshop published successfully');
  } catch (err) {
    return apiError(err);
  }
}
