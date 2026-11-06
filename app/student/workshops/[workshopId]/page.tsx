'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, ArrowLeft, Play, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function WorkshopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const workshopId = (params?.workshopId as string) || '';

  const [workshop, setWorkshop] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorkshop() {
      if (!workshopId) return;
      try {
        const res = await fetch(`/api/workshops/${workshopId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setWorkshop(json.data);
            const firstLab = json.data.workshopLabs?.[0];
            const labId = firstLab?.labTemplateId || firstLab?.labTemplate?.id;
            if (labId) {
              // Redirect directly to the curriculum workspace
              router.replace(`/student/workshops/${workshopId}/labs/${labId}`);
              return;
            }
          }
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkshop();
  }, [workshopId, router]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Opening workshop curriculum...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <Link href="/student/workshops" className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to My Workshops
        </Link>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="domain">{workshop?.domain || 'Technical Lab'}</Badge>
            <Badge variant="success">Enrolled</Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {workshop?.title || 'Workshop Workspace'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {workshop?.description || 'Access hands-on exercises and cloud sandboxes for this workshop.'}
          </p>

          <div className="pt-4 flex items-center gap-3">
            <Link
              href={`/student/lab/demo-session?workshopId=${workshopId}&domain=${encodeURIComponent(workshop?.domain || 'Linux')}`}
            >
              <Button size="sm" leftIcon={<Play className="w-4 h-4" />}>
                Launch Terminal Sandbox
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
