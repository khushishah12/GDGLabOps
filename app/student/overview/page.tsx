'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/user-context';
import { useToast } from '@/lib/toast-context';
import {
  Trophy,
  Terminal,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Award,
  Clock,
  Play,
  Zap,
  RefreshCw,
  Hourglass,
} from 'lucide-react';

export default function StudentOverviewPage() {
  const { currentUser } = useUser();
  const { info } = useToast();
  const [profileData, setProfileData] = useState<{
    points: number;
    enrolledCount: number;
    solvedCount: number;
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('gdg_student_profile');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return { points: 850, enrolledCount: 3, solvedCount: 14 };
  });

  const [enrolledWorkshops, setEnrolledWorkshops] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('gdg_student_enrolled_ws');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return !sessionStorage.getItem('gdg_student_enrolled_ws');
      } catch {}
    }
    return true;
  });

  useEffect(() => {
    async function loadData() {
      try {
        const studentId = currentUser.id || '50409751-b925-4de7-a23d-9e68026c00ee';
        const [profileRes, wsRes] = await Promise.all([
          fetch(`/api/student/profile?studentId=${studentId}`),
          fetch(`/api/student/workshops?studentId=${studentId}`),
        ]);

        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          if (profileJson.success && profileJson.data) {
            const pData = {
              points: profileJson.data.totalPoints || 850,
              enrolledCount: profileJson.data.enrolledWorkshopsCount ?? 3,
              solvedCount: profileJson.data.solvedChallengesCount ?? 14,
            };
            setProfileData(pData);
            try {
              sessionStorage.setItem('gdg_student_profile', JSON.stringify(pData));
            } catch {}
          }
        }

        if (wsRes.ok) {
          const wsJson = await wsRes.json();
          if (wsJson.success && Array.isArray(wsJson.data)) {
            setEnrolledWorkshops(wsJson.data);
            try {
              sessionStorage.setItem('gdg_student_enrolled_ws', JSON.stringify(wsJson.data));
            } catch {}
          }
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentUser.id]);

  const stats = [
    {
      title: 'Enrolled Workshops',
      value: enrolledWorkshops.length.toString(),
      sub: 'Active study jams',
      icon: Calendar,
      color: 'text-[#4285F4]',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Active Sandboxes',
      value: enrolledWorkshops.filter((w) => w.status === 'REGISTERED').length.toString(),
      sub: 'Ready for hands-on labs',
      icon: Terminal,
      color: 'text-[#34A853]',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Completed Tasks',
      value: profileData.solvedCount.toString(),
      sub: 'Across practical labs',
      icon: CheckCircle2,
      color: 'text-[#FBBC04]',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'Total Points',
      value: profileData.points.toString(),
      sub: 'Chapter Leaderboard',
      icon: Trophy,
      color: 'text-[#EA4335]',
      bg: 'bg-red-500/10',
    },
  ];

  const badges = [
    { title: 'Shell Master', desc: 'Solved 10 POSIX terminal challenges', icon: Terminal, color: 'text-blue-500' },
    { title: 'Bug Hunter', desc: 'Detected 3 security vulnerabilities', icon: Zap, color: 'text-amber-500' },
    { title: 'Fast Solver', desc: 'Solved a challenge in under 3 minutes', icon: Sparkles, color: 'text-purple-500' },
    { title: 'GDG Champion', desc: 'Attended 3 consecutive workshops', icon: Award, color: 'text-emerald-500' },
  ];

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">
                Student Learning Portal
              </Badge>
              <span className="text-xs text-slate-400">GDG on Campus Chapter</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Continue your hands-on journey. Explore active study jams or launch your interactive sandbox.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/student/explore">
              <Button size="sm" variant="outline" className="text-xs">
                Explore Workshops
              </Button>
            </Link>
            <Link href="/student/lab/demo-session">
              <Button size="sm" className="bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4] text-xs" leftIcon={<Play className="w-3.5 h-3.5" />}>
                Launch Sandbox
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{s.title}</span>
                    <div className={`p-2 rounded-lg ${s.bg}`}>
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">{s.value}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Two Columns: Enrolled Workshops & Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Enrolled Workshops */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Active & Enrolled Workshops</CardTitle>
                  <CardDescription>Directly registered sessions and waitlist positions</CardDescription>
                </div>
                <Link href="/student/workshops" className="text-xs text-[#1a73e8] dark:text-[#4285F4] hover:underline flex items-center">
                  Manage all <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && enrolledWorkshops.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 animate-pulse space-y-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                      </div>
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
              ) : enrolledWorkshops.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">
                    You have not enrolled in any workshops yet. Check out available study jams!
                  </p>
                  <Link href="/student/explore">
                    <Button size="sm" className="text-xs">
                      Explore Workshops
                    </Button>
                  </Link>
                </div>
              ) : (
                enrolledWorkshops.map((record) => {
                  const ws = record.workshop || record;
                  const firstLabId = (ws as any).workshopLabs?.[0]?.labTemplateId || (ws as any).workshopLabs?.[0]?.labTemplate?.id;
                  const labWorkspaceUrl = firstLabId
                    ? `/student/workshops/${ws.id}/labs/${firstLabId}`
                    : `/student/lab/demo-session?workshopId=${ws.id}&domain=${encodeURIComponent(ws.domain || 'Linux')}`;
                  return (
                    <div
                      key={record.id}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="domain" size="sm">
                            {ws.domain}
                          </Badge>
                          <Badge
                            variant={record.status === 'REGISTERED' ? 'success' : record.status === 'WAITLISTED' ? 'warning' : 'secondary'}
                            size="sm"
                          >
                            {record.status === 'REGISTERED' ? 'Confirmed Seat' : record.status === 'WAITLISTED' ? 'Waitlist' : 'Pending'}
                          </Badge>
                        </div>
                        <Link href={labWorkspaceUrl} className="hover:underline">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {ws.title}
                          </h4>
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {ws.shortDescription || ws.description}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                          <span>
                            Date: {new Date(ws.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span>•</span>
                          <span>Duration: {ws.duration}m</span>
                          <span>•</span>
                          <span>Code: <code className="font-mono">{ws.registrationCode}</code></span>
                        </div>
                      </div>

                      <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                        {record.status === 'REGISTERED' ? (
                          <Link href={labWorkspaceUrl}>
                            <Button size="sm" className="text-xs">
                              Launch Sandbox
                            </Button>
                          </Link>
                        ) : (
                          <div className="text-[11px] text-amber-500 font-semibold">
                            {record.status === 'WAITLISTED' ? 'Waitlist Position #1' : 'Awaiting Approval'}
                          </div>
                        )}
                        <Link href={labWorkspaceUrl}>
                          <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-400">
                            Details & Labs
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Achievements & Badges */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Earned Badges</CardTitle>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <CardDescription>Milestones unlocked in practical labs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {badges.map((b, idx) => {
                const Icon = b.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center gap-3"
                  >
                    <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0">
                      <Icon className={`w-4 h-4 ${b.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{b.title}</h5>
                      <p className="text-[10px] text-slate-400 truncate">{b.desc}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
