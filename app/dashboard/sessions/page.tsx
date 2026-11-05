'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import { Terminal, RefreshCw, Square, Play } from 'lucide-react';

export default function ActiveSessionsPage() {
  const { info, success } = useToast();

  const sessions = [
    { id: 'sess-01', user: 'Elena Rostova', containerId: 'c-89a24', image: 'gdglabops/sandbox-linux-base:v1.2', cpu: '14%', ram: '142MB / 512MB', uptime: '42m', status: 'RUNNING' },
    { id: 'sess-02', user: 'Marcus Chen', containerId: 'c-77b19', image: 'gdglabops/sandbox-linux-base:v1.2', cpu: '22%', ram: '210MB / 512MB', uptime: '38m', status: 'RUNNING' },
    { id: 'sess-03', user: 'Devin Thorne', containerId: 'c-33c90', image: 'gdglabops/sandbox-linux-base:v1.2', cpu: '0.1%', ram: '68MB / 512MB', uptime: '14m', status: 'IDLE' },
    { id: 'sess-04', user: 'Priya Sharma', containerId: 'c-12d88', image: 'gdglabops/sandbox-linux-base:v1.2', cpu: '8%', ram: '156MB / 512MB', uptime: '45m', status: 'RUNNING' },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Active Lab Sessions
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live container allocations running on Execution Plane cloud nodes.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => success('Refreshed', 'Active container daemon list updated.')}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Refresh Allocations
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Docker Image</TableHead>
                <TableHead>CPU Usage</TableHead>
                <TableHead>RAM Allocation</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="font-semibold text-xs">{s.user}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500 truncate max-w-[140px]">{s.image}</TableCell>
                  <TableCell className="font-mono text-xs">{s.cpu}</TableCell>
                  <TableCell className="font-mono text-xs">{s.ram}</TableCell>
                  <TableCell className="text-xs">{s.uptime}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'RUNNING' ? 'success' : 'secondary'} size="sm">
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] text-rose-500 hover:text-rose-600"
                      onClick={() => info('Container Stopped', `Terminated ${s.containerId}`)}
                    >
                      Stop
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppShell>
  );
}
