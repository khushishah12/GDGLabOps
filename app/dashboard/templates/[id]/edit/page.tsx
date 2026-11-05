'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { TemplateBuilder } from '@/components/templates/template-builder';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditLabTemplatePage() {
  const params = useParams();
  const templateId = (params?.id as string) || '';

  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplate() {
      if (!templateId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/templates/${templateId}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setTemplate(json.data);
        } else {
          setError(json.error?.message || 'Failed to load template.');
        }
      } catch {
        setError('Network error while loading template.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTemplate();
  }, [templateId]);

  return (
    <AppShell>
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8]" />
          <p className="text-xs text-slate-400">Loading lab template...</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Unable to Load Template</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <Link href="/dashboard/templates">
            <Button size="sm" variant="outline" className="text-xs">
              Back to Template Library
            </Button>
          </Link>
        </div>
      ) : (
        <TemplateBuilder initialData={template} isEditMode={true} />
      )}
    </AppShell>
  );
}
