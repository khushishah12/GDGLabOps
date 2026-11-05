'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import {
  mockWorkshops,
  mockAnalytics,
  mockRecentActivities,
} from '@/lib/mock-data';
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

export default function OrganiserOverviewPage() {
  const { info, success } = useToast();

  const stats = [
    {
      title: 'Total Workshops',
      value: '12',
      change: '+3 this month',
      icon: Calendar,
      color: 'text-[#4285F4]',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Registered Students',
      value: '198',
      change: '+42 vs last week',
      icon: Users,
      color: 'text-[#34A853]',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Active Lab Sessions',
      value: '48',
      change: '1 live workshop running',
      icon: Terminal,
      color: 'text-[#FBBC04]',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Completed Challenges',
      value: '642',
      change: '88.4% pass rate',
      icon: Trophy,
      color: 'text-[#EA4335]',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
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
            <Link href="/dashboard/workshops/create">
              <Button size="sm" className="text-xs" leftIcon={<Plus className="w-4 h-4" />}>
                Create Workshop
              </Button>
            </Link>
            <Link href="/dashboard/monitor">
              <Button size="sm" variant="outline" className="text-xs" leftIcon={<Play className="w-3.5 h-3.5 text-emerald-500" />}>
                Live Monitor
              </Button>
            </Link>
          </div>
        </div>

        {/* Data Origin Clarification Banner (Required by prompt) */}
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-[#1a73e8] dark:text-[#4285F4]">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            <strong>UI Preview Mode:</strong> Displaying high-fidelity mock data and simulated container metrics. Real-time Socket.IO and Neon DB connections will activate in subsequent prompts.
          </span>
        </div>

        {/* 4 Key Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
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

        {/* Charts Row: Attendance Trend & Challenge Pass Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Attendance Trend Chart */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Workshop Participation & Attendance</CardTitle>
                  <CardDescription>Registered students vs. active container participants</CardDescription>
                </div>
                <Badge variant="outline" size="sm">Last 6 Weeks</Badge>
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
                <Badge variant="success" size="sm">88% Avg</Badge>
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

        {/* Bottom Split: Upcoming Workshops & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upcoming Workshops */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming & Active Workshops</CardTitle>
                  <CardDescription>Currently scheduled GDG technical sessions</CardDescription>
                </div>
                <Link href="/dashboard/workshops" className="text-xs text-[#1a73e8] dark:text-[#4285F4] hover:underline flex items-center">
                  View all <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {mockWorkshops.slice(0, 3).map((ws) => (
                  <div key={ws.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={ws.status === 'ACTIVE' ? 'success' : ws.status === 'PUBLISHED' ? 'default' : 'secondary'}
                          size="sm"
                        >
                          {ws.status}
                        </Badge>
                        <span className="text-[11px] font-mono font-semibold text-slate-500">
                          {ws.eventCode}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {ws.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{ws.domain}</span>
                        <span>•</span>
                        <span>{ws.registeredCount} / {ws.maxAttendees} registered</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/dashboard/workshops/${ws.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Details
                        </Button>
                      </Link>
                      {ws.status === 'ACTIVE' && (
                        <Link href="/dashboard/monitor">
                          <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700">
                            Monitor Live
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Recent Activity Stream</CardTitle>
              <CardDescription>Live telemetry from workshop participants</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {mockRecentActivities.map((act) => (
                  <div key={act.id} className="p-3.5 flex items-start gap-3 text-xs">
                    <div className="mt-0.5">
                      {act.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {act.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                      {act.type === 'info' && <Terminal className="w-4 h-4 text-[#4285F4] shrink-0" />}
                      {act.type === 'achievement' && <Trophy className="w-4 h-4 text-purple-500 shrink-0" />}
                      {act.type === 'system' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 dark:text-slate-200">
                        <strong className="font-semibold">{act.user}</strong> {act.action}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-[11px] text-slate-400">Auto-refreshing every 30s</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => success('Refreshed', 'Telemetry feed is up to date')}
              >
                Refresh Feed
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
