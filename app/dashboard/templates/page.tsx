'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/lib/toast-context';
import { LAB_DOMAINS } from '@/lib/validations';
import {
  Layers,
  Plus,
  Search,
  Clock,
  Trophy,
  Copy,
  Eye,
  BarChart3,
  Edit,
  Archive,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

export default function LabTemplateListingPage() {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDomain !== 'ALL') params.set('domain', selectedDomain);
      if (selectedDifficulty !== 'ALL') params.set('difficulty', selectedDifficulty);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/templates?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTemplates(json.data);
        }
      } else {
        error('Error', 'Failed to retrieve lab templates.');
      }
    } catch {
      error('Error', 'Network error while fetching templates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedDomain, selectedDifficulty, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates();
  };

  const handleDuplicate = async (id: string, name: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Template Duplicated', `Created a draft copy of "${name}".`);
        fetchTemplates();
      } else {
        error('Duplication Failed', json.error?.message || 'Could not duplicate template.');
      }
    } catch {
      error('Error', 'Failed to duplicate template.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePublish = async (id: string, name: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/templates/${id}/publish`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Template Published', `"${name}" is now published and available for workshops.`);
        fetchTemplates();
      } else {
        error('Publish Failed', json.error?.message || 'Could not publish template.');
      }
    } catch {
      error('Error', 'Failed to publish template.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/templates/${id}/archive`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        info('Template Archived', `"${name}" was archived.`);
        fetchTemplates();
      } else {
        error('Archive Failed', json.error?.message || 'Could not archive template.');
      }
    } catch {
      error('Error', 'Failed to archive template.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Lab Template Library
              </h1>
              <Badge variant="outline" size="sm">
                v2.0
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Curate, version, and reuse structured technical curricula and challenge milestones across workshops.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTemplates}
              disabled={isLoading}
              className="text-xs"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            <Link href="/dashboard/templates/create">
              <Button size="sm" className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]" leftIcon={<Plus className="w-4 h-4" />}>
                Create Lab Template
              </Button>
            </Link>
          </div>
        </div>

        {/* Category Pills (11 Domains) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedDomain('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedDomain === 'ALL'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All Categories
          </button>
          {LAB_DOMAINS.map((dom) => (
            <button
              key={dom}
              onClick={() => setSelectedDomain(dom)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedDomain === dom
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {dom}
            </button>
          ))}
        </div>

        {/* Filter & Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526]">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search templates by title, description, or tags..."
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-36">
              <Select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Difficulties' },
                  { value: 'BEGINNER', label: 'Beginner' },
                  { value: 'INTERMEDIATE', label: 'Intermediate' },
                  { value: 'ADVANCED', label: 'Advanced' },
                ]}
                className="h-9 text-xs"
              />
            </div>
            <div className="w-full sm:w-36">
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'PUBLISHED', label: 'Published' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'ARCHIVED', label: 'Archived' },
                ]}
                className="h-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs shrink-0">
              Filter
            </Button>
          </div>
        </form>

        {/* Template Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8]" />
            <p className="text-xs text-slate-400">Loading lab templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-6 h-6" />}
            title="No templates found"
            description="No lab templates match your search filters. Create your first template or modify the domain filter."
            actionLabel="Create Lab Template"
            onAction={() => router.push('/dashboard/templates/create')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl) => {
              const isActioning = actionLoadingId === tpl.id;
              const challengesCount = tpl._count?.challenges ?? tpl.challenges?.length ?? 0;
              const workshopsCount = tpl._count?.workshopLabs ?? 0;

              return (
                <Card
                  key={tpl.id}
                  className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md group"
                >
                  <div>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="domain" size="sm">
                          {tpl.domain}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              tpl.status === 'PUBLISHED'
                                ? 'success'
                                : tpl.status === 'ARCHIVED'
                                ? 'secondary'
                                : 'outline'
                            }
                            size="sm"
                          >
                            {tpl.status}
                          </Badge>
                          <span className="text-[10px] font-mono text-slate-400">v{tpl.version || 1}</span>
                        </div>
                      </div>

                      <CardTitle className="text-sm font-bold pt-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <Link href={`/dashboard/templates/${tpl.id}/edit`}>{tpl.name}</Link>
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 pt-1 text-slate-500 dark:text-slate-400">
                        {tpl.shortDescription || tpl.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-3">
                      {/* Tags */}
                      {Array.isArray(tpl.tags) && tpl.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tpl.tags.slice(0, 3).map((tag: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono"
                            >
                              #{tag}
                            </span>
                          ))}
                          {tpl.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{tpl.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Telemetry info */}
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{tpl.estimatedDuration}m</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{challengesCount} challenges</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{workshopsCount} workshops</span>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <CardFooter className="p-4 pt-2.5 flex-col gap-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="flex items-center justify-between w-full">
                      <Badge variant="outline" size="sm">
                        {tpl.difficulty}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/templates/${tpl.id}/preview`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-slate-600 dark:text-slate-300"
                            title="Preview Student Experience"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Preview
                          </Button>
                        </Link>
                        <Link href={`/dashboard/templates/${tpl.id}/analytics`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-slate-600 dark:text-slate-300"
                            title="View Analytics"
                            leftIcon={<BarChart3 className="w-3.5 h-3.5" />}
                          >
                            Stats
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          onClick={() => handleDuplicate(tpl.id, tpl.name)}
                          disabled={isActioning}
                          title="Duplicate template"
                          leftIcon={<Copy className="w-3.5 h-3.5" />}
                        >
                          Clone
                        </Button>
                        {tpl.status === 'DRAFT' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            onClick={() => handlePublish(tpl.id, tpl.name)}
                            disabled={isActioning}
                            title="Publish template"
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Publish
                          </Button>
                        ) : tpl.status === 'PUBLISHED' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                            onClick={() => handleArchive(tpl.id, tpl.name)}
                            disabled={isActioning}
                            title="Archive template"
                            leftIcon={<Archive className="w-3.5 h-3.5" />}
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>

                      <Link href={`/dashboard/templates/${tpl.id}/edit`}>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2.5 font-medium"
                          leftIcon={<Edit className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
