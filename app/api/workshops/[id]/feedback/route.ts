import { NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth/rbac';
import { FeedbackService } from '@/lib/services/feedback.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthenticatedUser();
    const url = new URL(req.url);
    const selfOnly = url.searchParams.get('self') === 'true';

    if (selfOnly || user.role === 'STUDENT') {
      const myFeedback = await FeedbackService.getStudentFeedback(params.id, user.id);
      return apiSuccess(myFeedback);
    }

    // Organisers get the aggregated summary
    const summary = await FeedbackService.getWorkshopFeedbackSummary(params.id);
    return apiSuccess(summary);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();

    const feedback = await FeedbackService.submitFeedback({
      workshopId: params.id,
      studentId: user.id,
      contentRating: Number(body.contentRating) || 5,
      instructorRating: Number(body.instructorRating) || 5,
      labQualityRating: Number(body.labQualityRating) || 5,
      platformExperienceRating: Number(body.platformExperienceRating) || 5,
      overallRating: body.overallRating ? Number(body.overallRating) : undefined,
      comments: body.comments,
      suggestions: body.suggestions,
    });

    return apiSuccess(feedback, 'Feedback submitted successfully');
  } catch (err) {
    return apiError(err);
  }
}
