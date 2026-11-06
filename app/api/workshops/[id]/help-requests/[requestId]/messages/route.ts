import { NextRequest } from 'next/server';
import { HelpRequestService } from '@/lib/services/help-request.service';
import { createHelpMessageSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; requestId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await req.json();
    const validated = createHelpMessageSchema.parse(body);

    const message = await HelpRequestService.sendMessage({
      helpRequestId: params.requestId,
      senderId: user.id,
      senderRole: user.role,
      message: validated.message,
    });

    return apiSuccess(message, 'Message sent', 201);
  } catch (err) {
    return apiError(err);
  }
}
