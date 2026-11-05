'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import { mockAnalytics } from '@/lib/mock-data';
import {
  Calendar,
  Users,
  Terminal,
  Trophy,
  ArrowUpRight,
  Plus,
  Play,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Hourglass,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';

interface DashboardStats {
  totalWorkshops: number;
  publishedWorkshops: number;
  totalRegistrations: number;
  confirmedRegistrations: number;
  waitlistedRegistrations: number;
  pendingRegistrations: number;
  totalStudents: number;
  recentWorkshops: any[];
  recentRegistrations: any[];
}

export default function OrganiserOverviewPage() {
  const { info, success } = useToast();

  const [stats, setStats] = useState<DashboardStats>({
    totalWorkshops: 3,
    publishedWorkshops: 3,
    totalRegistrations: 12,
    confirmedRegistrations: 10,
    waitlistedRegistrations: 2,
    pendingRegistrations: 0,
    totalStudents: 5,
    recentWorkshops: [],
    recentRegistrations: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Workshops',
      value: stats.totalWorkshops.toString(),
      change: `${stats.publishedWorkshops} active / published`,
      icon: Calendar,
      color: 'text-[#4285F4]',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Confirmed Students',
      value: stats.confirmedRegistrations.toString(),
      change: `${stats.totalStudents} total student accounts`,
      icon: Users,
      color: 'text-[#34A853]',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Waitlist Queue',
      value: stats.waitlistedRegistrations.toString(),
      change: `${stats.pendingRegistrations} pending approval`,
      icon: Hourglass,
      color: 'text-[#FBBC04]',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Total Registrations',
      value: stats.totalRegistrations.toString(),
      change: 'Across all active chapters',
      icon: Trophy,
      color: 'text-[#EA4335]',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Top Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Organiser Overview
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Welcome back. Monitor live lab environments, student engagement, and upcoming GDG workshops.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh Data
            </Button>
            <Link href="/dashboard/workshops/create">
              <Button size="sm" className="text-xs" leftIcon={<Plus className="w-4 h-4" />}>
                Create Workshop
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Key Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {stat.title}
                    </span>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {stat.change}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Attendance Trend Chart */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Workshop Participation & Attendance</CardTitle>
                  <CardDescription>Registered students vs. active container participants</CardDescription>
                </div>
                <Badge variant="outline" size="sm">
                  Last 6 Weeks
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockAnalytics.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="registeredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4285F4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4285F4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="attendedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34A853" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#34A853" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0e1526',
                      borderColor: '#1e2d4a',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="registered"
                    stroke="#4285F4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#registeredGrad)"
                    name="Registered"
                  />
                  <Area
                    type="monotone"
                    dataKey="attended"
                    stroke="#34A853"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#attendedGrad)"
                    name="Attended Labs"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Challenge Completion Rates Chart */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Challenge Completion</CardTitle>
                  <CardDescription>Pass rates across active workshop milestones</CardDescription>
                </div>
                <Badge variant="success" size="sm">
                  88% Avg
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockAnalytics.completionByChallenge} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                  <YAxis type="category" dataKey="challengeTitle" stroke="#64748b" fontSize={10} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0e1526',
                      borderColor: '#1e2d4a',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="passRate" fill="#4285F4" radius={[0, 4, 4, 0]} name="Pass Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Split: Recent Workshops & Recent Registrations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Workshops */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active & Scheduled Workshops</CardTitle>
                  <CardDescription>Directly managed by your chapter organisation</CardDescription>
                </div>
                <Link href="/dashboard/workshops" className="text-xs text-[#1a73e8] dark:text-[#4285F4] hover:underline flex items-center">
                  View all <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentWorkshops.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No workshops scheduled yet. Create your first workshop above!
                  </div>
                ) : (
                  stats.recentWorkshops.map((ws: any) => (
                    <div
                      key={ws.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" size="sm">
                            {ws.status}
                          </Badge>
                          <span className="text-[11px] font-mono font-semibold text-slate-500">
                            {ws.registrationCode}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {ws.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>{ws.domain}</span>
                          <span>•</span>
                          <span>
                            {ws._count?.registrations ?? 0} confirmed / {ws.participantLimit} cap
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/dashboard/workshops/${ws.id}/participants`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            Participants
                          </Button>
                        </Link>
                        <Link href={`/dashboard/workshops/${ws.id}`}>
                          <Button size="sm" className="text-xs">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Registrations Stream */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Recent Registration Stream</CardTitle>
              <CardDescription>Live student enrollment events across workshops</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentRegistrations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No recent registrations recorded yet.
                  </div>
                ) : (
                  stats.recentRegistrations.map((reg: any) => (
                    <div key={reg.id} className="p-3.5 flex items-start gap-3 text-xs">
                      <div className="mt-0.5">
                        {reg.status === 'REGISTERED' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {reg.status === 'WAITLISTED' && <Hourglass className="w-4 h-4 text-amber-500 shrink-0" />}
                        {reg.status === 'PENDING_APPROVAL' && <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 dark:text-slate-200">
                          <strong className="font-semibold">{reg.student?.name || 'Student'}</strong> registered for{' '}
                          <span className="font-semibold text-[#1a73e8] dark:text-[#4285F4]">
                            {reg.workshop?.title}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>Status: {reg.status}</span>
                          <span>•</span>
                          <span>{new Date(reg.registeredAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
