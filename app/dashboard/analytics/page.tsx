'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toast-context';
import { mockAnalytics, mockWorkshops } from '@/lib/mock-data';
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
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AnalyticsPage() {
  const { success, info } = useToast();
  const [selectedWorkshop, setSelectedWorkshop] = useState('ALL');
  const [timeRange, setTimeRange] = useState('30D');

  const domainPieColors = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#A142F4'];

  const handleExportCSV = () => {
    success('Report Exported', 'GDG-LabOps-Chapter-Analytics.csv downloaded.');
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Workshop Analytics & Reports
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Deep chapter performance telemetry, completion funnels, and milestone difficulty curves.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Export CSV Report
            </Button>
          </div>
        </div>

        {/* Global Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526]">
          <div className="w-full sm:w-64">
            <Select
              value={selectedWorkshop}
              onChange={(e) => setSelectedWorkshop(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Workshops Aggregated' },
                ...mockWorkshops.map((w) => ({ value: w.id, label: w.title.slice(0, 28) + '...' })),
              ]}
              className="h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={[
                { value: '7D', label: 'Last 7 Days' },
                { value: '30D', label: 'Last 30 Days' },
                { value: '90D', label: 'Last 3 Months' },
                { value: 'YTD', label: 'Year to Date' },
              ]}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Registrations</span>
              <Users className="w-4 h-4 text-[#4285F4]" />
            </div>
            <div className="mt-2 text-2xl font-bold">{mockAnalytics.totalRegistrations}</div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">+14% vs prior month</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Attendance Rate</span>
              <TrendingUp className="w-4 h-4 text-[#34A853]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {mockAnalytics.attendanceRatePercent}%
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Average turn-out on event day</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Avg Completion Time</span>
              <Clock className="w-4 h-4 text-[#FBBC04]" />
            </div>
            <div className="mt-2 text-2xl font-bold">{mockAnalytics.avgCompletionTimeMinutes}m</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Time to finish all 4 challenges</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Challenges Solved</span>
              <Trophy className="w-4 h-4 text-[#EA4335]" />
            </div>
            <div className="mt-2 text-2xl font-bold">{mockAnalytics.totalChallengesSolved}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated validation passes</p>
          </Card>
        </div>

        {/* Top Charts: Attendance Trend & Difficulty Pass Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Attendance Area Chart */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Attendance & Registration Growth</CardTitle>
              <CardDescription>Historical trend across bi-weekly study jams</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockAnalytics.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4285F4" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#4285F4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34A853" stopOpacity={0.5} />
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
                  <Area type="monotone" dataKey="registered" stroke="#4285F4" strokeWidth={2} fill="url(#colorReg)" name="Registered" />
                  <Area type="monotone" dataKey="attended" stroke="#34A853" strokeWidth={2} fill="url(#colorAtt)" name="Attended" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Score Distribution Chart */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
              <CardDescription>Points distribution among active participants</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockAnalytics.scoreDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                  <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0e1526',
                      borderColor: '#1e2d4a',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" fill="#FBBC04" radius={[4, 4, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Most Difficult Challenges & Curriculum Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Most Difficult Challenges Table */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Milestone Bottleneck Analysis</CardTitle>
                  <CardDescription>Challenges with the lowest first-attempt pass rates</CardDescription>
                </div>
                <Badge variant="outline" size="sm">Difficulty Metric</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {mockAnalytics.completionByChallenge.map((ch, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          {ch.challengeTitle}
                        </span>
                        {ch.passRate < 75 && (
                          <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">
                            Bottleneck
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Average validation attempts before pass: {ch.avgAttempts}x
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono text-sm font-bold ${
                          ch.passRate >= 80 ? 'text-emerald-500' : 'text-amber-500'
                        }`}
                      >
                        {ch.passRate}%
                      </span>
                      <span className="block text-[10px] text-slate-400">Pass Rate</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Domain Breakdown */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Domain Curriculum Distribution</CardTitle>
              <CardDescription>Participant distribution across technical tracks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAnalytics.domainBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.domain}
                    </span>
                    <span className="text-slate-400">
                      {item.participants} students ({item.workshops} workshops)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: domainPieColors[idx % domainPieColors.length],
                        width: `${(item.participants / 198) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
