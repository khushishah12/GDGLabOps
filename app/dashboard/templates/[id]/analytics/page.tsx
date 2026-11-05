'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import {
  ArrowLeft,
  BarChart3,
  Users,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  RefreshCw,
  TrendingUp,
  Percent,
} from 'lucide-react';

export default function LabTemplateAnalyticsPage() {
  const params = useParams();
  const templateId = (params?.id as string) || '';
  const { error } = useToast();

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!templateId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/analytics`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        error('Error', json.error?.message || 'Failed to load analytics.');
      }
    } catch {
      error('Error', 'Network error while loading template analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [templateId]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8]" />
          <p className="text-xs text-slate-400">Aggregating template analytics...</p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="py-20 text-center space-y-3 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold">Analytics Not Available</h2>
          <Link href="/dashboard/templates">
            <Button size="sm" variant="outline" className="text-xs">
              Back to Library
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/templates">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="domain" size="sm">
                  {data.domain}
                </Badge>
                <Badge variant={data.status === 'PUBLISHED' ? 'success' : 'outline'} size="sm">
                  {data.status}
                </Badge>
                <span className="text-[11px] font-mono text-slate-400">v{data.version}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
                {data.name} – Performance Analytics
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchAnalytics} className="text-xs" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh Data
            </Button>
            <Link href={`/dashboard/templates/${data.templateId}/preview`}>
              <Button size="sm" className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]">
                Open Preview Simulator
              </Button>
            </Link>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Submissions</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {data.totalSubmissions}
            </div>
            <span className="text-[11px] text-slate-400">Across all workshops</span>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
              <Percent className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {data.overallPassRate}%
            </div>
            <span className="text-[11px] text-slate-400">{data.passedSubmissions} passed checks</span>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Unique Students</span>
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {data.uniqueStudents}
            </div>
            <span className="text-[11px] text-slate-400">Active participants</span>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Attached Workshops</span>
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {data.attachedWorkshopsCount}
            </div>
            <span className="text-[11px] text-slate-400">Events using this template</span>
          </Card>
        </div>

        {/* Challenge Breakdown Table */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Challenge Milestones Performance</h3>
              <p className="text-xs text-slate-500">
                Detailed success rates, average scores, and attempt counts for each milestone.
              </p>
            </div>
            <Badge variant="outline" size="sm">
              {data.totalChallenges} Milestones
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Milestone Title</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Difficulty</th>
                  <th className="p-3">Points</th>
                  <th className="p-3">Attempts</th>
                  <th className="p-3">Pass Rate</th>
                  <th className="p-3">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.challengeStats?.map((ch: any) => (
                  <tr key={ch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-3 font-mono font-bold text-slate-400">{ch.displayOrder}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{ch.title}</td>
                    <td className="p-3">
                      <Badge variant="outline" size="sm" className="text-[10px]">
                        {ch.challengeType.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="domain" size="sm" className="text-[10px]">
                        {ch.difficulty}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono">{ch.points}</td>
                    <td className="p-3 font-mono">{ch.totalAttempts}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              ch.passRate >= 70
                                ? 'bg-emerald-500'
                                : ch.passRate >= 40
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${ch.passRate}%` }}
                          />
                        </div>
                        <span className="font-mono">{ch.passRate}%</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono">{ch.avgScore}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Attached Workshops List */}
        {data.attachedWorkshops && data.attachedWorkshops.length > 0 && (
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Associated Workshops</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.attachedWorkshops.map((w: any) => (
                <div
                  key={w.id}
                  className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={w.status === 'PUBLISHED' ? 'default' : 'secondary'} size="sm">
                      {w.status}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      {new Date(w.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{w.title}</h4>
                  <Link
                    href={`/dashboard/workshops/${w.id}`}
                    className="text-[11px] text-blue-600 hover:underline block pt-1"
                  >
                    Manage Workshop →
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
