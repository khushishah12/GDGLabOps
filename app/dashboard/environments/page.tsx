'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import { Server, Cpu, HardDrive, CheckCircle2, RefreshCw } from 'lucide-react';

export default function LabEnvironmentsPage() {
  const { success } = useToast();

  const nodes = [
    {
      id: 'node-us-east-1',
      name: 'Primary Docker Execution Worker #01',
      host: 'worker-01.labops.internal (Ubuntu 24.04 LTS)',
      containers: '48 / 100 Active',
      cpuLoad: '28%',
      ramUsed: '18.4GB / 64GB',
      diskUsed: '142GB / 500GB',
      dockerVer: 'Docker Engine 26.1.4',
      status: 'HEALTHY',
    },
    {
      id: 'node-us-east-2',
      name: 'Secondary Docker Execution Worker #02',
      host: 'worker-02.labops.internal (Ubuntu 24.04 LTS)',
      containers: '0 / 100 Standby',
      cpuLoad: '4%',
      ramUsed: '4.2GB / 64GB',
      diskUsed: '88GB / 500GB',
      dockerVer: 'Docker Engine 26.1.4',
      status: 'STANDBY',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Lab Execution Environments
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Dedicated cloud worker fleet running Docker engines, cgroups v2, and network isolation.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => success('Fleet Pinged', 'All Execution nodes reported healthy heartbeat.')}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Health Check Fleet
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {nodes.map((node) => (
            <Card key={node.id} className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Server className="w-5 h-5 text-[#4285F4]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{node.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400">{node.host}</p>
                  </div>
                </div>
                <Badge variant={node.status === 'HEALTHY' ? 'success' : 'secondary'} size="sm">
                  {node.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Active Sandboxes</span>
                  <span className="font-bold text-sm text-[#4285F4]">{node.containers}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">CPU Pressure</span>
                  <span className="font-bold text-sm text-emerald-500">{node.cpuLoad}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Memory Utilized</span>
                  <span className="font-bold text-sm text-amber-500">{node.ramUsed}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Disk Overhead</span>
                  <span className="font-bold text-sm text-slate-300">{node.diskUsed}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
