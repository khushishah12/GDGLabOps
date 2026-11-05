'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/toast-context';
import { EvaluationType, DifficultyLevel } from '@/types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Terminal,
  HelpCircle,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface LocalHint {
  id: string;
  content: string;
  penaltyPercent: number;
}

interface LocalChallenge {
  id: string;
  title: string;
  description: string;
  instructions: string;
  difficulty: DifficultyLevel;
  points: number;
  evaluationType: EvaluationType;
  validationCommand: string;
  expectedStdout: string;
  hints: LocalHint[];
}

export default function CreateLabTemplatePage() {
  const router = useRouter();
  const { success, error, info } = useToast();

  // Template basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('DevOps');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Intermediate');
  const [duration, setDuration] = useState('90');
  const [dockerImage, setDockerImage] = useState('alpine:latest');
  const [memoryLimit, setMemoryLimit] = useState('512');
  const [cpuLimit, setCpuLimit] = useState('0.5');
  const [environmentType, setEnvironmentType] = useState<'terminal' | 'vscode' | 'web-app'>('terminal');
  const [learningObjectives, setLearningObjectives] = useState('Understand file permissions, Configure group rights');
  const [prerequisites, setPrerequisites] = useState('Basic Linux CLI knowledge');

  // Challenge Builder State
  const [challenges, setChallenges] = useState<LocalChallenge[]>([
    {
      id: 'c-1',
      title: 'Challenge 1: System Permissions Audit',
      description: 'Audit file permissions on /etc/labops/config.json and grant read rights to group gdg-lab.',
      instructions: '1. Inspect the file using ls -l\n2. Run chgrp and chmod\n3. Verify unprivileged read access',
      difficulty: 'Beginner',
      points: 100,
      evaluationType: 'COMMAND_EXIT_CODE',
      validationCommand: 'test -r /etc/labops/config.json',
      expectedStdout: '',
      hints: [
        {
          id: 'h-1',
          content: 'Use chmod 640 to set rw-r----- permissions.',
          penaltyPercent: 10,
        },
      ],
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addChallenge = () => {
    const newId = `c-${challenges.length + 1}`;
    setChallenges([
      ...challenges,
      {
        id: newId,
        title: `Challenge ${challenges.length + 1}: New Task`,
        description: 'Describe the milestone task...',
        instructions: 'Step-by-step instructions for the student...',
        difficulty: 'Intermediate',
        points: 100,
        evaluationType: 'COMMAND_EXIT_CODE',
        validationCommand: 'exit 0',
        expectedStdout: '',
        hints: [],
      },
    ]);
    success('Challenge Added', `Created Challenge ${challenges.length + 1}`);
  };

  const removeChallenge = (index: number) => {
    if (challenges.length <= 1) {
      error('Cannot Remove', 'Template must contain at least 1 challenge.');
      return;
    }
    setChallenges(challenges.filter((_, i) => i !== index));
    info('Removed', 'Challenge removed from builder.');
  };

  const updateChallenge = (index: number, field: keyof LocalChallenge, value: any) => {
    const updated = [...challenges];
    updated[index] = { ...updated[index], [field]: value };
    setChallenges(updated);
  };

  const addHint = (challengeIndex: number) => {
    const updated = [...challenges];
    const newHint: LocalHint = {
      id: `h-${Date.now()}`,
      content: 'Provide a helpful clue...',
      penaltyPercent: 10,
    };
    updated[challengeIndex].hints.push(newHint);
    setChallenges(updated);
  };

  const removeHint = (challengeIndex: number, hintIndex: number) => {
    const updated = [...challenges];
    updated[challengeIndex].hints.splice(hintIndex, 1);
    setChallenges(updated);
  };

  const updateHint = (
    challengeIndex: number,
    hintIndex: number,
    field: keyof LocalHint,
    value: any
  ) => {
    const updated = [...challenges];
    updated[challengeIndex].hints[hintIndex] = {
      ...updated[challengeIndex].hints[hintIndex],
      [field]: value,
    };
    setChallenges(updated);
  };

  const handleSave = () => {
    if (!title.trim()) {
      error('Validation Error', 'Template title is required.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      success('Template Saved', `"${title}" created with ${challenges.length} challenges.`);
      router.push('/dashboard/templates');
    }, 800);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/templates">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Create Lab Template & Challenges
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Design custom Docker sandbox definitions and progressive auto-evaluated tasks.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            isLoading={isSubmitting}
            onClick={handleSave}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Template
          </Button>
        </div>

        {/* Section 1: Template Container Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>1. Environment & Docker Specifications</CardTitle>
            <CardDescription>
              Configure the runtime image, cgroup resource limits, and environment type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Template Title"
              placeholder="e.g. Advanced Network Traffic Analysis & Snort Rules"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Overview of the environment capabilities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#4285F4] focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Technical Domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                options={[
                  { value: 'DevOps', label: 'DevOps' },
                  { value: 'Cloud Computing', label: 'Cloud Computing' },
                  { value: 'Cybersecurity', label: 'Cybersecurity' },
                  { value: 'Web Development', label: 'Web Development' },
                  { value: 'Artificial Intelligence', label: 'Artificial Intelligence' },
                ]}
              />

              <Select
                label="Difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                options={[
                  { value: 'Beginner', label: 'Beginner' },
                  { value: 'Intermediate', label: 'Intermediate' },
                  { value: 'Advanced', label: 'Advanced' },
                ]}
              />

              <Select
                label="Environment Interface"
                value={environmentType}
                onChange={(e) => setEnvironmentType(e.target.value as any)}
                options={[
                  { value: 'terminal', label: 'Web Terminal (xterm.js)' },
                  { value: 'vscode', label: 'VS Code Web (code-server)' },
                  { value: 'web-app', label: 'Custom Web Browser Proxy' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Docker Image"
                placeholder="e.g. alpine:latest, node:20-slim"
                value={dockerImage}
                onChange={(e) => setDockerImage(e.target.value)}
              />

              <Input
                type="number"
                label="Memory Limit (MB)"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(e.target.value)}
                helperText="Enforced via cgroups v2"
              />

              <Input
                type="number"
                step="0.1"
                label="CPU Quota (Cores)"
                value={cpuLimit}
                onChange={(e) => setCpuLimit(e.target.value)}
                helperText="e.g. 0.5 = 50% single CPU core"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Interactive Challenge Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                2. Progressive Challenge Milestones
              </h3>
              <p className="text-xs text-slate-500">
                Define verification commands and automated checks executed inside the student container.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={addChallenge}
              leftIcon={<Plus className="w-4 h-4 text-emerald-500" />}
              className="text-xs"
            >
              Add Challenge
            </Button>
          </div>

          {challenges.map((ch, cIdx) => (
            <Card key={ch.id} className="border-l-4 border-l-[#4285F4]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-[#4285F4]">
                    {cIdx + 1}
                  </span>
                  <CardTitle className="text-sm font-semibold">{ch.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-500">{ch.points} pts</span>
                  <button
                    onClick={() => removeChallenge(cIdx)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Remove challenge"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      label="Challenge Title"
                      value={ch.title}
                      onChange={(e) => updateChallenge(cIdx, 'title', e.target.value)}
                    />
                  </div>
                  <Input
                    type="number"
                    label="Awarded Points"
                    value={ch.points.toString()}
                    onChange={(e) => updateChallenge(cIdx, 'points', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Instructions & Problem Statement
                  </label>
                  <textarea
                    rows={2}
                    value={ch.instructions}
                    onChange={(e) => updateChallenge(cIdx, 'instructions', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#4285F4]"
                  />
                </div>

                {/* Evaluation Criteria Block */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Automated Evaluation Strategy
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="Evaluation Type"
                      value={ch.evaluationType}
                      onChange={(e) => updateChallenge(cIdx, 'evaluationType', e.target.value as EvaluationType)}
                      options={[
                        { value: 'COMMAND_EXIT_CODE', label: 'Command Exit Code (0 = Pass)' },
                        { value: 'STDOUT_REGEX', label: 'STDOUT Regex Match' },
                        { value: 'FILE_CONTENT', label: 'File Existence & Content' },
                        { value: 'HTTP_PROBE', label: 'HTTP Health Endpoint Probe' },
                      ]}
                    />

                    <Input
                      label="Evaluation Command / Probe Script"
                      placeholder="e.g. test -f /tmp/flag.txt && echo 'OK'"
                      value={ch.validationCommand}
                      onChange={(e) => updateChallenge(cIdx, 'validationCommand', e.target.value)}
                    />
                  </div>
                </div>

                {/* Progressive Hints Block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Hints ({ch.hints.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => addHint(cIdx)}
                      className="text-[11px] text-[#4285F4] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Hint
                    </button>
                  </div>

                  {ch.hints.map((hint, hIdx) => (
                    <div key={hint.id} className="flex items-center gap-2 p-2 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                      <span className="text-[10px] font-bold text-slate-400">H{hIdx + 1}</span>
                      <input
                        type="text"
                        value={hint.content}
                        onChange={(e) => updateHint(cIdx, hIdx, 'content', e.target.value)}
                        className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                      <span className="text-[10px] text-amber-500 font-mono">
                        -{hint.penaltyPercent}% pts
                      </span>
                      <button
                        onClick={() => removeHint(cIdx, hIdx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
