'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Download,
  Users,
  Trophy,
  Clock,
  TrendingUp,
  AlertTriangle,
  Layers,
  Star,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  FileText,
  Radio,
  Flame,
} from 'lucide-react';

export default function WorkshopAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const workshopId = params.id as string;
  const { error: toastError } = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workshopId) return;
    fetch(`/api/workshops/${workshopId}/analytics`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          toastError('Error', json.error?.message || 'Could not load workshop analytics');
        }
      })
      .catch((e) => toastError('Connection Error', e.message))
      .finally(() => setLoading(false));
  }, [workshopId]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="text-center py-16">
          <p className="text-slate-400">Workshop performance analytics could not be found.</p>
          <Link href="/dashboard/workshops">
            <Button variant="outline" size="sm" className="mt-4">
              Back to Workshops
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const { workshop, registration, attendance, labs, challengeAnalytics, helpRequests, feedback } = data;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/dashboard/workshops" className="hover:text-slate-300 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workshops
          </Link>
          <span>/</span>
          <span className="text-slate-300">{workshop.title}</span>
          <span>/</span>
          <span className="text-blue-400">Performance Analytics</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{workshop.title}</h1>
              <Badge variant="outline" size="sm">{workshop.domain}</Badge>
              <Badge variant="outline" size="sm">{workshop.difficulty}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Instructor: {workshop.instructorName || 'GDG Instructor'} &bull; Status: {workshop.status}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/dashboard/workshops/${workshopId}/live`}>
              <Button size="sm" variant="outline" className="text-xs border-emerald-500/30 text-emerald-400" leftIcon={<Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />}>
                Live Monitor
              </Button>
            </Link>

            <a href={`/api/workshops/${workshopId}/reports/csv`} download>
              <Button size="sm" variant="outline" className="text-xs" leftIcon={<Download className="w-3.5 h-3.5" />}>
                Export CSV
              </Button>
            </a>

            <a href={`/api/workshops/${workshopId}/reports/summary`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="text-xs" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                Executive Summary
              </Button>
            </a>
          </div>
        </div>

        {/* 4 Primary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Registration Performance */}
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Registrations</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-100">{registration.total}</span>
              <span className="text-xs text-slate-500">/ {registration.capacity} limit</span>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, registration.capacityUtilization)}%` }}
              ></div>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
              <span>{registration.approved} approved</span>
              <span>{registration.capacityUtilization}% utilised</span>
            </div>
          </Card>

          {/* Attendance Performance */}
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Attendance Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">
              {attendance.attendanceRate}%
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{attendance.attended} attended</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {attendance.currentlyOnline} online now
              </span>
            </div>
          </Card>

          {/* Labs Execution */}
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Lab Sessions</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{labs.totalSessions}</div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
              <span>{labs.completed} completed, {labs.failed} failed</span>
              <span>{labs.averageDurationMinutes}m avg</span>
            </div>
          </Card>

          {/* Student Satisfaction */}
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Student Satisfaction</span>
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">
              {feedback.averageOverall > 0 ? `${feedback.averageOverall.toFixed(1)} / 5.0` : 'No ratings yet'}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {feedback.totalResponses} student feedback submissions
            </div>
          </Card>
        </div>

        {/* Challenge Difficulty Analysis Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-blue-400" />
                  Learning Analytics & Challenge Difficulty
                </CardTitle>
                <CardDescription className="text-xs">
                  Pass rates, average attempts, and student abandonment per milestone. Minimum 3 attempts required for high-difficulty alert.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/50 text-slate-400 border-y border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Challenge Title</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4">Submissions</th>
                    <th className="py-3 px-4">Pass Rate</th>
                    <th className="py-3 px-4">Avg Attempts</th>
                    <th className="py-3 px-4">Abandonment</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {challengeAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-500">
                        No challenges attached to this workshop yet.
                      </td>
                    </tr>
                  ) : (
                    challengeAnalytics.map((ch: any) => (
                      <tr key={ch.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {ch.title}
                          <div className="text-[10px] text-slate-500">{ch.labTemplateName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {ch.difficulty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {ch.totalSubmissions} ({ch.uniqueStudentsAttempted} students)
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold ${
                                ch.passRate >= 70
                                  ? 'text-emerald-400'
                                  : ch.passRate >= 40
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {ch.passRate}%
                            </span>
                            <span className="text-slate-500 text-[10px]">({ch.passedSubmissions} passed)</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">
                          {ch.averageAttempts}x
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {ch.abandonmentRate}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          {ch.isHardest ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded font-semibold">
                              <Flame className="w-3 h-3 text-red-400" /> High Difficulty
                            </span>
                          ) : ch.totalSubmissions < 3 ? (
                            <span className="text-[10px] text-slate-500">Insufficient Data</span>
                          ) : (
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3 h-3" /> Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Participant Support & Help Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Participant Assistance & Support
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time help requests submitted during this workshop
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Total Requests</span>
                  <span className="text-lg font-bold text-slate-100">{helpRequests.total}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Resolved</span>
                  <span className="text-lg font-bold text-emerald-400">{helpRequests.resolved}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Avg Resolution</span>
                  <span className="text-lg font-bold text-slate-100">{helpRequests.averageResolutionMinutes}m</span>
                </div>
              </div>

              {Object.keys(helpRequests.categoryBreakdown).length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-2">Common Problem Categories</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(helpRequests.categoryBreakdown).map(([cat, count]) => (
                      <span key={cat} className="text-xs px-2.5 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300">
                        {cat.replace(/_/g, ' ')}: <strong>{count as number}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Feedback Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                Student Reviews & Satisfaction
              </CardTitle>
              <CardDescription className="text-xs">
                {feedback.totalResponses} verified responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.totalResponses === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No student reviews submitted yet.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between p-2 bg-slate-900 rounded">
                      <span className="text-slate-400">Content Quality:</span>
                      <span className="font-bold text-slate-200">{feedback.averageContent.toFixed(1)} / 5</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-900 rounded">
                      <span className="text-slate-400">Instructor:</span>
                      <span className="font-bold text-slate-200">{feedback.averageInstructor.toFixed(1)} / 5</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-900 rounded">
                      <span className="text-slate-400">Lab Quality:</span>
                      <span className="font-bold text-slate-200">{feedback.averageLabQuality.toFixed(1)} / 5</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-900 rounded">
                      <span className="text-slate-400">Platform:</span>
                      <span className="font-bold text-slate-200">{feedback.averagePlatform.toFixed(1)} / 5</span>
                    </div>
                  </div>

                  {feedback.recentFeedbacks && feedback.recentFeedbacks.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs font-semibold text-slate-400 block mb-2">Recent Student Comments</span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {feedback.recentFeedbacks.slice(0, 3).map((fb: any) => (
                          <div key={fb.id} className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-slate-300">{fb.studentName}</span>
                              <span className="text-yellow-400 font-bold">{fb.overallRating} ★</span>
                            </div>
                            {fb.comments && <p className="text-slate-400 text-[11px] italic">"{fb.comments}"</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
