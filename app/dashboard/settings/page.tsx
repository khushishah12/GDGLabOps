'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toast-context';
import { Settings, Save, Shield, Terminal, Globe } from 'lucide-react';

export default function WorkspaceSettingsPage() {
  const { success } = useToast();
  const [chapterName, setChapterName] = useState('GDG on Campus - Silicon Valley University');
  const [defaultTimeout, setDefaultTimeout] = useState('20');
  const [maxConcurrency, setMaxConcurrency] = useState('60');

  const handleSave = () => {
    success('Settings Updated', 'Workspace configuration saved successfully.');
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Workspace Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global configuration for workshop quotas, timeout policies, and execution boundaries.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chapter Identity</CardTitle>
            <CardDescription>Visible on workshop invites and certificates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Chapter Name"
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
            />
            <Input
              label="Default Domain Filter"
              placeholder="@university.edu"
              helperText="Optional: Restrict event code joins to verified university student emails."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution Limits & Janitor Policies</CardTitle>
            <CardDescription>Safeguard host resources and prevent runaway container costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Idle Container Inactivity Timeout (Minutes)"
                value={defaultTimeout}
                onChange={(e) => setDefaultTimeout(e.target.value)}
                helperText="Terminates idle sandboxes without active WebSocket connections."
              />
              <Input
                type="number"
                label="Max Concurrent Containers per Workshop"
                value={maxConcurrency}
                onChange={(e) => setMaxConcurrency(e.target.value)}
                helperText="Enforces hard ceiling on Docker engine allocations."
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button size="sm" onClick={handleSave} leftIcon={<Save className="w-3.5 h-3.5" />}>
              Save Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
