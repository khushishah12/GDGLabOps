'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toast-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Copy,
  Terminal,
  Play,
  Settings,
  Share2,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Trophy,
  RefreshCw,
  MapPin,
  Video,
  Globe,
  User,
  ShieldCheck,
  Ban,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
} from 'lucide-react';

export default function WorkshopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error, info } = useToast();

  const workshopId = (params?.id as string) || '';
  const [workshop, setWorkshop] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editShortDesc, setEditShortDesc] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCapacity, setEditCapacity] = useState('50');
  const [editInstructor, setEditInstructor] = useState('');
  const [editInstructorBio, setEditInstructorBio] = useState('');
  const [editVenueAddress, setEditVenueAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Attached Labs State
  const [attachedLabs, setAttachedLabs] = useState<any[]>([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);

  const fetchAttachedLabs = async () => {
    if (!workshopId) return;
    try {
      const res = await fetch(`/api/workshops/${workshopId}/labs`);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setAttachedLabs(json.data);
      }
    } catch {
      // quiet fallback
    }
  };

  const fetchAvailableTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setAvailableTemplates(json.data);
        if (json.data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(json.data[0].id);
        }
      }
    } catch {
      // quiet fallback
    }
  };

  const handleAttachLab = async () => {
    if (!selectedTemplateId) return;
    setIsAttaching(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labTemplateId: selectedTemplateId,
          isRequired: true,
          createSnapshot: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Lab Attached', 'Template curriculum snapshot successfully attached to workshop.');
        setIsAttachModalOpen(false);
        fetchAttachedLabs();
      } else {
        error('Attach Failed', json.error?.message || 'Failed to attach lab template');
      }
    } catch {
      error('Error', 'Failed to attach lab template');
    } finally {
      setIsAttaching(false);
    }
  };

  const handleDetachLab = async (labTemplateId: string) => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}/labs/${labTemplateId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        info('Lab Detached', 'Lab template removed from workshop curriculum.');
        fetchAttachedLabs();
      } else {
        error('Error', json.error?.message || 'Failed to detach lab');
      }
    } catch {
      error('Error', 'Failed to detach lab');
    }
  };

  const handleSyncSnapshot = async (labTemplateId: string) => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}/labs/${labTemplateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_snapshot' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Snapshot Refreshed', 'Workshop lab snapshot synced to latest template version.');
        fetchAttachedLabs();
      } else {
        error('Error', json.error?.message || 'Failed to sync snapshot');
      }
    } catch {
      error('Error', 'Failed to sync snapshot');
    }
  };

  const handleReorderLabs = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= attachedLabs.length) return;

    const reordered = [...attachedLabs];
    const temp = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = temp;

    setAttachedLabs(reordered);

    try {
      await fetch(`/api/workshops/${workshopId}/labs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedTemplateIds: reordered.map((l) => l.labTemplateId),
        }),
      });
      fetchAttachedLabs();
    } catch {
      error('Error', 'Failed to persist reorder.');
    }
  };

  const fetchWorkshop = async () => {
    if (!workshopId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWorkshop(json.data);
          setEditTitle(json.data.title);
          setEditShortDesc(json.data.shortDescription || '');
          setEditDescription(json.data.description);
          setEditCapacity(json.data.participantLimit?.toString() || '50');
          setEditInstructor(json.data.instructorName || '');
          setEditInstructorBio(json.data.instructorBio || '');
          setEditVenueAddress(json.data.venueAddress || '');
        }
      }
    } catch (err: any) {
      error('Fetch Error', 'Failed to retrieve workshop details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshop();
    fetchAttachedLabs();
    fetchAvailableTemplates();
  }, [workshopId]);

  const handleCopyCode = () => {
    if (!workshop?.registrationCode) return;
    navigator.clipboard.writeText(workshop.registrationCode);
    success('Event Code Copied!', `${workshop.registrationCode} copied to clipboard.`);
  };

  const handleRegenerateCode = async () => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}/code/regenerate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('New Code Generated', `Code updated to: ${json.data.registrationCode}`);
        fetchWorkshop();
      } else {
        error('Error', json.error || 'Failed to regenerate code');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleToggleCodeJoin = async () => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}/code/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !workshop.codeJoinEnabled }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        info('Code Joining Updated', `Code joining is now ${!workshop.codeJoinEnabled ? 'enabled' : 'disabled'}`);
        fetchWorkshop();
      } else {
        error('Error', json.error || 'Failed to toggle code join setting');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          shortDescription: editShortDesc.trim() || undefined,
          description: editDescription.trim(),
          participantLimit: parseInt(editCapacity) || workshop.participantLimit,
          instructorName: editInstructor.trim() || undefined,
          instructorBio: editInstructorBio.trim() || undefined,
          venueAddress: editVenueAddress.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Workshop Updated', 'Changes saved successfully.');
        setIsEditOpen(false);
        fetchWorkshop();
      } else {
        error('Update Failed', json.error || 'Failed to update workshop');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Workshop Published 🚀', 'Students can now register.');
        fetchWorkshop();
      } else {
        error('Publishing Error', json.error || 'Could not publish');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  if (isLoading || !workshop) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#4285F4]" />
            <span className="text-xs text-slate-500">Loading workshop data...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  const confirmedCount = workshop.confirmedRegistrations ?? 0;
  const waitlistedCount = workshop.waitlistedRegistrations ?? 0;
  const pendingCount = workshop.pendingApprovalRegistrations ?? 0;
  const capacityPct = Math.min(100, Math.round((confirmedCount / (workshop.participantLimit || 1)) * 100));

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/workshops">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="domain" size="sm">
                  {workshop.domain}
                </Badge>
                <Badge
                  variant={workshop.status === 'PUBLISHED' ? 'default' : workshop.status === 'ONGOING' ? 'success' : 'secondary'}
                  size="sm"
                >
                  {workshop.status}
                </Badge>
                {workshop.difficulty && (
                  <Badge variant="outline" size="sm">
                    {workshop.difficulty}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                {workshop.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {workshop.status === 'DRAFT' && (
              <Button size="sm" onClick={handlePublish} className="text-xs bg-[#1a73e8] hover:bg-[#1557b0]">
                Publish Workshop
              </Button>
            )}
            <Link href={`/dashboard/workshops/${workshop.id}/participants`}>
              <Button size="sm" variant="outline" className="text-xs" leftIcon={<Users className="w-3.5 h-3.5" />}>
                Manage Participants ({confirmedCount})
              </Button>
            </Link>
            <Link href={`/dashboard/workshops/${workshop.id}/sessions`}>
              <Button size="sm" variant="outline" className="text-xs" leftIcon={<Terminal className="w-3.5 h-3.5 text-emerald-500" />}>
                Live Lab Sessions
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              leftIcon={<Settings className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
          </div>
        </div>

        {/* Highlight Card: Registration Code & Key Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-8 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Registration Event Code
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    Code Joining: {workshop.codeJoinEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-6 px-1.5"
                    onClick={handleToggleCodeJoin}
                  >
                    Toggle
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-[#1a73e8] dark:text-[#4285F4]">
                  {workshop.registrationCode}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyCode}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Copy Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRegenerateCode}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    className="text-xs"
                    title="Regenerate code"
                  >
                    Regenerate
                  </Button>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {workshop.description}
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Enrolled</span>
                <span className="font-semibold text-sm">
                  {confirmedCount} / {workshop.participantLimit}
                </span>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                  <div className="bg-[#4285F4] h-full rounded-full" style={{ width: `${capacityPct}%` }} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Waitlisted</span>
                <span className="font-semibold text-sm text-amber-500">
                  {waitlistedCount} Students
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Pending Approval</span>
                <span className="font-semibold text-sm text-blue-500">
                  {pendingCount} Students
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                <span className="font-semibold text-sm">{workshop.duration} minutes</span>
              </div>
            </div>
          </Card>

          {/* Session Spec & Logistics Card */}
          <Card className="md:col-span-4 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Workshop Logistics
                </span>
                <Badge variant="outline" size="sm">
                  {workshop.venueType}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">
                      {new Date(workshop.startDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(workshop.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({workshop.timezone || 'UTC'})
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">
                      Registration Deadline
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(workshop.registrationDeadline).toLocaleString()}
                    </span>
                  </div>
                </div>

                {workshop.venueAddress && (
                  <div className="flex items-start gap-2">
                    {workshop.venueType === 'ONLINE' ? (
                      <Video className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    ) : (
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">
                        {workshop.venueType === 'ONLINE' ? 'Virtual Stream' : 'Physical Location'}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate block">
                        {workshop.venueAddress}
                      </span>
                    </div>
                  </div>
                )}

                {workshop.instructorName && (
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">
                        {workshop.instructorName}
                      </span>
                      {workshop.instructorBio && (
                        <span className="text-[11px] text-slate-400 block line-clamp-2">
                          {workshop.instructorBio}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Link href={`/dashboard/workshops/${workshop.id}/participants`}>
              <Button size="sm" variant="outline" className="w-full text-xs" leftIcon={<Users className="w-3.5 h-3.5" />}>
                View Participant Roster & CSV
              </Button>
            </Link>
          </Card>
        </div>

        {/* Attached Lab Curricula & Practical Templates */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Attached Lab Curricula & Practical Templates
                </h3>
                <Badge variant="outline" size="sm">
                  {attachedLabs.length} {attachedLabs.length === 1 ? 'Lab' : 'Labs'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Technical lab templates attached with immutable version snapshots for this workshop.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setIsAttachModalOpen(true)}
              className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Attach Lab Template
            </Button>
          </div>

          {attachedLabs.length === 0 ? (
            <div className="py-10 text-center space-y-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Lab Templates Attached</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Attach preconfigured lab templates from your organisation library to provide students with structured practical challenges.
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setIsAttachModalOpen(true)}>
                Attach from Library
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {attachedLabs.map((lab, idx) => {
                const template = lab.template;
                const challengesCount = lab.challenges?.length ?? 0;

                return (
                  <div
                    key={lab.id}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">#{lab.displayOrder}</span>
                        <Badge variant="domain" size="sm">
                          {template?.domain}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {template?.difficulty}
                        </Badge>
                        {lab.hasSnapshot && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            Immutable Snapshot Frozen
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {template?.name}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {template?.shortDescription || template?.description}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" /> {template?.estimatedDuration}m
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Trophy className="w-3.5 h-3.5" /> {challengesCount} challenges
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={idx === 0}
                        onClick={() => handleReorderLabs(idx, 'up')}
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={idx === attachedLabs.length - 1}
                        onClick={() => handleReorderLabs(idx, 'down')}
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Link href={`/dashboard/templates/${lab.labTemplateId}/preview`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs px-2 text-slate-600 dark:text-slate-300"
                          title="Preview student lab experience"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Preview
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs px-2 text-blue-600 dark:text-blue-400"
                        onClick={() => handleSyncSnapshot(lab.labTemplateId)}
                        title="Refresh snapshot to latest template version"
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Sync
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => handleDetachLab(lab.labTemplateId)}
                        title="Detach from workshop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Attach Lab Modal */}
        <Dialog open={isAttachModalOpen} onOpenChange={setIsAttachModalOpen}>
          <DialogHeader>
            <DialogTitle>Attach Lab Template to Workshop</DialogTitle>
            <DialogDescription>
              Select a reusable lab template from your organisation's curriculum library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Select Lab Template
              </label>
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                options={availableTemplates.map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.domain} • ${t.difficulty})`,
                }))}
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-bold block text-blue-900 dark:text-blue-200">
                Immutable Curriculum Snapshot
              </span>
              <p className="text-[11px] leading-relaxed">
                When attached, a snapshot of all challenges and instructions is permanently frozen for this workshop.
                Any subsequent edits to the template library will not disrupt active student sessions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAttachModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={isAttaching}
              onClick={handleAttachLab}
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-xs"
            >
              Attach Template
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogHeader>
            <DialogTitle>Edit Workshop Details</DialogTitle>
            <DialogDescription>Modify core parameters and participant limits.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              label="Workshop Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Input
              label="Short Summary"
              value={editShortDesc}
              onChange={(e) => setEditShortDesc(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Detailed Description
              </label>
              <textarea
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="number"
                label="Participant Limit"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
              />
              <Input
                label="Instructor Name"
                value={editInstructor}
                onChange={(e) => setEditInstructor(e.target.value)}
              />
            </div>
            <Input
              label="Venue Address / Link"
              value={editVenueAddress}
              onChange={(e) => setEditVenueAddress(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" isLoading={isSaving} onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </AppShell>
  );
}
