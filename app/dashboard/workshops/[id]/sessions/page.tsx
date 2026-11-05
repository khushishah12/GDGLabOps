'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/lib/toast-context';
import {
  Terminal,
  Search,
  ArrowLeft,
  RefreshCw,
  Clock,
  AlertCircle,
  XCircle,
  Activity,
  Cpu,
  Layers,
  StopCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface SessionTelemetryItem {
  id: string;
  studentName: string;
  studentEmail: string;
  labName: string;
  status: string;
  environmentProfile: string;
  startedAt: string | null;
  expiresAt: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdAt: string;
}

export default function WorkshopSessionsMonitoringPage() {
  const params = useParams();
  const workshopId = (params?.id as string) || '';
  const { success, error, info } = useToast();

  const [sessions, setSessions] = useState<SessionTelemetryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUNNING' | 'TERMINATED'>('ALL');

  // Emergency termination dialog state
  const [terminatingSession, setTerminatingSession] = useState<SessionTelemetryItem | null>(null);
  const [isTerminating, setIsTerminating] = useState(false);

  const fetchSessions = async (silent: boolean = false) => {
    if (!workshopId) return;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch(`/api/organiser/workshops/${workshopId}/sessions`);
      const json = await res.json();
      if (res.ok && json.success) {
        setSessions(json.data || []);
      } else {
        if (!silent) error('Error', json.error?.message || 'Failed to fetch active lab sessions');
      }
    } catch {
      if (!silent) error('Error', 'Network error while retrieving telemetry data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      fetchSessions(true);
    }, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [workshopId]);

  const handleTerminateConfirm = async () => {
    if (!terminatingSession) return;
    setIsTerminating(true);
    try {
      const res = await fetch(`/api/organiser/sessions/${terminatingSession.id}/terminate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Session Terminated', `Container for ${terminatingSession.studentName} was terminated.`);
        setTerminatingSession(null);
        fetchSessions(true);
      } else {
        error('Action Failed', json.error?.message || 'Failed to terminate container.');
      }
    } catch {
      error('Error', 'Network error while attempting termination.');
    } finally {
      setIsTerminating(false);
    }
  };

  const runningCount = sessions.filter((s) => s.status === 'RUNNING').length;
  const provisioningCount = sessions.filter((s) => s.status === 'PROVISIONING').length;
  const stoppedCount = sessions.filter((s) => ['TERMINATED', 'EXPIRED', 'STOPPED'].includes(s.status)).length;

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.labName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'RUNNING') return s.status === 'RUNNING' || s.status === 'PROVISIONING';
    if (statusFilter === 'TERMINATED') return ['TERMINATED', 'EXPIRED', 'STOPPED', 'FAILED'].includes(s.status);
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <Link
              href={`/dashboard/workshops/${workshopId}`}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Workshop Overview
            </Link>
            <div className="flex items-center gap-3 pt-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Terminal className="w-6 h-6 text-[#1a73e8]" />
                Cloud Lab Telemetry & Session Monitor
              </h1>
              {isRefreshing && (
                <span className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Live Syncing
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSessions()}
              disabled={isLoading || isRefreshing}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Active Containers</p>
                <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {runningCount}
                </p>
              </div>
              <Activity className="w-6 h-6 text-emerald-500/40" />
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Provisioning</p>
                <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {provisioningCount}
                </p>
              </div>
              <Cpu className="w-6 h-6 text-amber-500/40" />
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-slate-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Terminated / Expired</p>
                <p className="text-2xl font-bold font-mono text-slate-600 dark:text-slate-400">
                  {stoppedCount}
                </p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-slate-400/40" />
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Sessions Logged</p>
                <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {sessions.length}
                </p>
              </div>
              <Layers className="w-6 h-6 text-blue-500/40" />
            </div>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Filter by student name, email, or lab..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-72 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg text-xs">
                {(['ALL', 'RUNNING', 'TERMINATED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1 rounded font-medium transition-all ${
                      statusFilter === filter
                        ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'All Sessions' : filter === 'RUNNING' ? 'Active Only' : 'Terminated'}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8] mx-auto" />
                <p className="text-xs text-slate-400">Loading session telemetry...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  icon={<Terminal className="w-8 h-8 text-slate-400" />}
                  title="No container sessions found"
                  description="No students have active or recent lab container sessions matching your filter."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Lab Template</TableHead>
                    <TableHead>Environment Profile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remaining Time</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead className="text-right">Emergency Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((s) => {
                    const isRunning = s.status === 'RUNNING';
                    const remainingMs = s.expiresAt ? Math.max(0, new Date(s.expiresAt).getTime() - Date.now()) : 0;
                    const remainingMins = Math.floor(remainingMs / 60000);

                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                              {s.studentName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {s.studentEmail}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {s.labName}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                            {s.environmentProfile || 'ubuntu-fundamentals'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              isRunning
                                ? 'default'
                                : s.status === 'PROVISIONING'
                                ? 'outline'
                                : 'secondary'
                            }
                            size="sm"
                          >
                            {s.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {isRunning ? (
                            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {remainingMins}m left
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {s.terminationReason || 'Closed'}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className="text-xs text-slate-500 font-mono">
                            {s.startedAt ? new Date(s.startedAt).toLocaleTimeString() : '—'}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          {isRunning && (
                            <Button
                              variant="danger"
                              size="sm"
                              className="text-xs h-7 px-2.5 flex items-center gap-1"
                              onClick={() => setTerminatingSession(s)}
                            >
                              <StopCircle className="w-3.5 h-3.5" /> Terminate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Modal */}
        <ConfirmDialog
          open={Boolean(terminatingSession)}
          onOpenChange={(open) => !open && setTerminatingSession(null)}
          title="Terminate Student Container"
          description={`Are you sure you want to forcefully stop and reclaim the container for ${terminatingSession?.studentName}? Unsaved files inside the container will be purged.`}
          confirmLabel={isTerminating ? 'Terminating...' : 'Terminate Container'}
          cancelLabel="Cancel"
          isDestructive={true}
          isLoading={isTerminating}
          onConfirm={handleTerminateConfirm}
        />
      </div>
    </AppShell>
  );
}
