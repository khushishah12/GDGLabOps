'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/lib/toast-context';
import { LAB_DOMAINS } from '@/lib/validations';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trophy,
  Layers,
  Terminal,
  HelpCircle,
  Eye,
  ArrowUp,
  ArrowDown,
  Code2,
  FileText,
  ListChecks,
  CheckSquare,
  HelpCircle as HelpIcon,
  Sparkles,
} from 'lucide-react';

export interface ChallengeHint {
  id: string;
  orderIndex: number;
  content: string;
  penaltyPercent: number;
}

export interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  instructions: string;
  challengeType: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'CODE_KNOWLEDGE' | 'GUIDED_TASK' | 'RESEARCH_REFLECTION';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  points: number;
  timeLimit?: number | null;
  displayOrder: number;
  hints: ChallengeHint[];
  referenceMaterial?: string;
  solutionData: any;
  explanation?: string;
}

interface TemplateBuilderProps {
  initialData?: any;
  isEditMode?: boolean;
}

export function TemplateBuilder({ initialData, isEditMode = false }: TemplateBuilderProps) {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'environment' | 'challenges' | 'review'>('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Overview State
  const [name, setName] = useState(initialData?.name || '');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || '');
  const [description, setDescription] = useState(
    initialData?.description || '## Overview\nIn this practical lab, students will explore core concepts and complete interactive challenges.'
  );
  const [domain, setDomain] = useState(initialData?.domain || 'DevOps & CI/CD');
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(
    initialData?.difficulty || 'INTERMEDIATE'
  );
  const [duration, setDuration] = useState(initialData?.estimatedDuration?.toString() || '60');
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || ['hands-on', 'fundamentals']);

  // Curriculum State
  const [objectives, setObjectives] = useState<string[]>(
    Array.isArray(initialData?.learningObjectives)
      ? initialData.learningObjectives
      : ['Understand core system architecture', 'Implement secure configurations']
  );
  const [newObjective, setNewObjective] = useState('');

  const [prerequisites, setPrerequisites] = useState<string[]>(
    Array.isArray(initialData?.prerequisites)
      ? initialData.prerequisites
      : ['Basic CLI knowledge', 'Understanding of client-server concepts']
  );
  const [newPrereq, setNewPrereq] = useState('');

  // Environment State
  const [environmentType, setEnvironmentType] = useState<'terminal' | 'vscode' | 'web-app'>(
    initialData?.environmentType || 'terminal'
  );
  const [requiredTools, setRequiredTools] = useState<Array<{ name: string; version?: string; description?: string }>>(
    Array.isArray(initialData?.requiredTools)
      ? initialData.requiredTools
      : [{ name: 'bash', version: '5.1+', description: 'Standard command shell' }]
  );
  const [newToolName, setNewToolName] = useState('');
  const [newToolVersion, setNewToolVersion] = useState('');

  // Challenges State
  const [challenges, setChallenges] = useState<ChallengeItem[]>(
    initialData?.challenges?.map((c: any, index: number) => ({
      id: c.id || `ch-${index + 1}`,
      title: c.title || `Challenge ${index + 1}`,
      description: c.description || '',
      instructions: c.instructions || '',
      challengeType: c.challengeType || 'MULTIPLE_CHOICE',
      difficulty: c.difficulty || 'INTERMEDIATE',
      points: c.points || 100,
      timeLimit: c.timeLimit || null,
      displayOrder: c.displayOrder || index + 1,
      hints: Array.isArray(c.hints) ? c.hints : [],
      referenceMaterial: c.referenceMaterial || '',
      solutionData: c.solutionData || {},
      explanation: c.explanation || '',
    })) || [
      {
        id: 'c-1',
        title: 'Milestone 1: Architectural Knowledge Check',
        description: 'Verify understanding of key configuration flags and permissions.',
        instructions: 'Choose the correct option representing the safest default permission setting.',
        challengeType: 'MULTIPLE_CHOICE',
        difficulty: 'BEGINNER',
        points: 100,
        displayOrder: 1,
        hints: [{ id: 'h-1', orderIndex: 1, content: 'Read rights require 4, write requires 2.', penaltyPercent: 10 }],
        solutionData: {
          options: [
            { id: 'opt-1', text: 'chmod 777 /config.json (Full world access)', isCorrect: false },
            { id: 'opt-2', text: 'chmod 600 /config.json (Owner read/write only)', isCorrect: true },
            { id: 'opt-3', text: 'chmod 000 /config.json (No access)', isCorrect: false },
          ],
        },
        explanation: 'Setting chmod 600 ensures only the owner process can read and modify sensitive files.',
      },
    ]
  );

  // Active Challenge modal / editor state
  const [editingChallengeIndex, setEditingChallengeIndex] = useState<number | null>(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  // Temporary challenge editing buffer
  const [editCh, setEditCh] = useState<ChallengeItem | null>(null);

  // Tag helper
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Objective helper
  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const handleRemoveObjective = (idx: number) => {
    setObjectives(objectives.filter((_, i) => i !== idx));
  };

  // Prerequisite helper
  const handleAddPrereq = () => {
    if (newPrereq.trim()) {
      setPrerequisites([...prerequisites, newPrereq.trim()]);
      setNewPrereq('');
    }
  };

  const handleRemovePrereq = (idx: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== idx));
  };

  // Tools helper
  const handleAddTool = () => {
    if (newToolName.trim()) {
      setRequiredTools([...requiredTools, { name: newToolName.trim(), version: newToolVersion.trim() || undefined }]);
      setNewToolName('');
      setNewToolVersion('');
    }
  };

  const handleRemoveTool = (idx: number) => {
    setRequiredTools(requiredTools.filter((_, i) => i !== idx));
  };

  // Challenge reordering
  const moveChallenge = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= challenges.length) return;

    const updated = [...challenges];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Renumber displayOrder
    const renumbered = updated.map((c, i) => ({ ...c, displayOrder: i + 1 }));
    setChallenges(renumbered);
  };

  const deleteChallenge = (index: number) => {
    const updated = challenges.filter((_, i) => i !== index).map((c, i) => ({ ...c, displayOrder: i + 1 }));
    setChallenges(updated);
  };

  // Open modal to add or edit challenge
  const openChallengeEditor = (index: number | null) => {
    if (index === null) {
      // Create new challenge defaults
      const newCh: ChallengeItem = {
        id: `ch-temp-${Date.now()}`,
        title: `Challenge ${challenges.length + 1}: Interactive Task`,
        description: 'Provide an overview of what the student needs to accomplish.',
        instructions: 'Step-by-step instructions for the student...',
        challengeType: 'MULTIPLE_CHOICE',
        difficulty: 'INTERMEDIATE',
        points: 100,
        displayOrder: challenges.length + 1,
        hints: [],
        solutionData: {
          options: [
            { id: 'opt-1', text: 'Option A', isCorrect: true },
            { id: 'opt-2', text: 'Option B', isCorrect: false },
          ],
        },
        explanation: 'Detailed technical explanation after completion.',
      };
      setEditCh(newCh);
      setEditingChallengeIndex(null);
    } else {
      setEditCh(JSON.parse(JSON.stringify(challenges[index])));
      setEditingChallengeIndex(index);
    }
    setIsChallengeModalOpen(true);
  };

  const saveChallengeFromModal = () => {
    if (!editCh) return;
    if (!editCh.title.trim()) {
      error('Title Required', 'Please enter a title for the challenge.');
      return;
    }

    if (editingChallengeIndex === null) {
      // Add new
      setChallenges([...challenges, { ...editCh, displayOrder: challenges.length + 1 }]);
    } else {
      // Update existing
      const updated = [...challenges];
      updated[editingChallengeIndex] = editCh;
      setChallenges(updated);
    }
    setIsChallengeModalOpen(false);
    setEditCh(null);
  };

  // Final Form Submission
  const handleSave = async (targetStatus: 'DRAFT' | 'PUBLISHED') => {
    if (!name.trim()) {
      error('Missing Title', 'Please enter a name for the lab template.');
      setActiveTab('overview');
      return;
    }

    if (objectives.length === 0) {
      error('Missing Objectives', 'At least one learning objective is required.');
      setActiveTab('curriculum');
      return;
    }

    if (targetStatus === 'PUBLISHED' && challenges.length === 0) {
      error('Cannot Publish', 'A published template must contain at least one challenge.');
      setActiveTab('challenges');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        shortDescription: shortDescription.trim() || null,
        description: description.trim(),
        domain,
        difficulty,
        estimatedDuration: parseInt(duration, 10) || 60,
        coverImageUrl: coverImageUrl.trim() || null,
        tags,
        environmentType,
        requiredTools,
        learningObjectives: objectives,
        prerequisites,
        status: targetStatus,
      };

      let templateId = initialData?.id;

      if (isEditMode && templateId) {
        // Update template
        const res = await fetch(`/api/templates/${templateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to update template');
        }

        // Sync challenges (create/update)
        for (const ch of challenges) {
          if (ch.id && !ch.id.startsWith('ch-temp-')) {
            // Update existing challenge
            await fetch(`/api/challenges/${ch.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ch),
            });
          } else {
            // Create new challenge
            await fetch(`/api/templates/${templateId}/challenges`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...ch, labTemplateId: templateId }),
            });
          }
        }

        success('Template Saved', `Template "${name}" updated successfully.`);
        router.push('/dashboard/templates');
      } else {
        // Create new template
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to create template');
        }

        templateId = json.data.id;

        // Create challenges for the new template
        for (const ch of challenges) {
          await fetch(`/api/templates/${templateId}/challenges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...ch, labTemplateId: templateId }),
          });
        }

        success('Template Created', `Template "${name}" has been created successfully.`);
        router.push('/dashboard/templates');
      }
    } catch (err: any) {
      error('Submission Error', err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/templates">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isEditMode ? `Edit Template: ${name || 'Untitled'}` : 'Create Lab Template'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure curriculum metadata, learning prerequisites, and hands-on challenge milestones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave('DRAFT')}
            disabled={isSubmitting}
            className="text-xs"
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave('PUBLISHED')}
            disabled={isSubmitting}
            className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]"
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Saving...' : 'Publish Template'}
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: '1. Overview & Info' },
          { id: 'curriculum', label: '2. Objectives & Prerequisites' },
          { id: 'environment', label: '3. Environment & Tools' },
          { id: 'challenges', label: `4. Challenges (${challenges.length})` },
          { id: 'review', label: '5. Review & Publish' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-[#1a73e8] text-[#1a73e8] dark:border-[#4285F4] dark:text-[#4285F4]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <Card className="p-6 space-y-5">
          <div className="space-y-4">
            <Input
              label="Template Name"
              placeholder="e.g. Linux Permissions & Hardening Workshop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Short Summary"
              placeholder="A concise one-line overview of the lab"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Category / Domain
                </label>
                <Select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  options={LAB_DOMAINS.map((dom) => ({ value: dom, label: dom }))}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty Level
                </label>
                <Select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  options={[
                    { value: 'BEGINNER', label: 'Beginner' },
                    { value: 'INTERMEDIATE', label: 'Intermediate' },
                    { value: 'ADVANCED', label: 'Advanced' },
                  ]}
                  className="text-xs"
                />
              </div>

              <Input
                label="Estimated Duration (Minutes)"
                type="number"
                min="10"
                max="360"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <Input
              label="Cover Image URL (Optional)"
              placeholder="https://images.unsplash.com/..."
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
            />

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Curriculum Tags
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a tag and click add (e.g. bash, security)..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="text-xs"
                />
                <Button size="sm" variant="secondary" onClick={handleAddTag} className="text-xs shrink-0">
                  Add Tag
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Markdown Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Detailed Description (Markdown)
              </label>
              <textarea
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20"
                placeholder="Markdown formatted curriculum description..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setActiveTab('curriculum')} className="text-xs">
              Next: Objectives & Prerequisites →
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 2: OBJECTIVES & PREREQUISITES */}
      {activeTab === 'curriculum' && (
        <Card className="p-6 space-y-6">
          {/* Learning Objectives */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Learning Objectives</h3>
              <p className="text-xs text-slate-500">What specific skills or knowledge will students acquire?</p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="e.g. Master chmod octal and symbolic permission modes"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddObjective();
                  }
                }}
                className="text-xs"
              />
              <Button size="sm" variant="secondary" onClick={handleAddObjective} className="text-xs shrink-0">
                Add Objective
              </Button>
            </div>

            <div className="space-y-2 pt-1">
              {objectives.map((obj, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {obj}
                  </span>
                  <button
                    onClick={() => handleRemoveObjective(i)}
                    className="text-slate-400 hover:text-red-500 text-xs p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Prerequisites */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Prerequisites</h3>
              <p className="text-xs text-slate-500">What prior background or skills are expected?</p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="e.g. Basic comfort with bash terminal commands"
                value={newPrereq}
                onChange={(e) => setNewPrereq(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPrereq();
                  }
                }}
                className="text-xs"
              />
              <Button size="sm" variant="secondary" onClick={handleAddPrereq} className="text-xs shrink-0">
                Add Prerequisite
              </Button>
            </div>

            <div className="space-y-2 pt-1">
              {prerequisites.map((req, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      •
                    </span>
                    {req}
                  </span>
                  <button
                    onClick={() => handleRemovePrereq(i)}
                    className="text-slate-400 hover:text-red-500 text-xs p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button size="sm" variant="outline" onClick={() => setActiveTab('overview')} className="text-xs">
              ← Back to Overview
            </Button>
            <Button size="sm" onClick={() => setActiveTab('environment')} className="text-xs">
              Next: Environment & Tools →
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 3: ENVIRONMENT & TOOLS */}
      {activeTab === 'environment' && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Environment Profile</h3>
              <p className="text-xs text-slate-500">Configure client interaction interface and tooling requirements.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'terminal', title: 'Terminal / CLI', desc: 'Direct interactive shell for command-line tasks' },
                { id: 'vscode', title: 'VS Code Cloud IDE', desc: 'Browser-based code editor with file explorer' },
                { id: 'web-app', title: 'Web App / HTTP', desc: 'Browser window testing and web services' },
              ].map((env) => (
                <div
                  key={env.id}
                  onClick={() => setEnvironmentType(env.id as any)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    environmentType === env.id
                      ? 'border-[#1a73e8] bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{env.title}</span>
                    <Terminal className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{env.desc}</p>
                </div>
              ))}
            </div>

            {/* Required Tools */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Required Tools & Packages</h3>
                <p className="text-xs text-slate-500">Specify system binaries or libraries expected in this environment.</p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Tool name (e.g. docker, git, python)"
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                  className="text-xs flex-1"
                />
                <Input
                  placeholder="Version (e.g. 3.10+)"
                  value={newToolVersion}
                  onChange={(e) => setNewToolVersion(e.target.value)}
                  className="text-xs w-32"
                />
                <Button size="sm" variant="secondary" onClick={handleAddTool} className="text-xs shrink-0">
                  Add Tool
                </Button>
              </div>

              <div className="space-y-2 pt-1">
                {requiredTools.map((tool, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{tool.name}</span>
                      {tool.version && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {tool.version}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleRemoveTool(i)} className="text-slate-400 hover:text-red-500 text-xs p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button size="sm" variant="outline" onClick={() => setActiveTab('curriculum')} className="text-xs">
              ← Back to Objectives
            </Button>
            <Button size="sm" onClick={() => setActiveTab('challenges')} className="text-xs">
              Next: Challenges ({challenges.length}) →
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 4: CHALLENGES */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Challenge Milestones</h2>
              <p className="text-xs text-slate-500">
                Create structured interactive milestones evaluated across 5 challenge formats.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => openChallengeEditor(null)}
              className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Challenge
            </Button>
          </div>

          {challenges.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <Trophy className="w-8 h-8 mx-auto text-slate-400" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Challenges Defined Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add at least one challenge milestone so students can practice, verify their work, and earn points.
              </p>
              <Button size="sm" onClick={() => openChallengeEditor(null)} className="text-xs">
                Add First Challenge
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {challenges.map((ch, idx) => (
                <Card
                  key={ch.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <Badge variant="outline" size="sm">
                        {ch.challengeType.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="secondary" size="sm">
                        {ch.points} pts
                      </Badge>
                      <Badge variant="domain" size="sm">
                        {ch.difficulty}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{ch.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{ch.description || ch.instructions}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={idx === 0}
                      onClick={() => moveChallenge(idx, 'up')}
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={idx === challenges.length - 1}
                      onClick={() => moveChallenge(idx, 'down')}
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => openChallengeEditor(idx)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => deleteChallenge(idx)}
                      title="Delete Challenge"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button size="sm" variant="outline" onClick={() => setActiveTab('environment')} className="text-xs">
              ← Back to Environment
            </Button>
            <Button size="sm" onClick={() => setActiveTab('review')} className="text-xs">
              Next: Review & Publish →
            </Button>
          </div>
        </div>
      )}

      {/* TAB 5: REVIEW & PUBLISH */}
      {activeTab === 'review' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Review Template Configuration</h3>
            <p className="text-xs text-slate-500">
              Verify your template details and challenge setup before publishing to workshop organizers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
              <span className="font-semibold text-slate-400 uppercase tracking-wider block text-[10px]">General Info</span>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{name || 'Untitled'}</div>
              <div className="text-slate-500">{shortDescription || 'No short description'}</div>
              <div className="pt-2 flex items-center gap-2">
                <Badge variant="domain">{domain}</Badge>
                <Badge variant="outline">{difficulty}</Badge>
                <span className="text-slate-400">{duration} minutes</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
              <span className="font-semibold text-slate-400 uppercase tracking-wider block text-[10px]">Curriculum Stats</span>
              <div className="flex items-center justify-between">
                <span>Learning Objectives:</span>
                <span className="font-bold">{objectives.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Prerequisites:</span>
                <span className="font-bold">{prerequisites.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Challenges:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{challenges.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Points Possible:</span>
                <span className="font-bold">
                  {challenges.reduce((acc, curr) => acc + (curr.points || 0), 0)} pts
                </span>
              </div>
            </div>
          </div>

          {/* Publishing Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 block">Readiness Checklist</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Template Name and Domain Specified
              </div>
              <div
                className={`flex items-center gap-2 ${
                  objectives.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                }`}
              >
                {objectives.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                At least 1 Learning Objective Defined ({objectives.length})
              </div>
              <div
                className={`flex items-center gap-2 ${
                  challenges.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                }`}
              >
                {challenges.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                At least 1 Challenge Milestone Configured ({challenges.length})
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" onClick={() => setActiveTab('challenges')} className="text-xs">
              ← Back to Challenges
            </Button>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleSave('DRAFT')}
                disabled={isSubmitting}
                className="text-xs"
              >
                Save as Draft
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave('PUBLISHED')}
                disabled={isSubmitting || challenges.length === 0}
                className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Publish Now
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* CHALLENGE EDITOR MODAL */}
      <Dialog open={isChallengeModalOpen} onOpenChange={setIsChallengeModalOpen}>
        <DialogHeader>
          <DialogTitle>{editingChallengeIndex !== null ? 'Edit Challenge Milestone' : 'Add New Challenge Milestone'}</DialogTitle>
          <DialogDescription>
            Configure instructions, evaluation parameters, hints, and scoring criteria.
          </DialogDescription>
        </DialogHeader>

        {editCh && (
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <Input
              label="Challenge Title"
              value={editCh.title}
              onChange={(e) => setEditCh({ ...editCh, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Challenge Type
                </label>
                <Select
                  value={editCh.challengeType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    // Reset solutionData schema based on type
                    let newSol: any = {};
                    if (newType === 'MULTIPLE_CHOICE') {
                      newSol = {
                        options: [
                          { id: 'opt-1', text: 'Option A', isCorrect: true },
                          { id: 'opt-2', text: 'Option B', isCorrect: false },
                        ],
                        allowMultiple: false,
                      };
                    } else if (newType === 'SHORT_ANSWER') {
                      newSol = {
                        acceptedAnswers: ['nginx', 'apache2'],
                        caseSensitive: false,
                        whitespaceNormalized: true,
                      };
                    } else if (newType === 'CODE_KNOWLEDGE') {
                      newSol = {
                        expectedCode: 'chmod 640 /etc/secure.conf',
                        matchMode: 'NORMALIZED',
                        language: 'bash',
                      };
                    } else if (newType === 'GUIDED_TASK') {
                      newSol = {
                        checklist: [
                          { id: 'task-1', text: 'Navigate to project root', isRequired: true },
                          { id: 'task-2', text: 'Create .env file with secrets', isRequired: true },
                        ],
                        confirmationCode: 'FLAG-LAB-COMPLETED',
                      };
                    } else if (newType === 'RESEARCH_REFLECTION') {
                      newSol = {
                        minWordCount: 40,
                        autoAwardPoints: true,
                      };
                    }
                    setEditCh({ ...editCh, challengeType: newType, solutionData: newSol });
                  }}
                  options={[
                    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice Question (MCQ)' },
                    { value: 'SHORT_ANSWER', label: 'Short Answer / Term' },
                    { value: 'CODE_KNOWLEDGE', label: 'Code / Command Knowledge' },
                    { value: 'GUIDED_TASK', label: 'Guided Checklist Task' },
                    { value: 'RESEARCH_REFLECTION', label: 'Research & Reflection' },
                  ]}
                  className="text-xs"
                />
              </div>

              <Input
                label="Points"
                type="number"
                min="10"
                max="500"
                value={editCh.points.toString()}
                onChange={(e) => setEditCh({ ...editCh, points: parseInt(e.target.value, 10) || 100 })}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty
                </label>
                <Select
                  value={editCh.difficulty}
                  onChange={(e) => setEditCh({ ...editCh, difficulty: e.target.value as any })}
                  options={[
                    { value: 'BEGINNER', label: 'Beginner' },
                    { value: 'INTERMEDIATE', label: 'Intermediate' },
                    { value: 'ADVANCED', label: 'Advanced' },
                  ]}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Description & Instructions */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Instructions for Student (Markdown)
              </label>
              <textarea
                rows={4}
                value={editCh.instructions}
                onChange={(e) => setEditCh({ ...editCh, instructions: e.target.value })}
                className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20"
                placeholder="Give clear, step-by-step guidance on what to do..."
              />
            </div>

            {/* TYPE-SPECIFIC SOLUTION BUILDER */}
            <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                  Evaluation Rules: {editCh.challengeType.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-blue-500 font-mono">(Hidden from students)</span>
              </div>

              {/* 1. MCQ Options Builder */}
              {editCh.challengeType === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block">
                    Define options and check the box for correct answer(s):
                  </span>
                  {(editCh.solutionData?.options || []).map((opt: any, optIdx: number) => (
                    <div key={opt.id || optIdx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(opt.isCorrect)}
                        onChange={(e) => {
                          const newOpts = [...(editCh.solutionData?.options || [])];
                          newOpts[optIdx] = { ...opt, isCorrect: e.target.checked };
                          setEditCh({ ...editCh, solutionData: { ...editCh.solutionData, options: newOpts } });
                        }}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        title="Mark as correct"
                      />
                      <Input
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...(editCh.solutionData?.options || [])];
                          newOpts[optIdx] = { ...opt, text: e.target.value };
                          setEditCh({ ...editCh, solutionData: { ...editCh.solutionData, options: newOpts } });
                        }}
                        placeholder={`Option ${optIdx + 1} text...`}
                        className="text-xs flex-1"
                      />
                      <button
                        onClick={() => {
                          const newOpts = (editCh.solutionData?.options || []).filter((_: any, i: number) => i !== optIdx);
                          setEditCh({ ...editCh, solutionData: { ...editCh.solutionData, options: newOpts } });
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      const cur = editCh.solutionData?.options || [];
                      const newOpt = { id: `opt-${cur.length + 1}`, text: '', isCorrect: false };
                      setEditCh({ ...editCh, solutionData: { ...editCh.solutionData, options: [...cur, newOpt] } });
                    }}
                  >
                    + Add Option
                  </Button>
                </div>
              )}

              {/* 2. Short Answer Builder */}
              {editCh.challengeType === 'SHORT_ANSWER' && (
                <div className="space-y-3">
                  <Input
                    label="Accepted Answer(s) (Comma-separated)"
                    placeholder="e.g. nginx, nginx web server, /etc/nginx"
                    value={
                      Array.isArray(editCh.solutionData?.acceptedAnswers)
                        ? editCh.solutionData.acceptedAnswers.join(', ')
                        : ''
                    }
                    onChange={(e) => {
                      const list = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      setEditCh({
                        ...editCh,
                        solutionData: { ...editCh.solutionData, acceptedAnswers: list },
                      });
                    }}
                  />
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editCh.solutionData?.caseSensitive)}
                        onChange={(e) =>
                          setEditCh({
                            ...editCh,
                            solutionData: { ...editCh.solutionData, caseSensitive: e.target.checked },
                          })
                        }
                      />
                      Case Sensitive
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCh.solutionData?.whitespaceNormalized !== false}
                        onChange={(e) =>
                          setEditCh({
                            ...editCh,
                            solutionData: { ...editCh.solutionData, whitespaceNormalized: e.target.checked },
                          })
                        }
                      />
                      Normalize Whitespace
                    </label>
                  </div>
                </div>
              )}

              {/* 3. Code Knowledge Builder */}
              {editCh.challengeType === 'CODE_KNOWLEDGE' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Language</label>
                      <Select
                        value={editCh.solutionData?.language || 'bash'}
                        onChange={(e) =>
                          setEditCh({
                            ...editCh,
                            solutionData: { ...editCh.solutionData, language: e.target.value },
                          })
                        }
                        options={[
                          { value: 'bash', label: 'Bash / Shell' },
                          { value: 'python', label: 'Python' },
                          { value: 'javascript', label: 'JavaScript' },
                          { value: 'sql', label: 'SQL' },
                          { value: 'dockerfile', label: 'Dockerfile' },
                        ]}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Match Mode</label>
                      <Select
                        value={editCh.solutionData?.matchMode || 'NORMALIZED'}
                        onChange={(e) =>
                          setEditCh({
                            ...editCh,
                            solutionData: { ...editCh.solutionData, matchMode: e.target.value },
                          })
                        }
                        options={[
                          { value: 'NORMALIZED', label: 'Normalized (Ignores whitespace & comments)' },
                          { value: 'EXACT', label: 'Exact String Match' },
                          { value: 'CONTAINS', label: 'Contains Keyword / Snippet' },
                          { value: 'REGEX', label: 'Regular Expression' },
                        ]}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold">Expected Code / Command Snippet</label>
                    <textarea
                      rows={3}
                      value={editCh.solutionData?.expectedCode || ''}
                      onChange={(e) =>
                        setEditCh({
                          ...editCh,
                          solutionData: { ...editCh.solutionData, expectedCode: e.target.value },
                        })
                      }
                      className="w-full font-mono text-xs p-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      placeholder="e.g. chmod 640 /var/log/app.log"
                    />
                  </div>
                </div>
              )}

              {/* 4. Guided Task Builder */}
              {editCh.challengeType === 'GUIDED_TASK' && (
                <div className="space-y-3">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block">
                    Student Task Checklist Items:
                  </span>
                  {(editCh.solutionData?.checklist || []).map((item: any, itemIdx: number) => (
                    <div key={item.id || itemIdx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{itemIdx + 1}.</span>
                      <Input
                        value={item.text}
                        onChange={(e) => {
                          const newCheck = [...(editCh.solutionData?.checklist || [])];
                          newCheck[itemIdx] = { ...item, text: e.target.value };
                          setEditCh({ ...editCh, solutionData: { ...editCh.solutionData, checklist: newCheck } });
                        }}
                        placeholder={`Action step ${itemIdx + 1}...`}
                        className="text-xs flex-1"
                      />
                      <button
                        onClick={() => {
                          const newCheck = (editCh.solutionData?.checklist || []).filter((_: any, i: number) => i !== itemIdx);
                          setEditCh({ ...editCh, solutionData: { ...editCh.solutionData, checklist: newCheck } });
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      const cur = editCh.solutionData?.checklist || [];
                      const newItem = { id: `item-${cur.length + 1}`, text: '', isRequired: true };
                      setEditCh({ ...editCh, solutionData: { ...editCh.solutionData, checklist: [...cur, newItem] } });
                    }}
                  >
                    + Add Task Item
                  </Button>

                  <Input
                    label="Optional Confirmation Passcode / Flag"
                    placeholder="e.g. GDG-TASK-VERIFIED-99"
                    value={editCh.solutionData?.confirmationCode || ''}
                    onChange={(e) =>
                      setEditCh({
                        ...editCh,
                        solutionData: { ...editCh.solutionData, confirmationCode: e.target.value },
                      })
                    }
                  />
                </div>
              )}

              {/* 5. Research Reflection Builder */}
              {editCh.challengeType === 'RESEARCH_REFLECTION' && (
                <div className="space-y-3">
                  <Input
                    label="Minimum Word Count Requirement"
                    type="number"
                    min="10"
                    max="500"
                    value={(editCh.solutionData?.minWordCount || 40).toString()}
                    onChange={(e) =>
                      setEditCh({
                        ...editCh,
                        solutionData: { ...editCh.solutionData, minWordCount: parseInt(e.target.value, 10) || 40 },
                      })
                    }
                  />
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={editCh.solutionData?.autoAwardPoints !== false}
                      onChange={(e) =>
                        setEditCh({
                          ...editCh,
                          solutionData: { ...editCh.solutionData, autoAwardPoints: e.target.checked },
                        })
                      }
                    />
                    Auto-award points upon meeting minimum word count
                  </label>
                </div>
              )}
            </div>

            {/* Hints Builder */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hints (Deducts penalty % upon student unlocking)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => {
                    const curHints = editCh.hints || [];
                    const newH: ChallengeHint = {
                      id: `h-${curHints.length + 1}`,
                      orderIndex: curHints.length + 1,
                      content: '',
                      penaltyPercent: 10,
                    };
                    setEditCh({ ...editCh, hints: [...curHints, newH] });
                  }}
                >
                  + Add Hint
                </Button>
              </div>

              {(editCh.hints || []).map((h, hIdx) => (
                <div key={h.id || hIdx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Hint ${hIdx + 1} content...`}
                    value={h.content}
                    onChange={(e) => {
                      const updatedH = [...editCh.hints];
                      updatedH[hIdx] = { ...h, content: e.target.value };
                      setEditCh({ ...editCh, hints: updatedH });
                    }}
                    className="text-xs flex-1"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-slate-400">-</span>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={h.penaltyPercent.toString()}
                      onChange={(e) => {
                        const updatedH = [...editCh.hints];
                        updatedH[hIdx] = { ...h, penaltyPercent: parseInt(e.target.value, 10) || 0 };
                        setEditCh({ ...editCh, hints: updatedH });
                      }}
                      className="text-xs w-16"
                    />
                    <span className="text-[11px] text-slate-400">%</span>
                  </div>
                  <button
                    onClick={() => {
                      const updatedH = editCh.hints.filter((_, i) => i !== hIdx);
                      setEditCh({ ...editCh, hints: updatedH });
                    }}
                    className="text-slate-400 hover:text-red-500 p-1 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Post-Completion Explanation */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Post-Completion Educational Explanation
              </label>
              <textarea
                rows={3}
                value={editCh.explanation || ''}
                onChange={(e) => setEditCh({ ...editCh, explanation: e.target.value })}
                className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-2.5 text-slate-900 dark:text-slate-100"
                placeholder="Explain why the solution works and best practices..."
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => setIsChallengeModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={saveChallengeFromModal} className="bg-[#1a73e8] hover:bg-[#1557b0] text-xs">
            Save Challenge
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
