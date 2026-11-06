import prisma from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';
import { AnalyticsService } from './analytics.service';

export class ReportService {
  /**
   * Generates an RFC 4180 compliant CSV export for a workshop.
   */
  static async generateWorkshopCsv(workshopId: string): Promise<string> {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        registrations: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { registeredAt: 'asc' },
        },
        feedbacks: true,
      },
    });

    if (!workshop) {
      throw new NotFoundError(`Workshop with ID "${workshopId}" not found`);
    }

    // Fetch lab sessions count and points per student for this workshop
    const [sessions, submissions, transactions] = await Promise.all([
      prisma.labSession.findMany({
        where: { workshopId },
        select: { studentId: true },
      }),
      prisma.challengeSubmission.findMany({
        where: { workshopId, status: 'PASSED' },
        select: { studentId: true, challengeId: true },
      }),
      prisma.pointsTransaction.groupBy({
        by: ['userId'],
        where: { workshopId },
        _sum: { amount: true },
      }),
    ]);

    const sessionsByStudent: Record<string, number> = {};
    sessions.forEach((s) => {
      sessionsByStudent[s.studentId] = (sessionsByStudent[s.studentId] || 0) + 1;
    });

    const passedChallengesByStudent: Record<string, Set<string>> = {};
    submissions.forEach((sub) => {
      if (!passedChallengesByStudent[sub.studentId]) {
        passedChallengesByStudent[sub.studentId] = new Set();
      }
      passedChallengesByStudent[sub.studentId].add(sub.challengeId);
    });

    const pointsByStudent: Record<string, number> = {};
    transactions.forEach((tx) => {
      pointsByStudent[tx.userId] = tx._sum.amount || 0;
    });

    const feedbackByStudent: Record<string, { rating: number; comments: string }> = {};
    workshop.feedbacks.forEach((fb) => {
      feedbackByStudent[fb.studentId] = {
        rating: fb.overallRating,
        comments: fb.comments || '',
      };
    });

    // Helper to escape RFC 4180 CSV cell
    const escapeCsv = (str: any): string => {
      if (str === null || str === undefined) return '';
      const stringValue = String(str);
      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n') ||
        stringValue.includes('\r')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headers = [
      'Student Name',
      'Student Email',
      'Registration Status',
      'Attendance Status',
      'Registration Date',
      'Lab Sessions Started',
      'Challenges Passed',
      'Points Earned',
      'Feedback Rating',
      'Feedback Comments',
    ];

    const rows: string[] = [headers.join(',')];

    for (const reg of workshop.registrations) {
      const studentId = reg.student.id;
      const fb = feedbackByStudent[studentId];

      const row = [
        escapeCsv(reg.student.name),
        escapeCsv(reg.student.email),
        escapeCsv(reg.status),
        escapeCsv(reg.attendanceStatus),
        escapeCsv(reg.registeredAt.toISOString().split('T')[0]),
        escapeCsv(sessionsByStudent[studentId] || 0),
        escapeCsv(passedChallengesByStudent[studentId]?.size || 0),
        escapeCsv(pointsByStudent[studentId] || 0),
        escapeCsv(fb ? fb.rating.toFixed(1) : 'N/A'),
        escapeCsv(fb ? fb.comments : ''),
      ];

      rows.push(row.join(','));
    }

    return rows.join('\r\n');
  }

  /**
   * Generates a clean, printable HTML executive summary report for a workshop.
   */
  static async generateWorkshopSummaryHtml(workshopId: string): Promise<string> {
    const data = await AnalyticsService.getWorkshopPerformanceAnalytics(workshopId);
    const { workshop, registration, attendance, labs, challengeAnalytics, helpRequests, feedback } = data;

    const formattedStartDate = new Date(workshop.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${workshop.title} — Executive Analytics Report</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 32px 48px;
      line-height: 1.5;
    }
    header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: #eff6ff;
      color: #2563eb;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      background: #f8fafc;
    }
    .kpi-label { font-size: 13px; color: #64748b; font-weight: 500; }
    .kpi-value { font-size: 26px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .kpi-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    
    h2 { font-size: 18px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-weight: 600; color: #334155; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    
    .rating-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      margin-bottom: 6px;
    }
    .rating-fill {
      height: 8px;
      background: #3b82f6;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
      Print / Save as PDF
    </button>
  </div>

  <header>
    <div>
      <span class="badge">GDG LabOps Workshop Performance Report</span>
      <h1 style="font-size: 24px; margin-top: 8px; color: #0f172a;">${workshop.title}</h1>
      <p style="color: #64748b; font-size: 14px; margin-top: 4px;">
        Instructor: ${workshop.instructorName || 'GDG Instructor'} &bull; Date: ${formattedStartDate} &bull; Domain: ${workshop.domain}
      </p>
    </div>
    <div style="text-align: right;">
      <p style="font-weight: 600; font-size: 14px; color: #1e293b;">${workshop.organisation?.name || 'GDG Chapter'}</p>
      <p style="font-size: 12px; color: #64748b;">Status: ${workshop.status}</p>
    </div>
  </header>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Registrations</div>
      <div class="kpi-value">${registration.total}</div>
      <div class="kpi-sub">${registration.capacityUtilization}% Capacity Utilisation</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Attendance Rate</div>
      <div class="kpi-value">${attendance.attendanceRate}%</div>
      <div class="kpi-sub">${attendance.attended} of ${registration.approved} attended</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Lab Sessions</div>
      <div class="kpi-value">${labs.totalSessions}</div>
      <div class="kpi-sub">${labs.completed} completed, ${labs.failed} failed</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Satisfaction Score</div>
      <div class="kpi-value">${feedback.averageOverall ? feedback.averageOverall.toFixed(1) + ' / 5.0' : 'N/A'}</div>
      <div class="kpi-sub">${feedback.totalResponses} student reviews</div>
    </div>
  </div>

  <h2>Challenge Completion & Difficulty Analysis</h2>
  <table>
    <thead>
      <tr>
        <th>Challenge Title</th>
        <th>Difficulty</th>
        <th>Submissions</th>
        <th>Pass Rate</th>
        <th>Avg Attempts</th>
        <th>Abandonment</th>
      </tr>
    </thead>
    <tbody>
      ${
        challengeAnalytics.length === 0
          ? '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">No challenges configured.</td></tr>'
          : challengeAnalytics
              .map(
                (ch: any) => `
        <tr>
          <td style="font-weight: 600;">${ch.title} ${ch.isHardest ? '<span style="color: #ef4444; font-size: 10px; margin-left: 4px;">⚠️ HIGH DIFFICULTY</span>' : ''}</td>
          <td>${ch.difficulty}</td>
          <td>${ch.totalSubmissions}</td>
          <td>${ch.passRate}%</td>
          <td>${ch.averageAttempts}</td>
          <td>${ch.abandonmentRate}%</td>
        </tr>
      `
              )
              .join('')
      }
    </tbody>
  </table>

  <h2>Participant Assistance & Support</h2>
  <div style="display: flex; gap: 24px; margin-bottom: 28px;">
    <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
      <p style="font-size: 13px; color: #64748b;">Total Help Requests</p>
      <p style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 4px 0;">${helpRequests.total}</p>
      <p style="font-size: 12px; color: #10b981;">${helpRequests.resolved} resolved (${helpRequests.open} open)</p>
    </div>
    <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
      <p style="font-size: 13px; color: #64748b;">Average Resolution Time</p>
      <p style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 4px 0;">${helpRequests.averageResolutionMinutes} min</p>
      <p style="font-size: 12px; color: #64748b;">From student submission to resolved</p>
    </div>
  </div>

  <h2>Student Feedback Breakdown</h2>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
      <h3 style="font-size: 14px; margin-bottom: 12px; color: #334155;">Criteria Averages</h3>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
        <span>Content Quality:</span>
        <strong>${feedback.averageContent ? feedback.averageContent.toFixed(1) : 'N/A'} / 5.0</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
        <span>Instructor Effectiveness:</span>
        <strong>${feedback.averageInstructor ? feedback.averageInstructor.toFixed(1) : 'N/A'} / 5.0</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
        <span>Lab Sandbox Quality:</span>
        <strong>${feedback.averageLabQuality ? feedback.averageLabQuality.toFixed(1) : 'N/A'} / 5.0</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
        <span>Platform Experience:</span>
        <strong>${feedback.averagePlatform ? feedback.averagePlatform.toFixed(1) : 'N/A'} / 5.0</strong>
      </div>
    </div>

    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
      <h3 style="font-size: 14px; margin-bottom: 12px; color: #334155;">Rating Distribution</h3>
      ${[5, 4, 3, 2, 1]
        .map((stars) => {
          const count = feedback.ratingDistribution[stars] || 0;
          const pct = feedback.totalResponses > 0 ? (count / feedback.totalResponses) * 100 : 0;
          return `
          <div class="rating-bar">
            <span style="width: 40px;">${stars} ★</span>
            <div style="flex: 1; background: #e2e8f0; border-radius: 4px; height: 8px;">
              <div class="rating-fill" style="width: ${pct}%;"></div>
            </div>
            <span style="width: 30px; text-align: right;">${count}</span>
          </div>
        `;
        })
        .join('')}
    </div>
  </div>

  <div class="footer">
    <div>Generated by GDG LabOps Analytics Engine</div>
    <div>${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</div>
  </div>
</body>
</html>`;

    return html;
  }
}
