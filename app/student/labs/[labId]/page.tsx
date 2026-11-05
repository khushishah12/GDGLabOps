'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import {
  ArrowLeft,
  BookOpen,
  Trophy,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
} from 'lucide-react';

export default function StandaloneLabViewPage() {
  const params = useParams();
  const labId = (params?.labId as string) || '';
  const { error } = useToast();

  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLab() {
      if (!labId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/templates/${labId}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setTemplate(json.data);
        } else {
          error('Error', json.error?.message || 'Lab template not found');
        }
      } catch {
        error('Error', 'Network error while loading lab.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchLab();
  }, [labId]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8]" />
          <p className="text-xs text-slate-400">Loading lab curriculum...</p>
        </div>
      </AppShell>
    );
  }

  if (!template) {
    return (
      <AppShell>
        <div className="py-20 text-center space-y-3 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold">Lab Not Found</h2>
          <Link href="/student/workshops">
            <Button size="sm" variant="outline" className="text-xs">
              Back to My Workshops
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <div className="flex items-center gap-3">
          <Link href="/student/workshops">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="domain" size="sm">
                {template.domain}
              </Badge>
              <Badge variant="outline" size="sm">
                {template.difficulty}
              </Badge>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {template.estimatedDuration}m
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {template.name}
            </h1>
          </div>
        </div>

        <Card className="p-6 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overview</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
              {template.description}
            </p>
          </div>

          {Array.isArray(template.learningObjectives) && template.learningObjectives.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Learning Objectives</h3>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {template.learningObjectives.map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Challenges ({template.challenges?.length || 0})
            </h3>
            <div className="space-y-2">
              {(template.challenges || []).map((ch: any, i: number) => (
                <div
                  key={ch.id}
                  className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-[10px] flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{ch.title}</span>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {ch.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Join a Workshop to Submit Challenges
              </span>
              <span className="text-slate-500">
                To earn points and have your submissions graded, participate in a workshop that incorporates this lab.
              </span>
            </div>
            <Link href="/student/workshops">
              <Button size="sm" className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] shrink-0">
                Browse Workshops
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
