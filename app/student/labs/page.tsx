'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { mockWorkshops } from '@/lib/mock-data';
import {
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function StudentMyLabsPage() {
  const [activeTab, setActiveTab] = useState('active');

  const activeLabs = mockWorkshops.filter((w) => w.status === 'ACTIVE');
  const completedLabs = mockWorkshops.filter((w) => w.status === 'COMPLETED');

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            My Labs & Sandboxes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access your provisioned container environments, completed milestones, and sandbox history.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active" badge={activeLabs.length}>
              Active Sandboxes
            </TabsTrigger>
            <TabsTrigger value="completed" badge={completedLabs.length}>
              Completed Labs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 pt-2">
            {activeLabs.map((lab) => (
              <Card key={lab.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[#4285F4]">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm">
                      ● Container Running
                    </Badge>
                    <Badge variant="domain" size="sm">{lab.domain}</Badge>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: session-linux-01a
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {lab.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                    {lab.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Session active: 42m elapsed
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> 512MB RAM • 0.5 CPU
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Link href={`/student/lab/demo-session?workshopId=${lab.id}&domain=${encodeURIComponent(lab.domain || 'Linux')}`}>
                    <Button size="sm" className="bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4] text-xs" leftIcon={<Terminal className="w-4 h-4" />}>
                      Open Web Terminal
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 pt-2">
            {completedLabs.map((lab) => (
              <Card key={lab.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">Completed</Badge>
                    <Badge variant="domain" size="sm">{lab.domain}</Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {lab.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    All milestones achieved • 650 points earned
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  Review Submission Logs
                </Button>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
