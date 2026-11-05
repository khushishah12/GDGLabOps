'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/lib/toast-context';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  XCircle,
  CopyPlus,
  EyeOff,
  RefreshCw,
  Ban,
  ShieldAlert,
} from 'lucide-react';

interface WorkshopItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  domain: string;
  difficulty: string;
  registrationCode: string;
  codeJoinEnabled: boolean;
  status: string;
  participantLimit: number;
  confirmedRegistrations: number;
  waitlistedRegistrations: number;
  duration: number;
  bannerUrl?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  venueType: string;
  instructorName?: string;
  _count?: {
    registrations?: number;
  };
}

export default function WorkshopListingPage() {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [workshops, setWorkshops] = useState<WorkshopItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [workshopToCancel, setWorkshopToCancel] = useState<WorkshopItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Action Loading State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchWorkshops = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/workshops');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setWorkshops(json.data);
        }
      }
    } catch (err: any) {
      error('Fetch Error', 'Failed to retrieve workshops from database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const copyEventCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success('Event Code Copied', `${code} copied to clipboard.`);
  };

  // 1. Duplicate Workshop
  const handleDuplicate = async (workshop: WorkshopItem) => {
    setActionLoadingId(workshop.id);
    try {
      const res = await fetch(`/api/workshops/${workshop.id}/duplicate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Workshop Duplicated', `Created draft duplicate: "${json.data.title}"`);
        fetchWorkshops();
      } else {
        error('Duplication Failed', json.error || 'Failed to duplicate workshop');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Publish Workshop
  const handlePublish = async (workshop: WorkshopItem) => {
    setActionLoadingId(workshop.id);
    try {
      const res = await fetch(`/api/workshops/${workshop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Workshop Published 🚀', `"${workshop.title}" is now open for registrations.`);
        fetchWorkshops();
      } else {
        error('Publishing Failed', json.error || 'Could not publish workshop');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Unpublish Workshop
  const handleUnpublish = async (workshop: WorkshopItem) => {
    setActionLoadingId(workshop.id);
    try {
      const res = await fetch(`/api/workshops/${workshop.id}/unpublish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Workshop Unpublished', `"${workshop.title}" reverted to Draft mode.`);
        fetchWorkshops();
      } else {
        error('Unpublish Blocked', json.error || 'Cannot unpublish workshop with confirmed registrations.');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Cancel Workshop
  const confirmCancel = async () => {
    if (!workshopToCancel) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/workshops/${workshopToCancel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Workshop Cancelled', `"${workshopToCancel.title}" has been cancelled.`);
        setCancelModalOpen(false);
        setWorkshopToCancel(null);
        setCancelReason('');
        fetchWorkshops();
      } else {
        error('Cancellation Failed', json.error || 'Could not cancel workshop');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  // 5. Regenerate Joining Code
  const handleRegenerateCode = async (workshop: WorkshopItem) => {
    setActionLoadingId(workshop.id);
    try {
      const res = await fetch(`/api/workshops/${workshop.id}/code/regenerate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('New Code Generated', `Code updated to: ${json.data.registrationCode}`);
        fetchWorkshops();
      } else {
        error('Code Generation Failed', json.error || 'Could not regenerate code');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 6. Toggle Code Joining
  const handleToggleCodeJoin = async (workshop: WorkshopItem) => {
    setActionLoadingId(workshop.id);
    try {
      const res = await fetch(`/api/workshops/${workshop.id}/code/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !workshop.codeJoinEnabled }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const stateStr = !workshop.codeJoinEnabled ? 'enabled' : 'disabled';
        info('Code Joining Updated', `Code joining is now ${stateStr} for "${workshop.title}"`);
        fetchWorkshops();
      } else {
        error('Toggle Failed', json.error || 'Could not toggle code joining');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredWorkshops = workshops.filter((ws) => {
    const matchesSearch =
      ws.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.registrationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'ALL' || ws.domain === selectedDomain;
    const matchesStatus = selectedStatus === 'ALL' || ws.status === selectedStatus;
    return matchesSearch && matchesDomain && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'default';
      case 'ONGOING':
        return 'success';
      case 'DRAFT':
        return 'secondary';
      case 'CANCELLED':
        return 'destructive';
      case 'COMPLETED':
        return 'outline';
      case 'REGISTRATION_CLOSED':
      case 'FULL':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Workshops & Events
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create, schedule, and orchestrate technical workshops with automated sandbox provisioning.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWorkshops}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            <Link href="/dashboard/workshops/create">
              <Button size="sm" className="text-xs" leftIcon={<Plus className="w-4 h-4" />}>
                Create Workshop
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526]">
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search workshops or event codes..."
                leftIcon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Domains' },
                  { value: 'Cloud Computing', label: 'Cloud Computing' },
                  { value: 'DevOps', label: 'DevOps' },
                  { value: 'Cybersecurity', label: 'Cybersecurity' },
                  { value: 'Web Development', label: 'Web Development' },
                  { value: 'Artificial Intelligence / Machine Learning', label: 'AI & ML' },
                  { value: 'Open Source', label: 'Open Source' },
                  { value: 'Data Science', label: 'Data Science' },
                ]}
                className="h-9 text-xs"
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'PUBLISHED', label: 'Published' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'ONGOING', label: 'Ongoing' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                  { value: 'REGISTRATION_CLOSED', label: 'Reg Closed' },
                  { value: 'FULL', label: 'Full / Waitlisted' },
                ]}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900/60 self-end md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-[#4285F4] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-[#4285F4] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content: Grid or List */}
        {filteredWorkshops.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="No workshops found"
            description="No workshops match the selected domain or search query. Try adjusting your filters or create a new workshop."
            actionLabel="Create Workshop"
            onAction={() => router.push('/dashboard/workshops/create')}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkshops.map((ws) => {
              const regCount = ws.confirmedRegistrations ?? ws._count?.registrations ?? 0;
              const capacityPct = Math.min(100, Math.round((regCount / (ws.participantLimit || 1)) * 100));

              return (
                <Card
                  key={ws.id}
                  className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md"
                >
                  <div>
                    {/* Banner Image */}
                    {ws.bannerUrl && (
                      <div className="h-36 w-full overflow-hidden rounded-t-xl relative border-b border-slate-200/60 dark:border-slate-800">
                        <img
                          src={ws.bannerUrl}
                          alt={ws.title}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          <Badge variant={getStatusBadgeVariant(ws.status) as any} size="sm">
                            {ws.status}
                          </Badge>
                        </div>
                        {ws.difficulty && (
                          <div className="absolute bottom-2 left-2">
                            <Badge variant="secondary" size="sm" className="bg-black/60 text-white backdrop-blur">
                              {ws.difficulty}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="domain" size="sm">
                          {ws.domain}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => copyEventCode(ws.registrationCode)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-500 hover:text-[#4285F4] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded transition-colors"
                            title="Click to copy registration code"
                          >
                            {ws.registrationCode}
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <CardTitle className="text-sm font-bold pt-2 leading-snug line-clamp-1">
                        {ws.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 pt-1">
                        {ws.shortDescription || ws.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {regCount} / {ws.participantLimit} enrolled
                          {ws.waitlistedRegistrations > 0 && (
                            <span className="text-amber-500 font-semibold">({ws.waitlistedRegistrations} waitlisted)</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {ws.duration} mins
                        </span>
                      </div>

                      {/* Capacity Progress Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            capacityPct >= 100 ? 'bg-amber-500' : 'bg-[#4285F4]'
                          }`}
                          style={{ width: `${capacityPct}%` }}
                        />
                      </div>

                      {ws.instructorName && (
                        <div className="text-[11px] text-slate-400">
                          Instructor: <strong className="text-slate-600 dark:text-slate-300">{ws.instructorName}</strong>
                        </div>
                      )}
                    </CardContent>
                  </div>

                  {/* Card Actions Footer */}
                  <CardFooter className="p-4 pt-3 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/20">
                    <div className="flex items-center justify-between w-full">
                      <Link href={`/dashboard/workshops/${ws.id}/participants`}>
                        <Button variant="outline" size="sm" className="text-xs h-7">
                          Participants ({regCount})
                        </Button>
                      </Link>
                      <Link href={`/dashboard/workshops/${ws.id}`}>
                        <Button size="sm" className="text-xs h-7">
                          View Details
                        </Button>
                      </Link>
                    </div>

                    {/* Quick Lifecycle Controls */}
                    <div className="flex items-center justify-between w-full pt-1.5 border-t border-slate-100 dark:border-slate-800/50 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {ws.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublish(ws)}
                            disabled={actionLoadingId === ws.id}
                            className="text-[#1a73e8] dark:text-[#4285F4] hover:underline font-semibold"
                          >
                            Publish
                          </button>
                        )}
                        {ws.status === 'PUBLISHED' && regCount === 0 && (
                          <button
                            onClick={() => handleUnpublish(ws)}
                            disabled={actionLoadingId === ws.id}
                            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
                          >
                            Unpublish
                          </button>
                        )}
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          onClick={() => handleDuplicate(ws)}
                          disabled={actionLoadingId === ws.id}
                          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
                        >
                          Duplicate
                        </button>
                        {ws.status !== 'CANCELLED' && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <button
                              onClick={() => {
                                setWorkshopToCancel(ws);
                                setCancelModalOpen(true);
                              }}
                              className="text-red-500 hover:text-red-600 hover:underline"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleRegenerateCode(ws)}
                        disabled={actionLoadingId === ws.id}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Regenerate Joining Code"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workshop Title</TableHead>
                <TableHead>Domain & Level</TableHead>
                <TableHead>Event Code</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkshops.map((ws) => {
                const regCount = ws.confirmedRegistrations ?? ws._count?.registrations ?? 0;
                return (
                  <TableRow key={ws.id}>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      <div>{ws.title}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Duration: {ws.duration}m • {ws.instructorName || 'GDG Instructor'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="domain" size="sm">
                          {ws.domain}
                        </Badge>
                        {ws.difficulty && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {ws.difficulty}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => copyEventCode(ws.registrationCode)}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#4285F4]"
                        title="Click to copy code"
                      >
                        {ws.registrationCode}
                        <Copy className="w-3 h-3 text-slate-400" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-xs">
                        {regCount} / {ws.participantLimit}
                      </span>
                      {ws.waitlistedRegistrations > 0 && (
                        <div className="text-[10px] text-amber-500">
                          +{ws.waitlistedRegistrations} waitlist
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(ws.status) as any} size="sm">
                        {ws.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/dashboard/workshops/${ws.id}/participants`}>
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                            Roster
                          </Button>
                        </Link>
                        <Link href={`/dashboard/workshops/${ws.id}`}>
                          <Button size="sm" className="text-xs h-7 px-2.5">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Cancellation Confirmation Modal */}
        <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              <DialogTitle>Cancel Workshop</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to cancel &quot;{workshopToCancel?.title}&quot;?
              This will notify confirmed students and close the sandbox environment allocations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Reason for Cancellation (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Rescheduled due to campus room maintenance..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
              Keep Active
            </Button>
            <Button
              size="sm"
              variant="destructive"
              isLoading={isCancelling}
              onClick={confirmCancel}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </AppShell>
  );
}
