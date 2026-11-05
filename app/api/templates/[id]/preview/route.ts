import { NextRequest } from 'next/server';
import { TemplateService } from '@/lib/services/template.service';
import { sanitizeChallengeForStudent } from '@/lib/challenges/evaluator';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const revealSolutions = searchParams.get('instructorMode') === 'true';

    const template = await TemplateService.getById(params.id);

    const challenges = template.challenges.map((ch) => {
      if (revealSolutions) {
        return ch; // Full data including solutionData for instructor preview inspection
      }
      return sanitizeChallengeForStudent(ch, { isPreviewMode: true });
    });

    return apiSuccess({
      template: {
        id: template.id,
        name: template.name,
        shortDescription: template.shortDescription,
        description: template.description,
        domain: template.domain,
        difficulty: template.difficulty,
        estimatedDuration: template.estimatedDuration,
        environmentType: template.environmentType,
        learningObjectives: template.learningObjectives,
        prerequisites: template.prerequisites,
        coverImageUrl: template.coverImageUrl,
        tags: template.tags,
        requiredTools: template.requiredTools,
        version: template.version,
        status: template.status,
      },
      challenges,
      previewMode: true,
      instructorMode: revealSolutions,
    });
  } catch (err) {
    return apiError(err);
  }
}
