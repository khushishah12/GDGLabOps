'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/lib/toast-context';
import { useUser } from '@/lib/user-context';
import {
  Calendar,
  Clock,
  Terminal,
  Play,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Video,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface RegistrationRecord {
  id: string;
  workshopId: string;
  status: string;
  registeredAt: string;
  notes?: string;
  workshop: {
    id: string;
    title: string;
    slug: string;
    domain: string;
    difficulty: string;
    startDate: string;
    endDate: string;
    duration: number;
    venueType: string;
    venueAddress?: string;
    registrationCode: string;
    bannerUrl?: string;
    instructorName?: string;
  };
}

export default function StudentMyWorkshopsPage() {
  const { currentUser } = useUser();
  const { success, error, info } = useToast();

  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<RegistrationRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const studentQuery = currentUser.id ? `?studentId=${currentUser.id}` : '';
      const res = await fetch(`/api/student/workshops${studentQuery}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const items = Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.data?.items)
            ? json.data.items
            : [];
          setRegistrations(items);
        }
      }
    } catch (err: any) {
      error('Fetch Error', 'Failed to retrieve your registrations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [currentUser.id]);

  const handleCancelRegistration = async () => {
    if (!selectedReg) return;
    setIsCancelling(true);

    try {
      const res = await fetch(`/api/workshops/registrations/${selectedReg.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (res.ok && json.success) {
        success('Registration Cancelled', `You have cancelled your seat for "${selectedReg.workshop.title}".`);
        setCancelModalOpen(false);
        setSelectedReg(null);
        fetchRegistrations();
      } else {
        error('Cancellation Error', json.error || 'Failed to cancel registration');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return <Badge variant="success" size="sm">Confirmed Seat</Badge>;
      case 'WAITLISTED':
        return <Badge variant="warning" size="sm">Waitlisted</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="secondary" size="sm">Pending Approval</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" size="sm">Cancelled</Badge>;
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              My Workshops & Registrations
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track upcoming sessions, sandbox access statuses, and manage your registrations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRegistrations}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            <Link href="/student/explore">
              <Button size="sm" className="text-xs">
                Browse More Workshops
              </Button>
            </Link>
          </div>
        </div>

        {/* Registrations List */}
        {registrations.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="No workshop registrations yet"
            description="You have not enrolled in any technical workshops yet. Browse open study jams and claim your sandbox seat."
            actionLabel="Explore Workshops"
            onAction={() => (window.location.href = '/student/explore')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {registrations.map((reg) => {
              const ws = reg.workshop;
              const firstLabId = (ws as any).workshopLabs?.[0]?.labTemplateId;
              const labWorkspaceUrl = firstLabId
                ? `/student/workshops/${ws.id}/labs/${firstLabId}`
                : '/student/lab/demo-session';

              return (
                <Card key={reg.id} className="flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    {ws.bannerUrl && (
                      <Link href={labWorkspaceUrl} className="block h-32 w-full overflow-hidden rounded-t-xl relative border-b border-slate-200/60 dark:border-slate-800 group">
                        <img src={ws.bannerUrl} alt={ws.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute top-2.5 right-2.5">
                          {getStatusBadge(reg.status)}
                        </div>
                      </Link>
                    )}

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="domain" size="sm">
                          {ws.domain}
                        </Badge>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {ws.registrationCode}
                        </span>
                      </div>
                      <Link href={labWorkspaceUrl} className="hover:underline">
                        <CardTitle className="text-sm font-bold pt-2 line-clamp-1">
                          {ws.title}
                        </CardTitle>
                      </Link>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-2.5 text-xs text-slate-500">
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(ws.startDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {ws.duration} mins
                        </span>
                      </div>

                      {reg.status === 'WAITLISTED' && (
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-2">
                          <Hourglass className="w-3.5 h-3.5 shrink-0" />
                          <span>You are on the waitlist. You will be automatically enrolled if a seat frees up.</span>
                        </div>
                      )}

                      {reg.status === 'PENDING_APPROVAL' && (
                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Organiser approval is required before sandbox container launch.</span>
                        </div>
                      )}
                    </CardContent>
                  </div>

                  <CardFooter className="p-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    {reg.status === 'REGISTERED' ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <Link href={labWorkspaceUrl} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full text-xs h-8">
                            Curriculum & Labs
                          </Button>
                        </Link>
                        <Link href="/student/lab/demo-session" className="flex-1">
                          <Button size="sm" className="w-full text-xs h-8" leftIcon={<Play className="w-3.5 h-3.5" />}>
                            Launch Terminal
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        {reg.status === 'WAITLISTED' ? 'Awaiting Seat' : 'Awaiting Review'}
                      </div>
                    )}

                    {reg.status !== 'CANCELLED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => {
                          setSelectedReg(reg);
                          setCancelModalOpen(true);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Cancellation Dialog */}
        <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="w-5 h-5" />
              <DialogTitle>Cancel Workshop Registration</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to cancel your seat for &quot;{selectedReg?.workshop?.title}&quot;?
              Your slot will immediately be offered to the next student on the waitlist.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
              Keep My Seat
            </Button>
            <Button
              size="sm"
              variant="destructive"
              isLoading={isCancelling}
              onClick={handleCancelRegistration}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </AppShell>
  );
}
