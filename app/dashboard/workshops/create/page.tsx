'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/toast-context';
import { mockLabTemplates } from '@/lib/mock-data';
import { ArrowLeft, Save, Sparkles, UploadCloud, Info } from 'lucide-react';

export default function CreateWorkshopPage() {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('DevOps');
  const [templateId, setTemplateId] = useState(mockLabTemplates[0].id);
  const [date, setDate] = useState('2026-11-20');
  const [startTime, setStartTime] = useState('14:00');
  const [duration, setDuration] = useState('120');
  const [maxAttendees, setMaxAttendees] = useState('50');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-11-20T12:00');
  const [prerequisites, setPrerequisites] = useState('Command line basics, Chrome/Firefox');
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop&q=80');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Workshop title is required';
    if (!description.trim()) errs.description = 'Workshop description is required';
    if (parseInt(duration) <= 0 || isNaN(parseInt(duration))) errs.duration = 'Duration must be positive';
    if (parseInt(maxAttendees) <= 0 || isNaN(parseInt(maxAttendees))) errs.maxAttendees = 'Capacity must be at least 1';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (publishImmediately: boolean) => {
    if (!validate()) {
      error('Validation Failed', 'Please resolve the highlighted form fields.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const generatedCode = `GDG-${title.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      success(
        publishImmediately ? 'Workshop Published!' : 'Draft Saved!',
        `Created "${title}" with event code ${generatedCode}`
      );
      router.push('/dashboard/workshops');
    }, 800);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Page Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/workshops">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Create Workshop
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure details, assign lab environments, and publish your event code.
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
              Save as Draft
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

        {/* Main Form Body */}
        <div className="space-y-6">
          {/* General Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Workshop Details</CardTitle>
              <CardDescription>
                Primary metadata visible to students on the public registration portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Workshop Title"
                placeholder="e.g., Deep-Dive Kubernetes & GitOps Orchestration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description & Syllabus
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide an overview of what students will build and learn during this hands-on workshop..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#4285F4] focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20"
                />
                {errors.description && (
                  <p className="text-xs text-red-500">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Technical Domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  options={[
                    { value: 'DevOps', label: 'DevOps & Containers' },
                    { value: 'Cloud Computing', label: 'Cloud Computing (GCP/K8s)' },
                    { value: 'Cybersecurity', label: 'Cybersecurity & CTF' },
                    { value: 'Web Development', label: 'Web Development' },
                    { value: 'Artificial Intelligence', label: 'Artificial Intelligence' },
                    { value: 'Machine Learning', label: 'Machine Learning' },
                    { value: 'Open Source', label: 'Open Source' },
                  ]}
                />

                <Select
                  label="Assign Lab Template"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  options={mockLabTemplates.map((tpl) => ({
                    value: tpl.id,
                    label: `${tpl.title} (${tpl.dockerImage.slice(0, 24)}...)`,
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Capacity Card */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Capacity Limits</CardTitle>
              <CardDescription>
                Define start timing, expected duration, and concurrent container allocations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  type="date"
                  label="Workshop Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />

                <Input
                  type="time"
                  label="Start Time"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Participant Limit (Capacity)"
                  helperText="Maximum concurrent sandboxes allocated on cloud node"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  error={errors.maxAttendees}
                />

                <Input
                  type="datetime-local"
                  label="Registration Deadline"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Prerequisites & Media Banner Card */}
          <Card>
            <CardHeader>
              <CardTitle>Prerequisites & Visuals</CardTitle>
              <CardDescription>
                Help students prepare and display an engaging workshop banner card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Prerequisites (Comma separated)"
                placeholder="e.g. Basic terminal usage, Understanding of JSON"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
              />

              <Input
                label="Banner Image URL"
                placeholder="https://images.unsplash.com/..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                helperText="Paste an image URL or use our default developer banner."
              />

              {bannerUrl && (
                <div className="h-40 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 relative">
                  <img src={bannerUrl} alt="Preview" className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                    Banner Preview
                  </span>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/workshops')}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={isSubmitting}
                onClick={() => handleSubmit(true)}
              >
                Publish Workshop
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
