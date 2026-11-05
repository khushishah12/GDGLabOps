'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toast-context';
import { UserCheck, Plus, Mail } from 'lucide-react';

export default function TeamMembersPage() {
  const { success } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ORGANISER');

  const members = [
    { name: 'Alex Rivera', email: 'alex.rivera@gdgcampus.dev', role: 'ORGANISER', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', status: 'ACTIVE' },
    { name: 'Devon Vance', email: 'admin@gdglabops.internal', role: 'SUPER_ADMIN', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', status: 'ACTIVE' },
    { name: 'Sarah Koenig', email: 'sarah.k@gdgcampus.dev', role: 'ORGANISER', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', status: 'ACTIVE' },
  ];

  const handleInvite = () => {
    success('Invitation Dispatched', `Invited ${email} as ${role}.`);
    setIsInviteOpen(false);
    setEmail('');
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Team Members & Organisers
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage GDG on Campus chapter leads, co-organisers, and platform access roles.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs"
          >
            Invite Organiser
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Assigned Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.email}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <img src={m.avatar} alt={m.name} className="h-7 w-7 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.role === 'SUPER_ADMIN' ? 'danger' : 'default'} size="sm">
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" size="sm">{m.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]">
                      Edit Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogHeader>
            <DialogTitle>Invite Chapter Co-Organiser</DialogTitle>
            <DialogDescription>Send an invitation link with workshop management permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              label="Email Address"
              placeholder="lead@gdgcampus.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'ORGANISER', label: 'Organiser (Create Workshops & Labs)' },
                { value: 'SUPER_ADMIN', label: 'Super Admin (Global Controls)' },
              ]}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInvite}>Send Invitation</Button>
          </DialogFooter>
        </Dialog>
      </div>
    </AppShell>
  );
}
