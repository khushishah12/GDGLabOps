'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
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
  RefreshCw,
  Info,
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
} from 'recharts';

interface OrganiserAnalyticsData {
  overview: {
    totalWorkshops: number;
    publishedWorkshops: number;
    completedWorkshops: number;
    totalRegistrations: number;
    uniqueParticipants: number;
    attendanceRate: number;
    conversionRate: number;
    totalLabSessions: number;
    totalChallengeSubmissions: number;
    challengeCompletionRate: number;
    averageWorkshopRating: number;
  };
  domainBreakdown: Array<{ domain: string; workshopsCount: number }>;
  registrationTrends: Array<{ month: string; registrations: number; attendances: number }>;
}

export default function AnalyticsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [data, setData] = useState<OrganiserAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<Array<{ id: string; title: string }>>([]);

  // Filters
  const [selectedWorkshop, setSelectedWorkshop] = useState('ALL');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  useEffect(() => {
    // Fetch workshop list for dropdown
    fetch('/api/workshops')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setWorkshops(json.data.map((w: any) => ({ id: w.id, title: w.title })));
        }
      })
      .catch(() => {});
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWorkshop !== 'ALL') params.set('workshopId', selectedWorkshop);
      if (selectedDomain !== 'ALL') params.set('domain', selectedDomain);
      if (selectedDifficulty !== 'ALL') params.set('difficulty', selectedDifficulty);

      const res = await fetch(`/api/analytics/organiser?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toastError('Failed to load analytics', json.error?.message);
      }
    } catch (err: any) {
      toastError('Connection Error', err.message || 'Unable to fetch analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedWorkshop, selectedDomain, selectedDifficulty]);

  const overview = data?.overview || {
    totalWorkshops: 0,
    publishedWorkshops: 0,
    completedWorkshops: 0,
    totalRegistrations: 0,
    uniqueParticipants: 0,
    attendanceRate: 0,
    conversionRate: 0,
    totalLabSessions: 0,
    totalChallengeSubmissions: 0,
    challengeCompletionRate: 0,
    averageWorkshopRating: 0,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Organiser Analytics Dashboard
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live metrics aggregated directly from production database records. No synthetic data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalytics}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              className="text-xs"
            >
              Refresh
            </Button>
            {selectedWorkshop !== 'ALL' && (
              <Link href={`/dashboard/workshops/${selectedWorkshop}/analytics`}>
                <Button size="sm" className="text-xs" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Detailed Workshop Report
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526]">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Filter by Workshop</label>
            <Select
              value={selectedWorkshop}
              onChange={(e) => setSelectedWorkshop(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Workshops Aggregated' },
                ...workshops.map((w) => ({ value: w.id, label: w.title.slice(0, 30) + '...' })),
              ]}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Filter by Technical Domain</label>
            <Select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Domains' },
                { value: 'Cloud', label: 'Cloud' },
                { value: 'DevOps', label: 'DevOps' },
                { value: 'Security', label: 'Security' },
                { value: 'Web', label: 'Web Development' },
                { value: 'AI', label: 'AI & Machine Learning' },
              ]}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Filter by Difficulty</label>
            <Select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Difficulty Levels' },
                { value: 'BEGINNER', label: 'Beginner' },
                { value: 'INTERMEDIATE', label: 'Intermediate' },
                { value: 'ADVANCED', label: 'Advanced' },
              ]}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Overview Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 relative group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Registrations</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {overview.totalRegistrations}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {overview.uniqueParticipants} unique participants across {overview.totalWorkshops} workshops
            </p>
          </Card>

          <Card className="p-4 relative group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Attendance Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {overview.attendanceRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Attended vs approved participants ({overview.conversionRate}% total conversion)
            </p>
          </Card>

          <Card className="p-4 relative group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Challenges Solved</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {overview.challengeCompletionRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Passed rate across {overview.totalChallengeSubmissions} submissions
            </p>
          </Card>

          <Card className="p-4 relative group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Student Satisfaction</span>
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {overview.averageWorkshopRating > 0 ? `${overview.averageWorkshopRating} / 5.0` : 'No reviews'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Computed from verified post-lab student feedback
            </p>
          </Card>
        </div>

        {/* Charts: Trends & Domain Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Registration & Attendance Trend */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Attendance & Registration Activity</CardTitle>
              <CardDescription>Real monthly registrations and verified attendance</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {data?.registrationTrends && data.registrationTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.registrationTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1526',
                        borderColor: '#1e2d4a',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Area type="monotone" dataKey="registrations" stroke="#3b82f6" strokeWidth={2} fill="url(#colorReg)" name="Registrations" />
                    <Area type="monotone" dataKey="attendances" stroke="#10b981" strokeWidth={2} fill="url(#colorAtt)" name="Attended" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No historical trend records found for current filter.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domain Breakdown */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Workshops by Technical Domain</CardTitle>
              <CardDescription>Curriculum distribution across technical tracks</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {data?.domainBreakdown && data.domainBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.domainBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="domain" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1526',
                        borderColor: '#1e2d4a',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="workshopsCount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Workshops" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No domain distribution data available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs: Lab Sessions & Workshops Lifecycle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Workshop Lifecycle</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold">{overview.publishedWorkshops} Active</span>
              <span className="text-xs text-slate-500">/ {overview.completedWorkshops} Completed</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Out of {overview.totalWorkshops} total created</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Total Lab Sessions</span>
            </div>
            <div className="mt-2 text-xl font-bold">{overview.totalLabSessions}</div>
            <p className="text-[11px] text-slate-400 mt-1">Cloud containers provisioned & attached</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Challenge Submissions</span>
            </div>
            <div className="mt-2 text-xl font-bold">{overview.totalChallengeSubmissions}</div>
            <p className="text-[11px] text-slate-400 mt-1">Automated validations executed</p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
