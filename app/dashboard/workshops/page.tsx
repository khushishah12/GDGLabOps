'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/lib/toast-context';
import { mockWorkshops } from '@/lib/mock-data';
import { Workshop, TechnicalDomain, WorkshopStatus } from '@/types';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Copy,
  ExternalLink,
} from 'lucide-react';

export default function WorkshopListingPage() {
  const { success, info } = useToast();
  const [workshops, setWorkshops] = useState<Workshop[]>(mockWorkshops);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredWorkshops = workshops.filter((ws) => {
    const matchesSearch =
      ws.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.eventCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'ALL' || ws.domain === selectedDomain;
    const matchesStatus = selectedStatus === 'ALL' || ws.status === selectedStatus;
    return matchesSearch && matchesDomain && matchesStatus;
  });

  const copyEventCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success('Event Code Copied', `${code} copied to clipboard.`);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Workshops
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create, schedule, and orchestrate practical technical sessions for your GDG on Campus chapter.
            </p>
          </div>
          <Link href="/dashboard/workshops/create">
            <Button size="sm" className="text-xs" leftIcon={<Plus className="w-4 h-4" />}>
              Create Workshop
            </Button>
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526]">
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search workshops or event codes..."
                leftIcon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="w-full sm:w-44">
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

            <div className="w-full sm:w-36">
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active Now' },
                  { value: 'PUBLISHED', label: 'Published' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'DRAFT', label: 'Draft' },
                ]}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900/60 self-end md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-[#4285F4] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-[#4285F4] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content View: Grid or List */}
        {filteredWorkshops.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="No workshops found"
            description="No workshops match the selected domain or search query. Try adjusting your filters or create a new workshop."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedDomain('ALL');
              setSelectedStatus('ALL');
            }}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkshops.map((ws) => (
              <Card key={ws.id} className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md">
                <div>
                  {/* Card Banner Image or Fallback */}
                  {ws.bannerUrl && (
                    <div className="h-36 w-full overflow-hidden rounded-t-xl relative border-b border-slate-200/60 dark:border-slate-800">
                      <img
                        src={ws.bannerUrl}
                        alt={ws.title}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <Badge
                          variant={ws.status === 'ACTIVE' ? 'success' : ws.status === 'PUBLISHED' ? 'default' : 'secondary'}
                          size="sm"
                        >
                          {ws.status}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="domain" size="sm">{ws.domain}</Badge>
                      <button
                        onClick={() => copyEventCode(ws.eventCode)}
                        className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-500 hover:text-[#4285F4] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded transition-colors"
                        title="Click to copy event code"
                      >
                        {ws.eventCode}
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <CardTitle className="text-sm font-bold pt-2 leading-snug">
                      {ws.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 pt-1">
                      {ws.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {ws.registeredCount} / {ws.maxAttendees} attendees
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {ws.durationMinutes} mins
                      </span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#4285F4] h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (ws.registeredCount / ws.maxAttendees) * 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="p-4 pt-3 justify-between">
                  <span className="text-[10px] text-slate-400">
                    Template: {ws.template?.title.slice(0, 24)}...
                  </span>
                  <div className="flex items-center gap-2">
                    {ws.status === 'ACTIVE' && (
                      <Link href="/dashboard/monitor">
                        <Button size="sm" variant="secondary" className="text-xs h-8 text-emerald-600 dark:text-emerald-400">
                          Monitor
                        </Button>
                      </Link>
                    )}
                    <Link href={`/dashboard/workshops/${ws.id}`}>
                      <Button size="sm" className="text-xs h-8">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workshop Title</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Event Code</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkshops.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                    <div>{ws.title}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Duration: {ws.durationMinutes}m • {ws.template?.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="domain" size="sm">{ws.domain}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold">{ws.eventCode}</span>
                  </TableCell>
                  <TableCell>
                    {ws.registeredCount} / {ws.maxAttendees}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={ws.status === 'ACTIVE' ? 'success' : ws.status === 'PUBLISHED' ? 'default' : 'secondary'}
                      size="sm"
                    >
                      {ws.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/workshops/${ws.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-7">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  );
}
