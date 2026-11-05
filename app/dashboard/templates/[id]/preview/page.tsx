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
import { evaluateChallengeSubmission } from '@/lib/challenges/evaluator';
import {
  ArrowLeft,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  Clock,
  Sparkles,
  ChevronRight,
  Code2,
  FileText,
  ListChecks,
  CheckSquare,
  RefreshCw,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

export default function LabTemplatePreviewPage() {
  const params = useParams();
  const templateId = (params?.id as string) || '';
  const { info, success, error } = useToast();

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [instructorMode, setInstructorMode] = useState(true); // Default to instructor mode for preview

  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [unlockedHints, setUnlockedHints] = useState<Record<string, string[]>>({});
  const [evalResults, setEvalResults] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchPreview() {
      if (!templateId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/templates/${templateId}/preview?instructorMode=true`);
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json.data);
        } else {
          error('Error', json.error?.message || 'Failed to load preview');
        }
      } catch {
        error('Error', 'Network error while loading preview');
      } finally {
        setIsLoading(false);
      }
    }
    fetchPreview();
  }, [templateId]);

  const activeChallenge = data?.challenges?.[activeChallengeIdx];

  const handleTestEvaluation = (chId: string) => {
    if (!activeChallenge) return;

    const answer = studentAnswers[chId];
    const usedHints = unlockedHints[chId] || [];

    const result = evaluateChallengeSubmission(activeChallenge, answer, usedHints);
    setEvalResults({ ...evalResults, [chId]: result });

    if (result.passed) {
      success('Passed!', `${result.feedback} (+${result.pointsAwarded} pts)`);
    } else {
      info('Not quite', result.feedback);
    }
  };

  const handleUnlockHint = (chId: string, hintId: string) => {
    const current = unlockedHints[chId] || [];
    if (!current.includes(hintId)) {
      setUnlockedHints({ ...unlockedHints, [chId]: [...current, hintId] });
      info('Hint Revealed', 'Hint unlocked. A penalty will be applied to this challenge.');
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8]" />
          <p className="text-xs text-slate-400">Loading student simulator...</p>
        </div>
      </AppShell>
    );
  }

  if (!data || !data.template) {
    return (
      <AppShell>
        <div className="py-20 text-center space-y-3 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold">Template Not Found</h2>
          <Link href="/dashboard/templates">
            <Button size="sm" variant="outline" className="text-xs">
              Back to Library
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const { template, challenges } = data;
  const currentChAnswer = activeChallenge ? studentAnswers[activeChallenge.id] : null;
  const currentChResult = activeChallenge ? evalResults[activeChallenge.id] : null;
  const currentChHints = activeChallenge ? unlockedHints[activeChallenge.id] || [] : [];

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Simulator Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Organiser Preview Simulator
                </span>
                <Badge variant="outline" size="sm">
                  Sandbox Simulation
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Test and verify the exact student user interface and evaluation logic without writing student records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={instructorMode}
                onChange={(e) => setInstructorMode(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
              Instructor Solution Inspector
            </label>
            <Link href={`/dashboard/templates/${template.id}/edit`}>
              <Button size="sm" variant="outline" className="text-xs">
                Exit Preview
              </Button>
            </Link>
          </div>
        </div>

        {/* Lab Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="domain" size="sm">
                {template.domain}
              </Badge>
              <Badge variant="outline" size="sm">
                {template.difficulty}
              </Badge>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" /> {template.estimatedDuration}m
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {template.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-3xl">
              {template.shortDescription || template.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Score</span>
              <span className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                {Object.values(evalResults).reduce((sum: number, r: any) => sum + (r.pointsAwarded || 0), 0)} /{' '}
                {challenges.reduce((sum: number, c: any) => sum + (c.points || 0), 0)} pts
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Challenge Navigator & Curriculum Context */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Lab Milestones ({challenges.length})
              </span>
              <div className="space-y-1.5">
                {challenges.map((ch: any, i: number) => {
                  const isCurrent = i === activeChallengeIdx;
                  const result = evalResults[ch.id];
                  const isPassed = result?.passed;

                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChallengeIdx(i)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'border-[#1a73e8] bg-blue-50/50 dark:bg-blue-950/30 font-semibold'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isPassed ? '✓' : i + 1}
                        </span>
                        <span className="truncate text-slate-900 dark:text-slate-100">{ch.title}</span>
                      </div>
                      <Badge variant="secondary" size="sm" className="shrink-0 text-[10px]">
                        {ch.points} pts
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Learning Objectives Preview */}
            {Array.isArray(template.learningObjectives) && template.learningObjectives.length > 0 && (
              <Card className="p-4 space-y-2 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                  Learning Objectives
                </span>
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                  {template.learningObjectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Right Column: Challenge Workspace & Submission */}
          <div className="lg:col-span-8 space-y-4">
            {activeChallenge ? (
              <Card className="p-6 space-y-5">
                {/* Challenge Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        Milestone {activeChallengeIdx + 1}
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
                  <Badge variant="secondary" size="sm" className="font-mono">
                    {activeChallenge.points} Points
                  </Badge>
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Instructions</span>
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {activeChallenge.instructions || activeChallenge.description}
                  </div>
                </div>

                {/* INTERACTIVE INPUT COMPONENT */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Your Solution</span>

                  {/* 1. MCQ Radio/Checkbox */}
                  {activeChallenge.challengeType === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-2">
                      {(activeChallenge.solutionData?.options || []).map((opt: any) => {
                        const isChecked = currentChAnswer === opt.id || (Array.isArray(currentChAnswer) && currentChAnswer.includes(opt.id));
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
                                setStudentAnswers({
                                  ...studentAnswers,
                                  [activeChallenge.id]: opt.id,
                                })
                              }
                              className="w-4 h-4 text-blue-600 mt-0.5"
                            />
                            <div className="flex-1">
                              <span className="text-slate-800 dark:text-slate-200">{opt.text}</span>
                              {instructorMode && opt.isCorrect && (
                                <Badge variant="success" size="sm" className="ml-2 text-[10px]">
                                  Correct Answer
                                </Badge>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Short Answer Input */}
                  {activeChallenge.challengeType === 'SHORT_ANSWER' && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Type your answer here..."
                        value={currentChAnswer || ''}
                        onChange={(e) =>
                          setStudentAnswers({
                            ...studentAnswers,
                            [activeChallenge.id]: e.target.value,
                          })
                        }
                        className="text-xs font-mono"
                      />
                      {instructorMode && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                          Accepted answers: {JSON.stringify(activeChallenge.solutionData?.acceptedAnswers || [])}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Code Knowledge Monospace Area */}
                  {activeChallenge.challengeType === 'CODE_KNOWLEDGE' && (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        placeholder="# Write your command or code here..."
                        value={currentChAnswer || ''}
                        onChange={(e) =>
                          setStudentAnswers({
                            ...studentAnswers,
                            [activeChallenge.id]: e.target.value,
                          })
                        }
                        className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 text-emerald-400 p-3 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30"
                      />
                      {instructorMode && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                          Expected pattern ({activeChallenge.solutionData?.matchMode}):{' '}
                          <code>{activeChallenge.solutionData?.expectedCode}</code>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Guided Task Checklist */}
                  {activeChallenge.challengeType === 'GUIDED_TASK' && (
                    <div className="space-y-3">
                      {(activeChallenge.solutionData?.checklist || []).map((item: any) => {
                        const checkedIds = currentChAnswer?.checkedTaskIds || [];
                        const isChecked = checkedIds.includes(item.id);

                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newChecked = e.target.checked
                                  ? [...checkedIds, item.id]
                                  : checkedIds.filter((id: string) => id !== item.id);
                                setStudentAnswers({
                                  ...studentAnswers,
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

                      {activeChallenge.solutionData?.confirmationCode && (
                        <Input
                          label="Verification Confirmation Code"
                          placeholder="Enter confirmation token..."
                          value={currentChAnswer?.confirmationCode || ''}
                          onChange={(e) =>
                            setStudentAnswers({
                              ...studentAnswers,
                              [activeChallenge.id]: {
                                ...currentChAnswer,
                                confirmationCode: e.target.value,
                              },
                            })
                          }
                          className="text-xs font-mono"
                        />
                      )}
                    </div>
                  )}

                  {/* 5. Research Reflection */}
                  {activeChallenge.challengeType === 'RESEARCH_REFLECTION' && (
                    <div className="space-y-2">
                      <textarea
                        rows={5}
                        placeholder="Type your reflection analysis here..."
                        value={currentChAnswer || ''}
                        onChange={(e) =>
                          setStudentAnswers({
                            ...studentAnswers,
                            [activeChallenge.id]: e.target.value,
                          })
                        }
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>
                          Word Count: {String(currentChAnswer || '').trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                        <span>Minimum Required: {activeChallenge.solutionData?.minWordCount || 40} words</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Evaluation Feedback Alert */}
                {currentChResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      currentChResult.passed
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                        : 'border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {currentChResult.passed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Evaluation Passed (+{currentChResult.pointsAwarded} Points)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>Verification Unsuccessful</span>
                        </>
                      )}
                    </div>
                    <p className="leading-relaxed">{currentChResult.feedback}</p>
                    {currentChResult.totalPenaltyPercent > 0 && (
                      <span className="text-[10px] text-amber-600 block">
                        Hint penalty applied: -{currentChResult.totalPenaltyPercent}%
                      </span>
                    )}
                  </div>
                )}

                {/* Hints Accordion */}
                {Array.isArray(activeChallenge.hints) && activeChallenge.hints.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Hints</span>
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
                                  HINT {hint.orderIndex} (-{hint.penaltyPercent}% penalty):
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
                                  onClick={() => handleUnlockHint(activeChallenge.id, hint.id)}
                                >
                                  Unlock (-{hint.penaltyPercent}% score)
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Post-Completion Explanation */}
                {(instructorMode || currentChResult?.passed) && activeChallenge.explanation && (
                  <div className="p-3.5 rounded-lg border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 text-xs space-y-1">
                    <span className="font-bold text-blue-900 dark:text-blue-200 block text-[11px]">
                      Explanation & Technical Breakdown
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{activeChallenge.explanation}</p>
                  </div>
                )}

                {/* Action Bar */}
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
                      onClick={() => handleTestEvaluation(activeChallenge.id)}
                      className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]"
                    >
                      Verify Solution
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
