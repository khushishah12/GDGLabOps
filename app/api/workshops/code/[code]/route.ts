import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { ForbiddenError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // 1. Rate Limiting: Max 10 code lookup attempts per IP per 5 minutes to prevent code brute-forcing
    const forwarded = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `code-lookup:${forwarded}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 300);

    if (!rateLimit.success) {
      throw new ForbiddenError(
        `Too many code lookup attempts. Please wait ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.`
      );
    }

    const workshop = await WorkshopService.getByJoiningCode(params.code);
    return apiSuccess(workshop);
  } catch (err) {
    return apiError(err);
  }
}
