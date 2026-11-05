'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/toast-context';
import { mockWorkshops, mockLabTemplates } from '@/lib/mock-data';
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
} from 'lucide-react';

export default function WorkshopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, info } = useToast();

  const workshopId = (params?.id as string) || 'ws-1';
  const workshop = mockWorkshops.find((w) => w.id === workshopId) || mockWorkshops[0];
  const template = workshop.template || mockLabTemplates[0];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(workshop.title);
  const [editCapacity, setEditCapacity] = useState(workshop.maxAttendees.toString());

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workshop.eventCode);
    success('Event Code Copied!', `${workshop.eventCode} copied to clipboard.`);
  };

  const handleSaveEdit = () => {
    workshop.title = editTitle;
    workshop.maxAttendees = parseInt(editCapacity) || workshop.maxAttendees;
    setIsEditOpen(false);
    success('Workshop Updated', 'Changes saved successfully.');
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
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
                <Badge variant="domain" size="sm">{workshop.domain}</Badge>
                <Badge
                  variant={workshop.status === 'ACTIVE' ? 'success' : 'default'}
                  size="sm"
                >
                  {workshop.status}
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                {workshop.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              leftIcon={<Settings className="w-3.5 h-3.5" />}
            >
              Edit Details
            </Button>
            <Link href="/dashboard/monitor">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" leftIcon={<Play className="w-3.5 h-3.5" />}>
                Launch Live Monitor
              </Button>
            </Link>
          </div>
        </div>

        {/* Highlight Card: Registration Code & Quick Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-8 p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Registration Event Code
                </span>
                <span className="text-[11px] text-slate-400">Share with students</span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-[#1a73e8] dark:text-[#4285F4]">
                  {workshop.eventCode}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyCode}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  className="ml-auto text-xs"
                >
                  Copy Code
                </Button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                {workshop.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Registered</span>
                <span className="font-semibold text-sm">
                  {workshop.registeredCount} / {workshop.maxAttendees}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                <span className="font-semibold text-sm">{workshop.durationMinutes} minutes</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Organiser</span>
                <span className="font-semibold text-sm">{workshop.organiserName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Challenges</span>
                <span className="font-semibold text-sm">{workshop.challenges.length || 4} Tasks</span>
              </div>
            </div>
          </Card>

          {/* Lab Template & Environment Spec Card */}
          <Card className="md:col-span-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Attached Environment
              </span>
              <Badge variant="outline" size="sm">Docker Sandbox</Badge>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {template.title}
              </h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                {template.description}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Image:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                  {template.dockerImage}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Resources:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {template.cpuLimitCores} CPU • {template.memoryLimitMb}MB RAM
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Port:</span>
                <span className="text-slate-700 dark:text-slate-300">{template.defaultPort} (WebTTY)</span>
              </div>
            </div>

            <Link href={`/student/lab/demo-session`}>
              <Button size="sm" variant="outline" className="w-full text-xs" leftIcon={<Terminal className="w-3.5 h-3.5" />}>
                Test Run Environment
              </Button>
            </Link>
          </Card>
        </div>

        {/* Interactive Challenges Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Milestone Challenges & Tasks</CardTitle>
                <CardDescription>
                  Automated grading challenges students will solve during this workshop.
                </CardDescription>
              </div>
              <Badge variant="success" size="sm">
                Total Points: 700
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {workshop.challenges.map((ch, idx) => (
                <div key={ch.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {ch.title}
                      </h4>
                      <Badge variant="outline" size="sm">
                        {ch.evaluationType}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-7">
                      {ch.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-7 sm:pl-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      +{ch.points} pts
                    </span>
                    <Badge variant="secondary" size="sm">
                      {ch.difficulty}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogHeader>
            <DialogTitle>Edit Workshop</DialogTitle>
            <DialogDescription>Modify workshop capacity and title.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              label="Workshop Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Input
              type="number"
              label="Participant Limit"
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </AppShell>
  );
}
