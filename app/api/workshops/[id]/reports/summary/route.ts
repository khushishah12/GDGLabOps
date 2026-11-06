import { NextRequest, NextResponse } from 'next/server';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { ReportService } from '@/lib/services/report.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireWorkshopOwnership(params.id);
    const htmlContent = await ReportService.generateWorkshopSummaryHtml(params.id);

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to generate report' } },
      { status: err.statusCode || 500 }
    );
  }
}
