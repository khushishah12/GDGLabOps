'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/lib/toast-context';
import { useUser } from '@/lib/user-context';
import { useWorkshopRealtime } from '@/lib/hooks/use-workshop-realtime';
import {
  Users,
  Activity,
  Terminal,
  Trophy,
  HelpCircle,
  Megaphone,
  Radio,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Pin,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';

export default function WorkshopLiveMonitoringPage() {
  const params = useParams();
  const workshopId = (params?.id as string) || '';
  const { currentUser } = useUser();
  const { success, error, info } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [searchRoster, setSearchRoster] = useState('');

  // Announcement Composer Modal
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);

  // Help Request Modal & Active Thread
  const [selectedHelpRequest, setSelectedHelpRequest] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // 1. Fetch Initial Live Summary
  const fetchLiveSummary = useCallback(async () => {
    if (!workshopId) return;
    try {
      const res = await fetch(`/api/workshops/${workshopId}/live`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDashboardData(json.data);
        }
      }
    } catch {
      error('Fetch Error', 'Failed to retrieve live monitoring metrics');
    } finally {
      setIsLoading(false);
    }
  }, [workshopId]);

  useEffect(() => {
    fetchLiveSummary();
  }, [fetchLiveSummary]);

  // 2. Real-Time Hook Integration
  const { connectionState } = useWorkshopRealtime({
    workshopId,
    userId: currentUser.id,
    role: currentUser.role,
    onAnnouncement: (ann) => {
      info('Announcement Broadcasted', ann.title);
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          recentAnnouncements: [ann, ...(prev.recentAnnouncements || []).slice(0, 4)],
        };
      });
    },
    onActivity: (act) => {
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          recentActivity: [act, ...(prev.recentActivity || []).slice(0, 19)],
        };
      });
    },
    onProgress: (prog) => {
      // Update student progress in live roster
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        const updatedRoster = (prev.roster || []).map((student: any) => {
          if (student.studentId === prog.studentId) {
            return {
              ...student,
              progress: {
                completedChallenges: prog.completedChallenges,
                totalChallenges: prog.totalChallenges,
                totalPoints: prog.totalPoints,
                percentage: prog.completionPercentage,
                status: prog.completionPercentage >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
              },
            };
          }
          return student;
        });

        return {
          ...prev,
          roster: updatedRoster,
        };
      });
    },
    onHelpRequest: (req) => {
      info('Help Request Received', `${req.category} from ${req.student?.name || 'student'}`);
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        const exists = (prev.helpRequests || []).some((h: any) => h.id === req.id);
        const updated = exists
          ? prev.helpRequests.map((h: any) => (h.id === req.id ? { ...h, ...req } : h))
          : [req, ...(prev.helpRequests || [])];
        return {
          ...prev,
          helpRequests: updated,
        };
      });
    },
    onPresenceChange: (presence) => {
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        const updatedRoster = (prev.roster || []).map((student: any) => {
          if (student.studentId === presence.userId) {
            return {
              ...student,
              presenceStatus: presence.status || (presence.disconnectedAt ? 'OFFLINE' : 'ONLINE'),
              lastHeartbeat: new Date().toISOString(),
            };
          }
          return student;
        });

        const activeCount = updatedRoster.filter((s: any) => s.presenceStatus === 'ONLINE').length;
        const offlineCount = updatedRoster.filter((s: any) => s.presenceStatus === 'OFFLINE').length;

        return {
          ...prev,
          roster: updatedRoster,
          participation: {
            ...prev.participation,
            currentlyActive: activeCount,
            offlineCount,
          },
        };
      });
    },
  });

  // 3. Handle Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;

    setIsSubmittingAnnouncement(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          message: announcementMessage.trim(),
          priority: announcementPriority,
          isPinned: announcementPinned,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success('Announcement Sent', 'Broadcast delivered to all workshop participants.');
        setAnnouncementTitle('');
        setAnnouncementMessage('');
        setIsAnnouncementModalOpen(false);
      } else {
        error('Failed to Send', json.error?.message || 'Could not post announcement');
      }
    } catch {
      error('Network Error', 'Failed to publish announcement');
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  // 4. Handle Respond to Help Request
  const handleSendHelpReply = async () => {
    if (!selectedHelpRequest || !replyMessage.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(
        `/api/workshops/${workshopId}/help-requests/${selectedHelpRequest.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: replyMessage.trim() }),
        }
      );

      const json = await res.json();
      if (res.ok && json.success) {
        success('Message Sent', 'Student has been notified of your response.');
        setSelectedHelpRequest((prev: any) => ({
          ...prev,
          status: 'IN_PROGRESS',
          messages: [...(prev.messages || []), json.data],
        }));
        setReplyMessage('');
      }
    } catch {
      error('Send Failed', 'Could not deliver reply message');
    } finally {
      setIsSendingReply(false);
    }
  };

  // 5. Handle Resolve Help Request
  const handleResolveHelpRequest = async (statusToSet: 'RESOLVED' | 'CLOSED') => {
    if (!selectedHelpRequest) return;

    try {
      const res = await fetch(
        `/api/workshops/${workshopId}/help-requests/${selectedHelpRequest.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: statusToSet,
            resolutionNotes: resolutionNotes.trim() || undefined,
          }),
        }
      );

      const json = await res.json();
      if (res.ok && json.success) {
        success('Request Updated', `Help request marked as ${statusToSet}.`);
        setDashboardData((prev: any) => ({
          ...prev,
          helpRequests: (prev.helpRequests || []).filter((h: any) => h.id !== selectedHelpRequest.id),
        }));
        setSelectedHelpRequest(null);
      }
    } catch {
      error('Update Failed', 'Could not resolve help request');
    }
  };

  if (isLoading || !dashboardData) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#1a73e8]" />
          <p className="text-sm font-medium text-slate-500">Loading Live Workshop Monitoring Engine...</p>
        </div>
      </AppShell>
    );
  }

  const { workshop, participation, labs, challenges, roster, helpRequests, recentActivity } = dashboardData;

  const filteredRoster = (roster || []).filter((s: any) =>
    s.name.toLowerCase().includes(searchRoster.toLowerCase()) ||
    s.email.toLowerCase().includes(searchRoster.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Header Breadcrumb & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/dashboard/workshops" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Workshops
              </Link>
              <span>/</span>
              <span>{workshop.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {workshop.title}
              </h1>
              <Badge variant="domain" size="sm">
                {workshop.domain}
              </Badge>
              {connectionState === 'CONNECTED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE MONITORING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  RECONNECTING
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLiveSummary}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Data
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-white"
              leftIcon={<Megaphone className="w-3.5 h-3.5" />}
            >
              Broadcast Announcement
            </Button>
          </div>
        </div>

        {/* 1. Live Telemetry Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Live Active Students</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {participation.currentlyActive}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {participation.totalRegistered} Registered</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {participation.offlineCount} currently offline • {participation.idleCount} idle
            </div>
          </Card>

          <Card className="p-4 border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Lab Sandboxes</span>
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Terminal className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {labs.activeCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">Running Containers</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {labs.provisioningCount} provisioning • {labs.completedCount} finished
            </div>
          </Card>

          <Card className="p-4 border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Milestone Progress</span>
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Trophy className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {challenges.completedStudentsCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">Completed All</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {challenges.inProgressStudentsCount} in progress • {challenges.notStartedStudentsCount} not started
            </div>
          </Card>

          <Card className="p-4 border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Help Request Queue</span>
              <span className={`p-1.5 rounded-lg ${
                helpRequests.length > 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-slate-500/10 text-slate-500'
              }`}>
                <HelpCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {helpRequests.length}
              </span>
              <span className="text-xs text-slate-500 font-mono">Pending Resolution</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {helpRequests.length > 0 ? 'Requires organiser attention' : 'All clear! No open tickets'}
            </div>
          </Card>
        </div>

        {/* 2. Main Content Split: Roster & Queue (Left) vs Real-Time Activity (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Participant Roster & Help Requests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Help Requests Queue Card */}
            {helpRequests.length > 0 && (
              <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10">
                <CardHeader className="p-4 pb-2 border-b border-rose-100 dark:border-rose-900/40 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <CardTitle className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      Incoming Help Requests ({helpRequests.length})
                    </CardTitle>
                  </div>
                  <span className="text-[11px] text-rose-700 dark:text-rose-300">
                    Click a ticket to view and reply
                  </span>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {helpRequests.map((hr: any) => (
                    <div
                      key={hr.id}
                      onClick={() => setSelectedHelpRequest(hr)}
                      className="p-3 rounded-lg border border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-slate-900 hover:shadow-sm cursor-pointer transition-all flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {hr.student?.name}
                          </span>
                          <Badge variant="outline" size="sm" className="text-[10px] font-mono">
                            {hr.category}
                          </Badge>
                          {hr.challenge && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              • {hr.challenge.title}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {hr.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(hr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Respond
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Live Participant Roster */}
            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold">
                    Participant Presence & Lab Telemetry
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Live heartbeats, container states, and challenge completion
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search participant..."
                    value={searchRoster}
                    onChange={(e) => setSearchRoster(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
                </div>
              </CardHeader>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-medium">
                    <tr>
                      <th className="p-3 pl-4">Participant</th>
                      <th className="p-3">Presence</th>
                      <th className="p-3">Cloud Sandbox</th>
                      <th className="p-3">Milestone Progress</th>
                      <th className="p-3 pr-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRoster.map((student: any) => (
                      <tr key={student.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {student.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {student.email}
                          </div>
                        </td>

                        <td className="p-3">
                          {student.presenceStatus === 'ONLINE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ONLINE
                            </span>
                          ) : student.presenceStatus === 'IDLE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              IDLE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                              OFFLINE
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {student.activeSession ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              <Terminal className="w-3 h-3" />
                              {student.activeSession.profile || 'ubuntu'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">None</span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#1a73e8] h-full rounded-full transition-all"
                                style={{ width: `${student.progress.percentage}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {student.progress.completedChallenges}/{student.progress.totalChallenges}
                            </span>
                          </div>
                        </td>

                        <td className="p-3 pr-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {student.progress.totalPoints}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Column (1 Col): Live Activity Stream & Announcements */}
          <div className="space-y-6">
            {/* Live Chronological Activity Stream */}
            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#1a73e8]" />
                  <CardTitle className="text-sm font-bold">Live Activity Feed</CardTitle>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Real-Time</span>
              </CardHeader>
              <CardContent className="p-3 max-h-[460px] overflow-y-auto space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Waiting for live participant events...
                  </p>
                ) : (
                  recentActivity.map((act: any) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-xs">
                      <div className="w-2 h-2 rounded-full bg-[#1a73e8] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-slate-800 dark:text-slate-200 leading-snug">
                          <span className="font-semibold">{act.actor?.name || 'A participant'}</span>{' '}
                          {act.eventType === 'CHALLENGE_COMPLETED' && (
                            <span className="text-emerald-600 font-medium">completed a milestone</span>
                          )}
                          {act.eventType === 'LAB_LAUNCHED' && (
                            <span className="text-blue-600 font-medium">launched a cloud sandbox</span>
                          )}
                          {act.eventType === 'HELP_REQUESTED' && (
                            <span className="text-rose-600 font-medium">requested assistance</span>
                          )}
                          {act.eventType === 'ANNOUNCEMENT_POSTED' && (
                            <span className="text-amber-600 font-medium">broadcasted an announcement</span>
                          )}
                          {act.eventType === 'HELP_RESOLVED' && (
                            <span className="text-emerald-600 font-medium">resolved a help request</span>
                          )}
                          {act.eventType === 'PARTICIPANT_JOINED' && (
                            <span>joined the workshop</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Broadcast Widget */}
            <Card className="border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="w-4 h-4 text-[#1a73e8]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Workshop Broadcasts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Send urgent announcements, hints, or instructions to all connected students.
              </p>
              <Button
                size="sm"
                className="w-full text-xs bg-[#1a73e8] hover:bg-[#1557b0] text-white"
                onClick={() => setIsAnnouncementModalOpen(true)}
              >
                Create Announcement
              </Button>
            </Card>
          </div>
        </div>

        {/* Modal: Announcement Composer */}
        <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
          <DialogHeader>
            <DialogTitle>Broadcast Workshop Announcement</DialogTitle>
            <DialogDescription>
              This announcement will be instantly pushed to all active participants and stored in the workshop bulletin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Announcement Title
              </label>
              <input
                type="text"
                required
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g. Hint for Milestone 1 / Coffee Break in 15 mins"
                className="w-full text-xs p-2.5 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Message Content
              </label>
              <textarea
                required
                rows={4}
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full text-xs p-2.5 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Priority Level
                </label>
                <select
                  value={announcementPriority}
                  onChange={(e: any) => setAnnouncementPriority(e.target.value)}
                  className="w-full text-xs p-2 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent Alert</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="pinAnnouncement"
                  checked={announcementPinned}
                  onChange={(e) => setAnnouncementPinned(e.target.checked)}
                  className="rounded border-slate-300 text-[#1a73e8]"
                />
                <label htmlFor="pinAnnouncement" className="text-xs text-slate-700 dark:text-slate-300">
                  Pin to Top
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAnnouncementModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingAnnouncement}
                className="bg-[#1a73e8] text-white"
              >
                {isSubmittingAnnouncement ? 'Broadcasting...' : 'Broadcast Now'}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal: Help Request Response Thread */}
        {selectedHelpRequest && (
          <Dialog open={Boolean(selectedHelpRequest)} onOpenChange={() => setSelectedHelpRequest(null)}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">
                  {selectedHelpRequest.category}
                </Badge>
                <DialogTitle className="text-base">
                  Help Request: {selectedHelpRequest.student?.name}
                </DialogTitle>
              </div>
              <DialogDescription>
                {selectedHelpRequest.student?.email} • Created{' '}
                {new Date(selectedHelpRequest.createdAt).toLocaleTimeString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="font-semibold text-slate-500 mb-1">Student Problem Description:</div>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {selectedHelpRequest.description}
                </p>
              </div>

              {/* Threaded Messages */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(selectedHelpRequest.messages || []).map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-lg text-xs ${
                      msg.senderRole === 'ORGANISER' || msg.senderRole === 'SUPER_ADMIN'
                        ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 ml-4'
                        : 'bg-slate-100 dark:bg-slate-800 mr-4'
                    }`}
                  >
                    <div className="font-semibold text-[10px] text-slate-500 mb-0.5">
                      {msg.sender?.name} ({msg.senderRole})
                    </div>
                    <div>{msg.message}</div>
                  </div>
                ))}
              </div>

              {/* Organiser Reply Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type guidance message..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendHelpReply();
                  }}
                  className="flex-1 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={handleSendHelpReply}
                  disabled={isSendingReply || !replyMessage.trim()}
                  className="bg-[#1a73e8] text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Resolution Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Resolution summary notes (optional)..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedHelpRequest(null)}
              >
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => handleResolveHelpRequest('RESOLVED')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                </Button>
              </div>
            </DialogFooter>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
