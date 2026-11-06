import { NextRequest, NextResponse } from 'next/server';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { ReportService } from '@/lib/services/report.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireWorkshopOwnership(params.id);
    const csvContent = await ReportService.generateWorkshopCsv(params.id);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="workshop-${params.id}-report.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to export CSV' } },
      { status: err.statusCode || 500 }
    );
  }
}
