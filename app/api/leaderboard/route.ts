import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { requireAuthenticatedUser } from '@/lib/auth/rbac';
import { GamificationService } from '@/lib/services/gamification.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const url = new URL(req.url);

    const scope = (url.searchParams.get('scope') || 'all-time') as
      | 'all-time'
      | 'monthly'
      | 'organisation'
      | 'workshop';
    const scopeId = url.searchParams.get('scopeId') || undefined;
    const limit = Number(url.searchParams.get('limit')) || 50;
    const offset = Number(url.searchParams.get('offset')) || 0;

    const data = await GamificationService.getLeaderboard({
      scope,
      scopeId,
      limit,
      offset,
      currentUserId: user?.id,
    });

    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();

    const updated = await GamificationService.toggleLeaderboardOptOut(
      user.id,
      Boolean(body.optOut)
    );

    return apiSuccess(
      updated,
      body.optOut
        ? 'You are now masked as Anonymous on public leaderboards.'
        : 'Your profile is now visible on public leaderboards.'
    );
  } catch (err) {
    return apiError(err);
  }
}
