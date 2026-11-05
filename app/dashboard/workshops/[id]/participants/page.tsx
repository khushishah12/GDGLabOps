'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  Users,
  Search,
  Download,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  UserCheck,
  ShieldCheck,
  Filter,
} from 'lucide-react';

interface ParticipantRecord {
  id: string;
  workshopId: string;
  studentId: string;
  registeredAt: string;
  status: 'REGISTERED' | 'PENDING_APPROVAL' | 'WAITLISTED' | 'REJECTED' | 'CANCELLED';
  attendanceStatus: 'ATTENDED' | 'ABSENT' | 'EXCUSED';
  notes?: string;
  student: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function WorkshopParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const workshopId = params.id as string;
  const { success, error: toastError, info } = useToast();

  const [workshopTitle, setWorkshopTitle] = useState('Workshop Participants');
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Action state
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantRecord | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchParticipants = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Workshop Details
      const wsRes = await fetch(`/api/workshops/${workshopId}`);
      if (wsRes.ok) {
        const wsJson = await wsRes.json();
        if (wsJson.success && wsJson.data) {
          setWorkshopTitle(wsJson.data.title);
        }
      }

      // 2. Fetch Participants
      const url = new URL(`/api/workshops/${workshopId}/participants`, window.location.origin);
      if (selectedStatus !== 'ALL') url.searchParams.set('status', selectedStatus);
      if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setParticipants(json.data.participants || []);
        }
      }
    } catch {
      toastError('Failed to load participant roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [workshopId, selectedStatus]);

  const handleAction = async (regId: string, action: 'APPROVE' | 'REJECT' | 'CANCEL', notes?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}/participants/${regId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toastError(json?.error?.message || `Failed to ${action.toLowerCase()} participant.`);
        return;
      }

      success(`Participant ${action.toLowerCase()}d successfully.`);
      setConfirmCancelOpen(false);
      setSelectedParticipant(null);
      fetchParticipants();
    } catch {
      toastError(`An error occurred while attempting to ${action.toLowerCase()} participant.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}/participants/export`);
      if (!res.ok) {
        toastError('Failed to generate participant CSV.');
        return;
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `participants-${workshopId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      success('Participant CSV exported.');
    } catch {
      toastError('Error downloading CSV export.');
    } finally {
      setIsExporting(false);
    }
  };

  // Metrics rollups
  const registeredCount = participants.filter((p) => p.status === 'REGISTERED').length;
  const pendingCount = participants.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const waitlistedCount = participants.filter((p) => p.status === 'WAITLISTED').length;
  const cancelledCount = participants.filter((p) => p.status === 'CANCELLED' || p.status === 'REJECTED').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Navigation & Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/workshops"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Workshops
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#1A73E8]" />
              Manage Participants
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {workshopTitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={handleExportCSV}
              disabled={isExporting || participants.length === 0}
              variant="secondary"
              className="flex items-center gap-2 text-xs h-9"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1422]">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Confirmed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {registeredCount}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1422]">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Pending Approval</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {pendingCount}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1422]">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Waitlisted</span>
              <AlertCircle className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {waitlistedCount}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1422]">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Cancelled / Rejected</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {cancelledCount}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1422]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by participant name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchParticipants()}
              className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4285F4] text-slate-900 dark:text-white"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'REGISTERED', 'PENDING_APPROVAL', 'WAITLISTED', 'CANCELLED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedStatus(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === tab
                    ? 'bg-[#1A73E8] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-white dark:bg-[#0f1422] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading participant roster...
            </div>
          ) : participants.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="No participants found"
              description="No participants match the selected filter or search criteria."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Registered At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.student.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.student.name)}`}
                          alt={p.student.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            {p.student.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.student.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {new Date(p.registeredAt).toLocaleDateString()} at{' '}
                      {new Date(p.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          p.status === 'REGISTERED'
                            ? 'success'
                            : p.status === 'PENDING_APPROVAL'
                            ? 'warning'
                            : p.status === 'WAITLISTED'
                            ? 'default'
                            : 'destructive'
                        }
                        size="sm"
                      >
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {p.attendanceStatus}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                      {p.notes || '—'}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAction(p.id, 'APPROVE')}
                              disabled={actionLoading}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAction(p.id, 'REJECT')}
                              disabled={actionLoading}
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {p.status === 'REGISTERED' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedParticipant(p);
                              setConfirmCancelOpen(true);
                            }}
                            disabled={actionLoading}
                            className="h-7 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel Participant Registration"
        description={`Are you sure you want to cancel ${selectedParticipant?.student.name}'s registration? If waitlisted students exist, the next student will be promoted automatically.`}
        confirmLabel="Confirm Cancellation"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={() => {
          if (selectedParticipant) {
            handleAction(selectedParticipant.id, 'CANCEL', 'Cancelled by organizer');
          }
        }}
      />
    </AppShell>
  );
}
