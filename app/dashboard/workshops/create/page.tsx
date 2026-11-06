'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/toast-context';
import { useUser } from '@/lib/user-context';
import { mockLabTemplates } from '@/lib/mock-data';
import {
  APPROVED_WORKSHOP_CATEGORIES,
  ApprovedWorkshopCategory,
  EnvironmentProfileId,
  ENVIRONMENT_PROFILES,
  getProfileForCategory,
  validateAndResolveTools,
} from '@/lib/workshop/tool-catalogue';
import { WorkshopToolManager } from '@/components/workshop/workshop-tool-manager';
import {
  ArrowLeft,
  Save,
  Sparkles,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  ShieldCheck,
  Globe,
  Lock,
  Key,
  Info,
} from 'lucide-react';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'US Eastern Time (America/New_York)' },
  { value: 'America/Chicago', label: 'US Central Time (America/Chicago)' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (America/Los_Angeles)' },
  { value: 'Europe/London', label: 'UK Time (Europe/London)' },
  { value: 'Europe/Berlin', label: 'Central European Time (Europe/Berlin)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (Asia/Kolkata)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (Asia/Singapore)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Asia/Tokyo)' },
  { value: 'Australia/Sydney', label: 'Sydney Time (Australia/Sydney)' },
];

export default function CreateWorkshopPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const { success, error, info } = useToast();

  // Basic Information
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState<ApprovedWorkshopCategory>('Cybersecurity');
  const [environmentProfile, setEnvironmentProfile] = useState<EnvironmentProfileId>('CYBERSECURITY_LAB');
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    ENVIRONMENT_PROFILES['CYBERSECURITY_LAB'].defaultToolIds
  );
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [tagsInput, setTagsInput] = useState('Kali Linux, Nmap, Metasploit, Security');
  const [bannerUrl, setBannerUrl] = useState(
    'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop&q=80'
  );
  const [templateId, setTemplateId] = useState(mockLabTemplates[0]?.id || 'tpl-1');

  // Schedule & Timezone
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('14:00');
  const [duration, setDuration] = useState('120');
  const [timezone, setTimezone] = useState('UTC');

  // Venue & Delivery
  const [venueType, setVenueType] = useState<'ONLINE' | 'OFFLINE' | 'HYBRID'>('ONLINE');
  const [venueAddress, setVenueAddress] = useState('');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/xyz-gdg-work');

  // Instructor Details
  const [instructorName, setInstructorName] = useState('Alex Rivera');
  const [instructorBio, setInstructorBio] = useState('GDG Chapter Lead & Cloud Solutions Architect');

  // Registration Settings
  const [registrationDeadline, setRegistrationDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 16);
  });
  const [participantLimit, setParticipantLimit] = useState('50');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [codeJoinEnabled, setCodeJoinEnabled] = useState(true);

  // Joining Code
  const generateCode = () => {
    const prefix = domain.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'GDG');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GDG-${prefix}-${randomHex}`;
  };
  const [joiningCode, setJoiningCode] = useState(generateCode());

  // Organisations
  const [organisations, setOrganisations] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch('/api/organisations');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setOrganisations(json.data);
            setSelectedOrgId(json.data[0].id);
            return;
          }
        }
      } catch {
        // Fallback
      }
      setSelectedOrgId('512705eb-5a51-4af7-b9cf-2ea61b8d83be');
    }
    loadOrgs();
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 3) errs.title = 'Title must be at least 3 characters';
    if (!description.trim() || description.trim().length < 10)
      errs.description = 'Description must be at least 10 characters';
    if (parseInt(duration) <= 0 || isNaN(parseInt(duration))) errs.duration = 'Duration must be positive in minutes';
    if (parseInt(participantLimit) <= 0 || isNaN(parseInt(participantLimit)))
      errs.participantLimit = 'Participant limit must be at least 1';

    const startDateTime = new Date(`${startDate}T${startTime}:00Z`);
    const regDeadlineDate = new Date(registrationDeadline);

    if (isNaN(startDateTime.getTime())) errs.startDate = 'Invalid workshop start date/time';
    if (isNaN(regDeadlineDate.getTime())) errs.registrationDeadline = 'Invalid registration deadline';
    if (regDeadlineDate > startDateTime) {
      errs.registrationDeadline = 'Registration deadline cannot be after workshop start time';
    }

    if (venueType === 'OFFLINE' && !venueAddress.trim()) {
      errs.venueAddress = 'Physical venue address is required for in-person workshops';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (publishImmediately: boolean) => {
    if (!validate()) {
      error('Validation Failed', 'Please resolve the highlighted form fields.');
      return;
    }

    setIsSubmitting(true);

    const startDateTime = new Date(`${startDate}T${startTime}:00Z`).toISOString();
    const endDateTime = new Date(
      new Date(startDateTime).getTime() + parseInt(duration) * 60 * 1000
    ).toISOString();
    const regDeadlineIso = new Date(registrationDeadline).toISOString();
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      organisationId: selectedOrgId || '512705eb-5a51-4af7-b9cf-2ea61b8d83be',
      title: title.trim(),
      slug,
      shortDescription: shortDescription.trim() || title.trim(),
      description: description.trim(),
      domain,
      environmentProfile,
      requiredTools: selectedToolIds,
      difficulty,
      tags: parsedTags,
      bannerUrl: bannerUrl || undefined,
      startDate: startDateTime,
      endDate: endDateTime,
      duration: parseInt(duration),
      timezone,
      venueType,
      venueAddress: venueType === 'ONLINE' ? meetingLink : venueAddress || meetingLink,
      instructorName: instructorName.trim() || undefined,
      instructorBio: instructorBio.trim() || undefined,
      registrationDeadline: regDeadlineIso,
      participantLimit: parseInt(participantLimit),
      requiresApproval,
      isPublic,
      codeJoinEnabled,
      registrationCode: joiningCode.trim().toUpperCase(),
      status: publishImmediately ? 'PUBLISHED' : 'DRAFT',
    };

    try {
      const res = await fetch('/api/workshops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(
          publishImmediately ? 'Workshop Published! 🚀' : 'Workshop Draft Saved!',
          `"${title}" is now available with code: ${json.data?.registrationCode || joiningCode}`
        );
        router.push('/dashboard/workshops');
      } else {
        const errorMsg = json.error || (json.details ? JSON.stringify(json.details) : 'Failed to create workshop');
        error('Creation Error', errorMsg);
      }
    } catch (err: any) {
      error('Connection Error', err.message || 'Could not communicate with the backend');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb & Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/workshops">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Create Workshop
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure curriculum, schedule, sandbox capacity, and registration controls.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              isLoading={isSubmitting}
              onClick={() => handleSubmit(true)}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Publish Workshop
            </Button>
          </div>
        </div>

        {/* 1. Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Primary metadata, technical classification, and course description for participants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {organisations.length > 1 && (
              <Select
                label="Hosting Chapter / Organisation"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                options={organisations.map((org) => ({ value: org.id, label: org.name }))}
              />
            )}

            <Input
              label="Workshop Title"
              placeholder="e.g., Deep-Dive Kubernetes & GitOps Orchestration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
            />

            <Input
              label="Short Summary (Card Preview)"
              placeholder="Brief 1-2 sentence overview visible on event exploration cards"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              helperText="Maximum 250 characters."
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Detailed Syllabus & Instructions (Markdown supported)
              </label>
              <textarea
                rows={5}
                placeholder="Provide a comprehensive syllabus, prerequisites, key learning milestones, and tools covered..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#4285F4] focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20 font-sans"
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Workshop Category & Environment Track"
                value={domain}
                onChange={(e) => {
                  const newCategory = e.target.value as ApprovedWorkshopCategory;
                  setDomain(newCategory);
                  const newProfile = getProfileForCategory(newCategory);
                  setEnvironmentProfile(newProfile);
                  setSelectedToolIds(ENVIRONMENT_PROFILES[newProfile].defaultToolIds);
                }}
                options={[
                  { value: 'Cybersecurity', label: 'Cybersecurity (Kali Linux, Pentesting & CTF)' },
                  { value: 'Data Science', label: 'Data Science (Python, Jupyter, Pandas, MySQL)' },
                  { value: 'Linux', label: 'Linux (Ubuntu, Shell, Git, GCC, System Admin)' },
                ]}
              />

              <Select
                label="Difficulty Level"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                options={[
                  { value: 'BEGINNER', label: 'Beginner (No prior experience needed)' },
                  { value: 'INTERMEDIATE', label: 'Intermediate (Basic command-line familiarity)' },
                  { value: 'ADVANCED', label: 'Advanced (In-depth engineering & architecture)' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tags (Comma separated)"
                placeholder="Docker, Kubernetes, Linux, Go, Security"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />

              <Select
                label="Attach Lab Blueprint Template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                options={mockLabTemplates.map((tpl) => ({
                  value: tpl.id,
                  label: `${tpl.title} (${tpl.domain})`,
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Workshop Environment & Tool Manager */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4285F4]" />
                Workshop Environment & Tool Selection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customise preinstalled tools for your students. All tools are provisioned automatically in the browser with 0 student configuration.
              </p>
            </div>
          </div>

          <WorkshopToolManager
            category={domain}
            selectedToolIds={selectedToolIds}
            onChange={(tools, prof) => {
              setSelectedToolIds(tools);
              setEnvironmentProfile(prof);
            }}
          />
        </div>

        {/* 3. Schedule, Timezone & Venue */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule, Timezone & Delivery</CardTitle>
            <CardDescription>
              Configure workshop timing, duration, and whether participants attend online or in-person.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                type="date"
                label="Workshop Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                error={errors.startDate}
              />

              <Input
                type="time"
                label="Start Time (24h)"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />

              <Input
                type="number"
                label="Duration (Minutes)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                error={errors.duration}
              />
            </div>

            <Select
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={TIMEZONES}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div
                onClick={() => setVenueType('ONLINE')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  venueType === 'ONLINE'
                    ? 'border-[#4285F4] bg-blue-50/40 dark:bg-blue-950/20 text-[#1a73e8] dark:text-[#4285F4]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Video className="w-4 h-4" />
                  <span>Online / Virtual</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Google Meet / Zoom link</p>
              </div>

              <div
                onClick={() => setVenueType('OFFLINE')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  venueType === 'OFFLINE'
                    ? 'border-[#4285F4] bg-blue-50/40 dark:bg-blue-950/20 text-[#1a73e8] dark:text-[#4285F4]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <MapPin className="w-4 h-4" />
                  <span>In-Person / Physical</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Campus lab or auditorium</p>
              </div>

              <div
                onClick={() => setVenueType('HYBRID')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  venueType === 'HYBRID'
                    ? 'border-[#4285F4] bg-blue-50/40 dark:bg-blue-950/20 text-[#1a73e8] dark:text-[#4285F4]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Globe className="w-4 h-4" />
                  <span>Hybrid</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Physical hall + live stream</p>
              </div>
            </div>

            {venueType === 'ONLINE' && (
              <Input
                label="Virtual Meeting Link"
                placeholder="https://meet.google.com/xyz-gdg-work"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            )}

            {(venueType === 'OFFLINE' || venueType === 'HYBRID') && (
              <div className="space-y-3">
                <Input
                  label="Physical Venue / Campus Room"
                  placeholder="e.g. Computer Science Lab 4B, Turing Hall"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  error={errors.venueAddress}
                />
                {venueType === 'HYBRID' && (
                  <Input
                    label="Supplementary Online Stream Link"
                    placeholder="https://meet.google.com/xyz-gdg-work"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Instructor Details */}
        <Card>
          <CardHeader>
            <CardTitle>Instructor & Speaker Information</CardTitle>
            <CardDescription>Identify the lead facilitator leading the technical session.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Lead Instructor Name"
              placeholder="e.g., Alex Rivera"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
            />
            <Input
              label="Instructor Title / Bio"
              placeholder="e.g., Google Cloud Certified DevOps Architect"
              value={instructorBio}
              onChange={(e) => setInstructorBio(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* 4. Registration Settings & Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Settings & Sandbox Capacity</CardTitle>
            <CardDescription>
              Set maximum concurrent participants, approval gates, and registration deadlines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="datetime-local"
                label="Registration Deadline"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                error={errors.registrationDeadline}
                helperText="Must be prior to the workshop start time"
              />

              <Input
                type="number"
                label="Participant Limit (Container Allocations)"
                value={participantLimit}
                onChange={(e) => setParticipantLimit(e.target.value)}
                error={errors.participantLimit}
                helperText="Exceeding this limit automatically waitlists students"
              />
            </div>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Requires Approval */}
              <label
                onClick={() => setRequiresApproval(!requiresApproval)}
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 select-none transition-colors ${
                  requiresApproval
                    ? 'border-[#4285F4] bg-blue-50/30 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-[#4285F4] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200">
                    Require Approval
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Organiser manually approves each student registration
                  </p>
                </div>
              </label>

              {/* Is Public */}
              <label
                onClick={() => setIsPublic(!isPublic)}
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 select-none transition-colors ${
                  isPublic
                    ? 'border-[#4285F4] bg-blue-50/30 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-[#4285F4] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200">
                    Public Discovery
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Visible on the public student explore directory
                  </p>
                </div>
              </label>

              {/* Code Join Enabled */}
              <label
                onClick={() => setCodeJoinEnabled(!codeJoinEnabled)}
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 select-none transition-colors ${
                  codeJoinEnabled
                    ? 'border-[#4285F4] bg-blue-50/30 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={codeJoinEnabled}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-[#4285F4] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200">
                    Allow Code Joining
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Students can join directly using the unique event code
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 5. Joining Code & Banner */}
        <Card>
          <CardHeader>
            <CardTitle>Event Joining Code & Media</CardTitle>
            <CardDescription>
              Unique cryptographic registration code generated for your workshop.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
              <div className="flex-1 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Registration Joining Code
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    value={joiningCode}
                    onChange={(e) => setJoiningCode(e.target.value.toUpperCase())}
                    className="font-mono text-base font-bold text-[#1a73e8] dark:text-[#4285F4] max-w-xs uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setJoiningCode(generateCode())}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    title="Generate another code"
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
              <div className="text-xs text-slate-500 sm:max-w-xs">
                Students can paste this code at{' '}
                <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                  /student/explore
                </code>{' '}
                for instant verification and enrollment.
              </div>
            </div>

            <Input
              label="Banner Media URL"
              placeholder="https://images.unsplash.com/..."
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              helperText="High-resolution workshop banner image"
            />

            {bannerUrl && (
              <div className="h-40 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 relative">
                <img src={bannerUrl} alt="Banner Preview" className="h-full w-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                  Banner Card Preview
                </span>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/workshops')}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleSubmit(false)}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                size="sm"
                isLoading={isSubmitting}
                onClick={() => handleSubmit(true)}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Publish Workshop
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
