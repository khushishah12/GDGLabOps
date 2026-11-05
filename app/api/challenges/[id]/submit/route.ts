import { NextRequest } from 'next/server';
import { ChallengeService } from '@/lib/services/challenge.service';
import { submitChallengeSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const studentId = user ? user.id : body.studentId;
    if (!studentId) {
      throw new UnauthorizedError('Authentication required to submit challenge answer');
    }

    body.challengeId = params.id;
    body.studentId = studentId;

    const validated = submitChallengeSchema.parse(body);

    const result = await ChallengeService.submitAndEvaluate({
      studentId,
      challengeId: params.id,
      workshopId: validated.workshopId,
      labSessionId: validated.labSessionId,
      answer: validated.answer,
      usedHintIds: validated.usedHintIds,
    });

    return apiSuccess(
      {
        submissionId: result.submission.id,
        passed: result.evaluation.passed,
        score: result.evaluation.score,
        pointsAwarded: result.netPointsAwarded,
        totalPointsEarned: result.submission.pointsAwarded,
        alreadyPassed: result.alreadyPassed,
        feedback: result.evaluation.feedback,
        penaltyPercent: result.evaluation.totalPenaltyPercent,
        requiresManualReview: result.evaluation.requiresManualReview || false,
        unlockedExplanation: result.evaluation.unlockedExplanation,
      },
      result.evaluation.passed ? 'Challenge passed!' : 'Submission evaluated'
    );
  } catch (err) {
    return apiError(err);
  }
}
