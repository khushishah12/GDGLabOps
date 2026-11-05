'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/user-context';
import { useToast } from '@/lib/toast-context';
import { mockWorkshops, mockLabTemplates } from '@/lib/mock-data';
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
} from 'lucide-react';

export default function StudentOverviewPage() {
  const { currentUser } = useUser();
  const { info } = useToast();

  const enrolledWorkshops = mockWorkshops.slice(0, 2);

  const stats = [
    {
      title: 'Enrolled Workshops',
      value: '3',
      sub: '2 active, 1 upcoming',
      icon: Calendar,
      color: 'text-[#4285F4]',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Active Labs',
      value: '1',
      sub: 'Linux & Cloud Shell',
      icon: Terminal,
      color: 'text-[#34A853]',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Completed Challenges',
      value: '14',
      sub: 'Across 4 workshops',
      icon: CheckCircle2,
      color: 'text-[#FBBC04]',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'Total Points',
      value: `${currentUser.points || 850}`,
      sub: 'Top 5% in Chapter',
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
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">Student Learning Portal</Badge>
              <span className="text-xs text-slate-400">GDG on Campus Chapter</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Continue your hands-on journey. Your active container session is pre-warmed and ready to resume.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/student/lab/demo-session">
              <Button size="sm" className="bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4] text-xs" leftIcon={<Play className="w-3.5 h-3.5" />}>
                Resume Active Lab
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

        {/* Two Columns: Active Labs / Enrolled Workshops & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Enrolled Workshops */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Active & Enrolled Workshops</CardTitle>
                  <CardDescription>Track your progress across hands-on study jams</CardDescription>
                </div>
                <Link href="/student/explore" className="text-xs text-[#1a73e8] dark:text-[#4285F4] hover:underline flex items-center">
                  Browse more <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrolledWorkshops.map((ws, idx) => (
                <div
                  key={ws.id}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="domain" size="sm">{ws.domain}</Badge>
                      <Badge variant={ws.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                        {ws.status === 'ACTIVE' ? 'Live Session In Progress' : 'Upcoming'}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {ws.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {ws.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="pt-2 max-w-sm space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Milestone Progress</span>
                        <span className="font-semibold">{idx === 0 ? '75% (3/4 Solved)' : '0%'}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: idx === 0 ? '75%' : '0%' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                    <Link href="/student/lab/demo-session">
                      <Button size="sm" className="text-xs">
                        {idx === 0 ? 'Resume Sandbox' : 'View Schedule'}
                      </Button>
                    </Link>
                    <span className="text-[10px] text-slate-400">
                      Event Code: <code className="font-mono">{ws.eventCode}</code>
                    </span>
                  </div>
                </div>
              ))}
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
