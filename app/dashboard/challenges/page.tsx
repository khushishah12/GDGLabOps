'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockChallenges } from '@/lib/mock-data';
import { Trophy, Plus, ArrowRight } from 'lucide-react';

export default function ChallengesLibraryPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Challenge Library
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Reusable technical milestones, automated evaluation scripts, and hint catalogs.
            </p>
          </div>
          <Link href="/dashboard/templates/create">
            <Button size="sm" className="text-xs" leftIcon={<Plus className="w-4 h-4" />}>
              Create New Challenge
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockChallenges.map((ch) => (
            <Card key={ch.id} className="p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" size="sm">{ch.evaluationType}</Badge>
                  <span className="text-xs font-bold text-emerald-500">+{ch.points} pts</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{ch.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ch.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>{ch.hints.length} progressive hints</span>
                <Badge variant="secondary" size="sm">{ch.difficulty}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
