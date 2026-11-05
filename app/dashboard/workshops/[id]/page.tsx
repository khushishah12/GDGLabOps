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
