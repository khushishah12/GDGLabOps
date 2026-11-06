'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/lib/toast-context';
import { useUser } from '@/lib/user-context';
import {
  Search,
  Key,
  Users,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Video,
  MapPin,
  Globe,
  User,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const CATEGORY_PILLS = [
  'ALL',
  'Cybersecurity',
  'Data Science',
  'Linux',
];

interface PublicWorkshop {
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
  venueAddress?: string;
  instructorName?: string;
  instructorBio?: string;
  requiresApproval: boolean;
  environmentProfile?: string;
  requiredTools?: string[];
  environmentStatus?: string;
  environmentVersion?: number;
  _count?: { registrations?: number };
}

export default function StudentExplorePage() {
  const { currentUser } = useUser();
  const { success, error, info } = useToast();

  const [workshops, setWorkshops] = useState<PublicWorkshop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Student registered workshop IDs
  const [registeredWorkshopIds, setRegisteredWorkshopIds] = useState<Set<string>>(new Set());

  // Join With Code Modal
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  const [eventCodeInput, setEventCodeInput] = useState('');
  const [isJoiningWithCode, setIsJoiningWithCode] = useState(false);

  // Direct Registration Confirmation Modal
  const [selectedWorkshop, setSelectedWorkshop] = useState<PublicWorkshop | null>(null);
  const [regNotes, setRegNotes] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchWorkshopsAndRegistrations = async () => {
    setIsLoading(true);
    try {
      const [wsRes, regRes] = await Promise.all([
        fetch('/api/workshops?isPublic=true'),
        fetch(`/api/student/workshops?studentId=${currentUser.id}`),
      ]);

      if (wsRes.ok) {
        const wsJson = await wsRes.json();
        if (wsJson.success) {
          const items = Array.isArray(wsJson.data)
            ? wsJson.data
            : Array.isArray(wsJson.data?.items)
            ? wsJson.data.items
            : [];
          setWorkshops(items);
        }
      }

      if (regRes.ok) {
        const regJson = await regRes.json();
        if (regJson.success) {
          const list = Array.isArray(regJson.data)
            ? regJson.data
            : Array.isArray(regJson.data?.items)
            ? regJson.data.items
            : [];
          const registeredIds = new Set<string>(list.map((r: any) => r.workshopId || r.id));
          setRegisteredWorkshopIds(registeredIds);
        }
      }
    } catch (err: any) {
      error('Fetch Error', 'Failed to retrieve available workshops');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshopsAndRegistrations();
  }, [currentUser.id]);

  // Code-based Registration
  const handleJoinWithCode = async () => {
    const code = eventCodeInput.trim().toUpperCase();
    if (!code) {
      error('Input Required', 'Please enter a valid event registration code.');
      return;
    }

    setIsJoiningWithCode(true);
    try {
      const res = await fetch('/api/workshops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationCode: code,
          studentId: currentUser.id,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        const status = json.data?.status;
        if (status === 'WAITLISTED') {
          info('Added to Waitlist', `Workshop is full. You have been placed on the waitlist with code ${code}.`);
        } else if (status === 'PENDING_APPROVAL') {
          info('Registration Submitted', 'Your registration is pending approval by the workshop organiser.');
        } else {
          success('Enrolled Successfully! 🎉', `You are registered for "${json.data?.workshop?.title || 'Workshop'}".`);
        }
        setIsJoinCodeModalOpen(false);
        setEventCodeInput('');
        fetchWorkshopsAndRegistrations();
      } else {
        if (res.status === 429) {
          error('Rate Limit Exceeded', 'Too many registration attempts. Please wait 5 minutes before trying again.');
        } else {
          error('Registration Error', json.error || 'Invalid or expired event code.');
        }
      }
    } catch (err: any) {
      error('Connection Error', err.message);
    } finally {
      setIsJoiningWithCode(false);
    }
  };

  // Direct Registration
  const handleDirectRegister = async () => {
    if (!selectedWorkshop) return;
    setIsRegistering(true);

    try {
      const res = await fetch('/api/workshops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId: selectedWorkshop.id,
          studentId: currentUser.id,
          notes: regNotes.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        const status = json.data?.status;
        if (status === 'WAITLISTED') {
          info('Added to Waitlist', 'Capacity is full. You are on the waitlist and will be promoted automatically if a seat opens.');
        } else if (status === 'PENDING_APPROVAL') {
          info('Request Submitted', 'Your application is pending review by the organiser.');
        } else {
          success('Seat Confirmed! 🚀', `You are registered for "${selectedWorkshop.title}".`);
        }
        setSelectedWorkshop(null);
        setRegNotes('');
        fetchWorkshopsAndRegistrations();
      } else {
        error('Registration Failed', json.error || 'Failed to complete registration');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const filteredWorkshops = workshops.filter((ws) => {
    const matchesSearch =
      ws.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ws.instructorName && ws.instructorName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || ws.domain === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'ALL' || ws.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Header with Join Code Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Explore Workshops & Study Jams
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Join hands-on developer workshops with pre-configured cloud sandboxes. No local software needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsJoinCodeModalOpen(true)}
              leftIcon={<Key className="w-4 h-4 text-amber-500" />}
              className="text-xs"
            >
              Join with Event Code
            </Button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_PILLS.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {cat === 'ALL' ? 'All Tracks' : cat}
            </button>
          ))}
        </div>

        {/* Search & Difficulty Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526]">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search by topic, instructor, or keywords (e.g., Kubernetes, Security, Python)..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Skill Levels' },
                { value: 'BEGINNER', label: 'Beginner' },
                { value: 'INTERMEDIATE', label: 'Intermediate' },
                { value: 'ADVANCED', label: 'Advanced' },
              ]}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Workshops Grid */}
        {filteredWorkshops.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="No workshops found"
            description="No active workshops match your search criteria. Try adjusting the category or search keywords."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedDifficulty('ALL');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkshops.map((ws) => {
              const regCount = ws.confirmedRegistrations ?? ws._count?.registrations ?? 0;
              const isFull = regCount >= ws.participantLimit;
              const isEnrolled = registeredWorkshopIds.has(ws.id);
              const capacityPct = Math.min(100, Math.round((regCount / (ws.participantLimit || 1)) * 100));

              return (
                <Card
                  key={ws.id}
                  className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md"
                >
                  <div>
                    {ws.bannerUrl && (
                      <div className="h-36 w-full overflow-hidden rounded-t-xl relative border-b border-slate-200/60 dark:border-slate-800">
                        <img src={ws.bannerUrl} alt={ws.title} className="h-full w-full object-cover" />
                        <div className="absolute top-2.5 right-2.5">
                          {isEnrolled ? (
                            <Badge variant="success" size="sm">
                              Enrolled
                            </Badge>
                          ) : isFull ? (
                            <Badge variant="warning" size="sm">
                              Waitlist Open
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm">
                              Open for Reg
                            </Badge>
                          )}
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
                      <div className="flex items-center justify-between">
                        <Badge variant="domain" size="sm">
                          {ws.domain}
                        </Badge>
                        <span className="text-[11px] text-slate-400">{ws.duration} mins</span>
                      </div>

                      <CardTitle className="text-sm font-bold pt-2 leading-snug line-clamp-1">
                        {ws.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 pt-1">
                        {ws.shortDescription || ws.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(ws.startDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            {ws.venueType === 'ONLINE' ? (
                              <Video className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {ws.venueType}
                          </span>
                        </div>

                        {ws.instructorName && (
                          <div className="text-[11px] text-slate-400 truncate">
                            Speaker: <strong className="text-slate-600 dark:text-slate-300">{ws.instructorName}</strong>
                          </div>
                        )}

                        {/* Cloud Environment & Tool Badges */}
                        <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/30 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-[#1a73e8] dark:text-[#4285F4] uppercase tracking-wide">
                              {ws.domain === 'Cybersecurity'
                                ? '🛡️ Kali Linux Sandbox'
                                : ws.domain === 'Data Science'
                                ? '📊 Data Science & MySQL'
                                : '🐧 Ubuntu Linux Sandbox'}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              0 Device Setup
                            </span>
                          </div>
                          {Array.isArray(ws.requiredTools) && ws.requiredTools.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {ws.requiredTools.slice(0, 4).map((toolId) => (
                                <span
                                  key={toolId}
                                  className="text-[9px] font-mono px-1 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                >
                                  {toolId}
                                </span>
                              ))}
                              {ws.requiredTools.length > 4 && (
                                <span className="text-[9px] text-slate-400">
                                  +{ws.requiredTools.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Capacity</span>
                          <span>
                            {regCount} / {ws.participantLimit} seats
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isFull ? 'bg-amber-500' : 'bg-[#4285F4]'}`}
                            style={{ width: `${capacityPct}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <CardFooter className="p-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                    {isEnrolled ? (
                      <Link href="/student/overview" className="w-full">
                        <Button size="sm" variant="secondary" className="w-full text-xs h-8">
                          View in My Dashboard
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={() => setSelectedWorkshop(ws)}
                      >
                        {isFull
                          ? 'Join Waitlist'
                          : ws.requiresApproval
                          ? 'Request Registration'
                          : 'Register for Workshop'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Join With Code Modal */}
        <Dialog open={isJoinCodeModalOpen} onOpenChange={setIsJoinCodeModalOpen}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              <DialogTitle>Enter Event Registration Code</DialogTitle>
            </div>
            <DialogDescription>
              Enter the unique event code provided by your GDG chapter organiser.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <Input
              label="Event Code"
              placeholder="e.g. GDG-LNX-2026"
              value={eventCodeInput}
              onChange={(e) => setEventCodeInput(e.target.value.toUpperCase())}
              helperText="Codes are uppercase alphanumeric (e.g. GDG-CLOUD-9A2B)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsJoinCodeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={isJoiningWithCode}
              onClick={handleJoinWithCode}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Verify & Register
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Direct Workshop Registration Modal */}
        <Dialog open={!!selectedWorkshop} onOpenChange={(open) => !open && setSelectedWorkshop(null)}>
          {selectedWorkshop && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="domain" size="sm">
                    {selectedWorkshop.domain}
                  </Badge>
                  <DialogTitle className="text-base font-bold">
                    Register for {selectedWorkshop.title}
                  </DialogTitle>
                </div>
                <DialogDescription>
                  Confirm your participation in this hands-on workshop session.
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date & Time:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(selectedWorkshop.startDate).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedWorkshop.duration} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Delivery:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedWorkshop.venueType}
                    </span>
                  </div>
                  {selectedWorkshop.instructorName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Speaker:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedWorkshop.instructorName}
                      </span>
                    </div>
                  )}
                </div>

                {selectedWorkshop.requiresApproval && (
                  <div className="p-2.5 rounded-lg border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>This workshop requires organiser approval before sandbox access is granted.</span>
                  </div>
                )}

                {selectedWorkshop.confirmedRegistrations >= selectedWorkshop.participantLimit && (
                  <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Workshop is at full capacity. You will be registered on the priority waitlist.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Notes or Learning Objectives (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What are you most excited to learn during this session?"
                    value={regNotes}
                    onChange={(e) => setRegNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedWorkshop(null)}>
                  Cancel
                </Button>
                <Button size="sm" isLoading={isRegistering} onClick={handleDirectRegister}>
                  {selectedWorkshop.confirmedRegistrations >= selectedWorkshop.participantLimit
                    ? 'Join Waitlist'
                    : selectedWorkshop.requiresApproval
                    ? 'Submit Application'
                    : 'Confirm Registration'}
                </Button>
              </DialogFooter>
            </>
          )}
        </Dialog>
      </div>
    </AppShell>
  );
}
