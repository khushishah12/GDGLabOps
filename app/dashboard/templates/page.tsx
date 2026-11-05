'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/lib/toast-context';
import { mockLabTemplates } from '@/lib/mock-data';
import { LabTemplate } from '@/types';
import {
  Layers,
  Plus,
  Search,
  Terminal,
  Clock,
  Cpu,
  Trophy,
  ArrowRight,
  Code2,
} from 'lucide-react';

export default function LabTemplateListingPage() {
  const { info } = useToast();
  const [templates, setTemplates] = useState<LabTemplate[]>(mockLabTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.dockerImage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'ALL' || tpl.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Lab Templates
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Reusable Docker sandbox configurations and challenge curricula for hands-on workshops.
            </p>
          </div>
          <Link href="/dashboard/templates/create">
            <Button size="sm" className="text-xs" leftIcon={<Plus className="w-4 h-4" />}>
              Create Lab Template
            </Button>
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526]">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search templates, Docker images, or keywords..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Domains' },
                { value: 'DevOps', label: 'DevOps' },
                { value: 'Cloud Computing', label: 'Cloud Computing' },
                { value: 'Cybersecurity', label: 'Cybersecurity' },
                { value: 'Web Development', label: 'Web Development' },
                { value: 'Artificial Intelligence', label: 'Artificial Intelligence' },
              ]}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Template Grid */}
        {filteredTemplates.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-6 h-6" />}
            title="No templates found"
            description="No lab templates match your search criteria. Try modifying your filter or create a new template."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedDomain('ALL');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => (
              <Card key={tpl.id} className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md">
                <div>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="domain" size="sm">{tpl.domain}</Badge>
                      <Badge variant={tpl.status === 'PUBLISHED' ? 'success' : 'secondary'} size="sm">
                        {tpl.status}
                      </Badge>
                    </div>

                    <CardTitle className="text-sm font-bold pt-2 leading-snug">
                      {tpl.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 pt-1">
                      {tpl.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">
                      <span className="text-slate-400 select-none">IMAGE: </span>
                      {tpl.dockerImage}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tpl.estimatedDuration}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tpl.challengesCount} tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tpl.memoryLimitMb}MB</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="p-4 pt-3 justify-between">
                  <Badge variant="outline" size="sm">
                    {tpl.difficulty}
                  </Badge>
                  <Link href={`/student/lab/demo-session`}>
                    <Button size="sm" variant="outline" className="text-xs h-8" leftIcon={<Terminal className="w-3.5 h-3.5" />}>
                      Test Sandbox
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
