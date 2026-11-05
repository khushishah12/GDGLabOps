'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/lib/user-context';
import { useToast } from '@/lib/toast-context';
import { User, Save } from 'lucide-react';

export default function StudentSettingsPage() {
  const { currentUser } = useUser();
  const { success } = useToast();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [institution, setInstitution] = useState(currentUser.institution || 'School of Computer Science');

  const handleSave = () => {
    success('Profile Saved', 'Student profile details updated.');
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Student Profile & Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal profile and display information on workshop leaderboards.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Visible on live workshop scoreboards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="h-14 w-14 rounded-full object-cover border border-slate-300 dark:border-slate-700"
              />
              <div className="space-y-1">
                <Button variant="outline" size="sm" className="text-xs">
                  Change Avatar
                </Button>
                <p className="text-[10px] text-slate-400">JPG, PNG or GIF up to 2MB</p>
              </div>
            </div>

            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="University Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="University / Department"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button size="sm" onClick={handleSave} leftIcon={<Save className="w-3.5 h-3.5" />}>
              Save Profile
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
