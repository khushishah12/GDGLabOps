'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/lib/toast-context';
import { mockLiveParticipants, mockWorkshops } from '@/lib/mock-data';
import { LiveParticipant } from '@/types';
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Terminal,
  Trophy,
  RefreshCw,
  Info,
  LifeBuoy,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function LiveMonitorPage() {
  const { info, success } = useToast();
  const [participants, setParticipants] = useState<LiveParticipant[]>(mockLiveParticipants);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudentForHelp, setSelectedStudentForHelp] = useState<LiveParticipant | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter logic
  const filtered = participants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'HELP' && p.needsHelp) ||
      (statusFilter === 'RUNNING' && p.containerStatus === 'RUNNING') ||
      (statusFilter === 'COMPLETED' && p.progressPercent === 100);
    return matchesSearch && matchesStatus;
  });

  const totalConnected = participants.length;
  const activeRunning = participants.filter((p) => p.containerStatus === 'RUNNING').length;
  const completedCount = participants.filter((p) => p.progressPercent === 100).length;
  const needHelpCount = participants.filter((p) => p.needsHelp).length;

  const handleSimulateRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      success('Telemetry Updated', 'Simulated poll fetched latest container heartbeats.');
    }, 600);
  };

  const handleResolveHelp = (studentId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === studentId ? { ...p, needsHelp: false, helpMessage: undefined } : p))
    );
    success('Assistance Resolved', 'Flag cleared. Student notified.');
    setSelectedStudentForHelp(null);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Badge variant="success" size="sm">LIVE MONITORING ACTIVE</Badge>
              <span className="text-xs text-slate-400">Workshop: Linux & Cloud Shell Mastery</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              Classroom Telemetry & Student Observer
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              isLoading={isRefreshing}
              onClick={handleSimulateRefresh}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Refresh Telemetry
            </Button>
          </div>
        </div>

        {/* Realtime Socket Notice Banner (Prompt Requirement) */}
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-[#1a73e8] dark:text-[#4285F4]">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            <strong>Simulated Telemetry Feed:</strong> This page renders student progress states from workshop simulation. Persistent WebSocket streaming via Socket.IO will be integrated in Phase 6.
          </span>
        </div>

        {/* 4 Quick Stat Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Connected Students</span>
              <Users className="w-4 h-4 text-[#4285F4]" />
            </div>
            <div className="mt-2 text-2xl font-bold">{totalConnected}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Assigned to Worker Node #01</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Containers</span>
              <Terminal className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeRunning}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Healthy heartbeat responses</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Completed All Tasks</span>
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">{completedCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">100% Milestone completion</p>
          </Card>

          <Card className="p-4 border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Needs Assistance</span>
              <LifeBuoy className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">{needHelpCount}</div>
            <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">Raised digital hands</p>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526]">
          <div className="flex-1 w-full sm:w-80">
            <Input
              placeholder="Search student by name or university email..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Participants' },
                { value: 'HELP', label: '⚠️ Needs Help' },
                { value: 'RUNNING', label: '● Running Containers' },
                { value: 'COMPLETED', label: '✓ Completed 100%' },
              ]}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Live Student Participant Grid Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Current Milestone</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Container</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={student.avatarUrl}
                        alt={student.name}
                        className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{student.name}</span>
                          {student.needsHelp && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold animate-pulse">
                              <LifeBuoy className="w-3 h-3" />
                              HELP
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{student.email}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="font-mono text-xs font-semibold">
                      Task {student.currentChallengeIndex} of {student.totalChallenges}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="w-32 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{student.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            student.progressPercent === 100
                              ? 'bg-purple-500'
                              : student.progressPercent >= 50
                              ? 'bg-emerald-500'
                              : 'bg-[#4285F4]'
                          }`}
                          style={{ width: `${student.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                    {student.score} pts
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        student.containerStatus === 'RUNNING'
                          ? 'success'
                          : student.containerStatus === 'IDLE'
                          ? 'secondary'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {student.containerStatus}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-slate-500 text-[11px]">
                    {student.lastActive}
                  </TableCell>

                  <TableCell className="text-right">
                    {student.needsHelp ? (
                      <Button
                        size="sm"
                        variant="danger"
                        className="h-7 text-[11px] px-2.5"
                        onClick={() => setSelectedStudentForHelp(student)}
                      >
                        Inspect Question
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2.5"
                        onClick={() => info('Container Health', `${student.name}'s sandbox is responsive.`)}
                      >
                        Ping Session
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Student Help Request Dialog */}
        <Dialog open={!!selectedStudentForHelp} onOpenChange={() => setSelectedStudentForHelp(null)}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-amber-500" />
              <DialogTitle>Instructor Assistance Request</DialogTitle>
            </div>
            <DialogDescription>
              {selectedStudentForHelp?.name} is blocked on Challenge #{selectedStudentForHelp?.currentChallengeIndex}.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Student Message / Error Log:
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-mono">
              &quot;{selectedStudentForHelp?.helpMessage || 'I need help understanding why the permissions test is failing.'}&quot;
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedStudentForHelp(null)}>
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={() => selectedStudentForHelp && handleResolveHelp(selectedStudentForHelp.id)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Mark Resolved
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </AppShell>
  );
}
