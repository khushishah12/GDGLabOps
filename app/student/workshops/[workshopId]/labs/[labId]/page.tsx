'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/toast-context';
import {
  Terminal,
  Play,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  Clock,
  Sparkles,
  ChevronRight,
  Code2,
  ListChecks,
  CheckSquare,
  RefreshCw,
  BookOpen,
  Send,
  RotateCcw,
} from 'lucide-react';

export default function StudentLabWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workshopId = (params?.workshopId as string) || '';
  const labId = (params?.labId as string) || '';
  const { success, error, info } = useToast();

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);

  // Student inputs and submission state per challenge
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [unlockedHints, setUnlockedHints] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<Record<string, any>>({});
  const [isLaunchingLab, setIsLaunchingLab] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  const checkActiveSession = async () => {
    try {
      const res = await fetch('/api/sessions');
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        if (json.data.workshopId === workshopId && json.data.labTemplateId === labId) {
          setActiveSession(json.data);
        }
      }
    } catch {
      // Ignore
    }
  };

  const fetchLabData = async () => {
    if (!workshopId || !labId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student/workshops/${workshopId}/labs/${labId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        error('Error', json.error?.message || 'Failed to load lab workspace.');
      }
    } catch {
      error('Error', 'Network error while retrieving lab data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
    checkActiveSession();
  }, [workshopId, labId]);

  const handleLaunchCloudEnvironment = async () => {
    setIsLaunchingLab(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          labTemplateId: labId,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        success('Environment Ready', 'Cloud container provisioned.');
        router.push(`/student/lab/${json.data.id}`);
      } else {
        info('Interactive Sandbox Mode', 'Opening sandbox workspace.');
        router.push(`/student/lab/demo-session?workshopId=${workshopId}&domain=${encodeURIComponent(data?.workshop?.domain || 'Linux')}`);
      }
    } catch {
      info('Interactive Sandbox Mode', 'Opening sandbox workspace.');
      router.push(`/student/lab/demo-session?workshopId=${workshopId}&domain=${encodeURIComponent(data?.workshop?.domain || 'Linux')}`);
    } finally {
      setIsLaunchingLab(false);
    }
  };

  const activeChallenge = data?.lab?.challenges?.[activeChallengeIdx];

  const handleUnlockHint = (chId: string, hintId: string, penaltyPercent: number) => {
    const current = unlockedHints[chId] || [];
    if (!current.includes(hintId)) {
      setUnlockedHints({ ...unlockedHints, [chId]: [...current, hintId] });
      info('Hint Unlocked', `Hint revealed. Note: -${penaltyPercent}% score penalty will be applied to this milestone.`);
    }
  };

  const handleSubmit = async () => {
    if (!activeChallenge) return;
    const chId = activeChallenge.id;
    const answer = answers[chId];

    if (answer === undefined || answer === null || answer === '') {
      error('Empty Answer', 'Please provide an answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const usedHintIds = unlockedHints[chId] || [];
      const res = await fetch(`/api/challenges/${chId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          answer,
          usedHintIds,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const result = json.data;
        setSubmissionFeedback({
          ...submissionFeedback,
          [chId]: result,
        });

        if (result.passed) {
          success(
            'Challenge Passed! 🎉',
            `${result.feedback} (+${result.pointsAwarded} points awarded)`
          );
          // Refresh progress data
          fetchLabData();
        } else {
          info('Attempt Evaluated', result.feedback);
        }
      } else {
        error('Submission Error', json.error?.message || 'Failed to evaluate challenge.');
      }
    } catch {
      error('Error', 'Network error during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8]" />
          <p className="text-xs text-slate-400">Loading student lab workspace...</p>
        </div>
      </AppShell>
    );
  }

  if (!data || !data.lab) {
    return (
      <AppShell>
        <div className="py-20 text-center space-y-3 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold">Lab Content Not Found</h2>
          <p className="text-xs text-slate-500">
            This lab template may have been detached or requires active registration.
          </p>
          <Link href="/student/workshops">
            <Button size="sm" variant="outline" className="text-xs">
              Back to My Workshops
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const { workshop, lab, studentProgress } = data;
  const template = lab.template;
  const challenges: any[] = lab.challenges || [];

  const currentChAnswer = activeChallenge ? answers[activeChallenge.id] : null;
  const currentChFeedback = activeChallenge ? submissionFeedback[activeChallenge.id] : null;
  const currentChHints = activeChallenge ? unlockedHints[activeChallenge.id] || [] : [];

  // Determine challenge status
  const isChPassed =
    currentChFeedback?.passed || activeChallenge?.studentProgress?.status === 'PASSED';

  // Metrics
  const completionPercentage = studentProgress?.completionPercentage ?? 0;
  const totalPointsEarned = studentProgress?.totalPoints ?? 0;
  const maxPossiblePoints = challenges.reduce((sum: number, c: any) => sum + (c.points || 0), 0);

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Link href="/student/workshops" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Workshops
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{workshop.title}</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {template.name}
              </h1>
              <Badge variant="domain" size="sm">
                {template.domain}
              </Badge>
              <Badge variant="outline" size="sm">
                {template.difficulty}
              </Badge>
            </div>
          </div>

          {/* Progress Telemetry */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] gap-4">
                <span className="font-semibold text-slate-500">Curriculum Progress</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {completionPercentage}%
                </span>
              </div>
              <div className="w-36 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Points Earned
              </span>
              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {totalPointsEarned} / {maxPossiblePoints}
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Milestone Navigation & Objectives */}
          <div className="lg:col-span-4 space-y-4">
            {/* Cloud Linux Environment Card */}
            <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-slate-100">Remote Cloud Environment</span>
                </div>
                <Badge variant="outline" size="sm" className="bg-slate-800 text-slate-300 border-slate-700 font-mono text-[10px]">
                  {template.environmentProfile || 'ubuntu-fundamentals'}
                </Badge>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Zero local setup. Runs in an isolated Linux cloud sandbox directly from your web browser.
              </p>

              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs font-semibold flex items-center justify-center gap-2"
                onClick={
                  activeSession
                    ? () => router.push(`/student/lab/${activeSession.id}`)
                    : handleLaunchCloudEnvironment
                }
                disabled={isLaunchingLab}
              >
                {isLaunchingLab ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Provisioning Container...
                  </>
                ) : activeSession ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" /> Resume Cloud Terminal
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Launch Cloud Environment
                  </>
                )}
              </Button>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Milestones ({challenges.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  {challenges.filter((c) => c.studentProgress?.status === 'PASSED').length}/{challenges.length} solved
                </span>
              </div>

              <div className="space-y-1.5">
                {challenges.map((ch: any, idx: number) => {
                  const isCurrent = idx === activeChallengeIdx;
                  const isSolved = ch.studentProgress?.status === 'PASSED';
                  const hasAttempted = (ch.studentProgress?.attempts || 0) > 0;

                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChallengeIdx(idx)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'border-[#1a73e8] bg-blue-50/50 dark:bg-blue-950/30 font-semibold'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                            isSolved
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold'
                              : hasAttempted
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isSolved ? '✓' : idx + 1}
                        </span>
                        <span className="truncate text-slate-900 dark:text-slate-100">{ch.title}</span>
                      </div>
                      <Badge variant="secondary" size="sm" className="shrink-0 text-[10px] font-mono">
                        {ch.points} pts
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Learning Objectives & Prerequisites */}
            <Card className="p-4 space-y-3 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                Learning Objectives
              </span>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                {(template.learningObjectives || []).map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>

              {Array.isArray(template.prerequisites) && template.prerequisites.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                    Prerequisites
                  </span>
                  <p className="text-slate-500">{template.prerequisites.join(', ')}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel: Challenge Workspace */}
          <div className="lg:col-span-8 space-y-4">
            {activeChallenge ? (
              <Card className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        Milestone {activeChallengeIdx + 1} of {challenges.length}
                      </span>
                      <Badge variant="outline" size="sm">
                        {activeChallenge.challengeType.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="domain" size="sm">
                        {activeChallenge.difficulty}
                      </Badge>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {activeChallenge.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {isChPassed && (
                      <Badge variant="success" size="sm" className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Solved
                      </Badge>
                    )}
                    <Badge variant="secondary" size="sm" className="font-mono">
                      {activeChallenge.points} pts
                    </Badge>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Challenge Instructions
                  </span>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {activeChallenge.instructions || activeChallenge.description}
                  </div>
                </div>

                {/* Reference Material */}
                {activeChallenge.referenceMaterial && (
                  <div className="p-3 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 text-xs space-y-1">
                    <span className="font-bold text-blue-900 dark:text-blue-200 block text-[11px] flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Reference & Documentation
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeChallenge.referenceMaterial}
                    </p>
                  </div>
                )}

                {/* SUBMISSION INPUT BASED ON CHALLENGE TYPE */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Your Submission
                  </span>

                  {/* 1. MULTIPLE CHOICE */}
                  {activeChallenge.challengeType === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-2">
                      {(activeChallenge.options || []).map((opt: any) => {
                        const isChecked = currentChAnswer === opt.id;
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'border-[#1a73e8] bg-blue-50/40 dark:bg-blue-950/20 font-medium'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`mcq-${activeChallenge.id}`}
                              checked={isChecked}
                              onChange={() =>
                                setAnswers({
                                  ...answers,
                                  [activeChallenge.id]: opt.id,
                                })
                              }
                              className="w-4 h-4 text-blue-600 mt-0.5"
                            />
                            <span className="text-slate-800 dark:text-slate-200">{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. SHORT ANSWER */}
                  {activeChallenge.challengeType === 'SHORT_ANSWER' && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter the required value, command, or parameter..."
                        value={currentChAnswer || ''}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [activeChallenge.id]: e.target.value,
                          })
                        }
                        className="text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* 3. CODE KNOWLEDGE */}
                  {activeChallenge.challengeType === 'CODE_KNOWLEDGE' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Language: {activeChallenge.codeLanguage || 'bash'}</span>
                        <button
                          type="button"
                          onClick={() => setAnswers({ ...answers, [activeChallenge.id]: '' })}
                          className="hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Clear
                        </button>
                      </div>
                      <textarea
                        rows={5}
                        placeholder={activeChallenge.codePlaceholder || '# Enter your command or script here...'}
                        value={currentChAnswer || ''}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [activeChallenge.id]: e.target.value,
                          })
                        }
                        className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 text-emerald-400 p-3 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30"
                      />
                    </div>
                  )}

                  {/* 4. GUIDED TASK */}
                  {activeChallenge.challengeType === 'GUIDED_TASK' && (
                    <div className="space-y-3">
                      {(activeChallenge.checklist || []).map((item: any) => {
                        const checkedIds = currentChAnswer?.checkedTaskIds || [];
                        const isChecked = checkedIds.includes(item.id);

                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newChecked = e.target.checked
                                  ? [...checkedIds, item.id]
                                  : checkedIds.filter((id: string) => id !== item.id);
                                setAnswers({
                                  ...answers,
                                  [activeChallenge.id]: {
                                    ...currentChAnswer,
                                    checkedTaskIds: newChecked,
                                  },
                                });
                              }}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className={isChecked ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}>
                              {item.text}
                            </span>
                          </label>
                        );
                      })}

                      <Input
                        label="Verification Confirmation Code (If applicable)"
                        placeholder="Enter completion flag or confirmation code..."
                        value={currentChAnswer?.confirmationCode || ''}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [activeChallenge.id]: {
                              ...currentChAnswer,
                              confirmationCode: e.target.value,
                            },
                          })
                        }
                        className="text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* 5. RESEARCH REFLECTION */}
                  {activeChallenge.challengeType === 'RESEARCH_REFLECTION' && (
                    <div className="space-y-2">
                      <textarea
                        rows={6}
                        placeholder="Provide your analysis and architectural rationale here..."
                        value={currentChAnswer || ''}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [activeChallenge.id]: e.target.value,
                          })
                        }
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>
                          Word Count: {String(currentChAnswer || '').trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                        <span>Minimum Required: {activeChallenge.minWordCount || 40} words</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-time Feedback Banner */}
                {currentChFeedback && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      currentChFeedback.passed
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                        : 'border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {currentChFeedback.passed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Milestone Passed (+{currentChFeedback.pointsAwarded} pts)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>Evaluation Check Failed</span>
                        </>
                      )}
                    </div>
                    <p className="leading-relaxed">{currentChFeedback.feedback}</p>
                    {currentChFeedback.penaltyPercent > 0 && (
                      <span className="text-[10px] text-amber-600 block">
                        Score adjusted for hint usage (-{currentChFeedback.penaltyPercent}% penalty)
                      </span>
                    )}
                  </div>
                )}

                {/* Hints Accordion */}
                {Array.isArray(activeChallenge.hints) && activeChallenge.hints.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Hints & Guidance
                    </span>
                    <div className="space-y-2">
                      {activeChallenge.hints.map((hint: any) => {
                        const isUnlocked = currentChHints.includes(hint.id);
                        return (
                          <div
                            key={hint.id}
                            className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs bg-slate-50/40 dark:bg-slate-900/20"
                          >
                            {isUnlocked ? (
                              <div className="space-y-1 text-slate-800 dark:text-slate-200">
                                <span className="font-bold text-[10px] text-amber-600 block">
                                  HINT {hint.orderIndex} (-{hint.penaltyPercent}% deduction):
                                </span>
                                <p>{hint.content}</p>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Hint #{hint.orderIndex} available</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 text-amber-600 hover:text-amber-700"
                                  onClick={() => handleUnlockHint(activeChallenge.id, hint.id, hint.penaltyPercent)}
                                >
                                  Unlock Hint (-{hint.penaltyPercent}%)
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Explanation (Revealed if passed) */}
                {currentChFeedback?.unlockedExplanation && (
                  <div className="p-3.5 rounded-lg border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 text-xs space-y-1">
                    <span className="font-bold text-blue-900 dark:text-blue-200 block text-[11px]">
                      Educational Explanation & Best Practices
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {currentChFeedback.unlockedExplanation}
                    </p>
                  </div>
                )}

                {/* Bottom Navigation & Submit Button */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activeChallengeIdx === 0}
                    onClick={() => setActiveChallengeIdx(activeChallengeIdx - 1)}
                    className="text-xs"
                  >
                    ← Previous Milestone
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      isLoading={isSubmitting}
                      onClick={handleSubmit}
                      className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]"
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      Submit Answer
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={activeChallengeIdx === challenges.length - 1}
                      onClick={() => setActiveChallengeIdx(activeChallengeIdx + 1)}
                      className="text-xs"
                    >
                      Next Milestone →
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
