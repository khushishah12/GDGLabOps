'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DeviceRecommendationBanner } from '@/components/ui/device-recommendation-banner';
import { useToast } from '@/lib/toast-context';
import { mockChallenges, mockWorkshops } from '@/lib/mock-data';
import { Challenge } from '@/types';
import {
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  Laptop,
  Smartphone,
  Server,
  CornerDownLeft,
  BookOpen,
} from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error' | 'success';
  text: string;
}

export default function InteractiveLabSessionPage() {
  const params = useParams();
  const { success, error, info } = useToast();

  const workshop = mockWorkshops[0];
  const [challenges, setChallenges] = useState<Challenge[]>(mockChallenges);
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentChallenge = challenges[currentIdx] || challenges[0];

  // Mobile View Switcher (Guide vs Terminal)
  const [mobileActiveTab, setMobileActiveTab] = useState<'guide' | 'terminal'>('terminal');

  // Solved challenges state
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const isCurrentSolved = solvedIds.includes(currentChallenge.id);

  // Simulated Container Terminal State
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'GDG LabOps Sandboxed Container Environment v1.2',
    },
    {
      id: 'init-2',
      type: 'system',
      text: 'Allocated cgroup: memory=512m, cpu=0.5, pids_max=64, network=isolated-bridge',
    },
    {
      id: 'init-3',
      type: 'system',
      text: 'Remote Cloud Execution: Host worker-01.labops.internal (Linux 6.8)',
    },
    {
      id: 'init-4',
      type: 'system',
      text: 'Type "help" for simulated commands, or use the mobile quick keys below.',
    },
  ]);

  // Simulated container filesystem flags
  const [simulatedState, setSimulatedState] = useState({
    fileGroupChanged: false,
    filePermsFixed: false,
    rogueProcessKilled: false,
    firewallConfigured: false,
    healthScriptCreated: false,
  });

  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [selectedHintToReveal, setSelectedHintToReveal] = useState<{ id: string; content: string; penalty: number } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const handleCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    // Append user input line
    const userLine: TerminalLine = {
      id: `in-${Date.now()}`,
      type: 'input',
      text: `student@gdg-sandbox:~$ ${cmd}`,
    };

    setHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);
    setCommandInput('');

    // Process simulated commands
    const newLines: TerminalLine[] = [userLine];
    const lower = cmd.toLowerCase();

    if (lower === 'clear') {
      setTerminalLines([]);
      return;
    } else if (lower === 'help') {
      newLines.push({
        id: `out-${Date.now()}`,
        type: 'output',
        text: 'Commands: ls, cat, chmod, chgrp, ps, kill, iptables, id, clear, evaluate, help',
      });
    } else if (lower.startsWith('ls')) {
      if (lower.includes('/etc/labops')) {
        const group = simulatedState.fileGroupChanged ? 'gdg-lab' : 'root';
        const perms = simulatedState.filePermsFixed ? '-rw-r-----' : '-rw-------';
        newLines.push({
          id: `out-${Date.now()}`,
          type: 'output',
          text: `total 4\n${perms} 1 root ${group} 842 Nov 5 14:02 config.json`,
        });
      } else {
        newLines.push({
          id: `out-${Date.now()}`,
          type: 'output',
          text: 'Desktop  Documents  Downloads  labops_workspace  README.md',
        });
      }
    } else if (lower.startsWith('cat /etc/labops/config.json')) {
      if (!simulatedState.fileGroupChanged && !simulatedState.filePermsFixed) {
        newLines.push({
          id: `err-${Date.now()}`,
          type: 'error',
          text: 'cat: /etc/labops/config.json: Permission denied',
        });
      } else {
        newLines.push({
          id: `out-${Date.now()}`,
          type: 'output',
          text: '{\n  "service": "labops-auth-daemon",\n  "port": 9000,\n  "secret": "GDG{c0nt41n3r_s4ndb0x_succ3ss}"\n}',
        });
      }
    } else if (lower.includes('chgrp gdg-lab') || lower.includes('chgrp -r gdg-lab')) {
      setSimulatedState((prev) => ({ ...prev, fileGroupChanged: true }));
      newLines.push({
        id: `out-${Date.now()}`,
        type: 'output',
        text: 'Group ownership changed to gdg-lab.',
      });
    } else if (lower.includes('chmod 640') || lower.includes('chmod 644') || lower.includes('chmod g+r')) {
      setSimulatedState((prev) => ({ ...prev, filePermsFixed: true }));
      newLines.push({
        id: `out-${Date.now()}`,
        type: 'output',
        text: 'File permissions successfully updated.',
      });
    } else if (lower === 'ps aux' || lower === 'ps -ef') {
      const rogue = simulatedState.rogueProcessKilled
        ? ''
        : 'developer 4128  0.4  0.2  14200  4120 pts/0 S+ 14:10  0:00 ./rogue_daemon\n';
      newLines.push({
        id: `out-${Date.now()}`,
        type: 'output',
        text: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1   4200  2100 ?        Ss   14:00   0:00 /sbin/init\n${rogue}developer 4290  0.0  0.1   6100  3200 pts/0    R+   14:15   0:00 ps aux`,
      });
    } else if (lower.startsWith('kill 4128') || lower.startsWith('pkill rogue_daemon')) {
      setSimulatedState((prev) => ({ ...prev, rogueProcessKilled: true }));
      newLines.push({
        id: `out-${Date.now()}`,
        type: 'output',
        text: '[1]+  Terminated              ./rogue_daemon',
      });
    } else if (lower.startsWith('iptables')) {
      setSimulatedState((prev) => ({ ...prev, firewallConfigured: true }));
      newLines.push({
        id: `out-${Date.now()}`,
        type: 'output',
        text: 'iptables: rule added to INPUT table chain.',
      });
    } else if (lower === 'evaluate') {
      runEvaluation();
      return;
    } else {
      newLines.push({
        id: `out-${Date.now()}`,
        type: 'output',
        text: `Command executed: "${cmd}". Type "evaluate" or click Run Auto-Evaluation to grade.`,
      });
    }

    setTerminalLines((prev) => [...prev, ...newLines]);
  };

  // Virtual mobile key helper for touch screens
  const handleVirtualKey = (key: string) => {
    if (key === 'Ctrl+C') {
      setTerminalLines((prev) => [
        ...prev,
        { id: `c-${Date.now()}`, type: 'input', text: `student@gdg-sandbox:~$ ${commandInput}^C` },
      ]);
      setCommandInput('');
      return;
    }
    if (key === 'clear') {
      setTerminalLines([]);
      return;
    }
    if (key === 'Tab') {
      if (!commandInput) {
        setCommandInput('ls -la /etc/labops/');
      } else if (commandInput.startsWith('ls')) {
        setCommandInput('ls -la /etc/labops/config.json');
      } else {
        setCommandInput((prev) => prev + ' ');
      }
      return;
    }
    if (key === 'Enter') {
      handleCommandSubmit();
      return;
    }
    setCommandInput((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + key);
    inputRef.current?.focus();
  };

  const runEvaluation = () => {
    setIsEvaluating(true);
    setTerminalLines((prev) => [
      ...prev,
      {
        id: `eval-${Date.now()}`,
        type: 'system',
        text: `[+] Initializing automated evaluation agent on ${currentChallenge.title}...`,
      },
    ]);

    setTimeout(() => {
      setIsEvaluating(false);

      let passed = false;
      if (currentIdx === 0) {
        passed = simulatedState.fileGroupChanged && simulatedState.filePermsFixed;
      } else if (currentIdx === 1) {
        passed = simulatedState.rogueProcessKilled;
      } else if (currentIdx === 2) {
        passed = simulatedState.firewallConfigured;
      } else {
        passed = true;
      }

      if (passed) {
        if (!solvedIds.includes(currentChallenge.id)) {
          setSolvedIds((prev) => [...prev, currentChallenge.id]);
        }
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `eval-pass-${Date.now()}`,
            type: 'success',
            text: `[✓] EVALUATION PASSED! Exit code 0. Earned +${currentChallenge.points} points.`,
          },
        ]);
        success('Challenge Solved! 🎉', `+${currentChallenge.points} points awarded.`);
      } else {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `eval-fail-${Date.now()}`,
            type: 'error',
            text: `[✗] EVALUATION FAILED: Requirements not satisfied. Check permissions or inspect hints.`,
          },
        ]);
        error('Evaluation Incomplete', 'Conditions not met. Review the instructions and try again.');
      }
    }, 1000);
  };

  const handleRevealHint = () => {
    if (selectedHintToReveal) {
      setRevealedHints((prev) => [...prev, selectedHintToReveal.id]);
      info(
        'Hint Unlocked',
        `Deducted ${selectedHintToReveal.penalty}% potential points for this task.`
      );
      setSelectedHintToReveal(null);
    }
  };

  const handleResetContainer = () => {
    setSimulatedState({
      fileGroupChanged: false,
      filePermsFixed: false,
      rogueProcessKilled: false,
      firewallConfigured: false,
      healthScriptCreated: false,
    });
    setTerminalLines([
      {
        id: `reset-${Date.now()}`,
        type: 'system',
        text: '[!] Container sandbox reset to clean template state.',
      },
    ]);
    info('Sandbox Reset', 'Filesystem re-initialized from pristine Docker template.');
  };

  return (
    <AppShell>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Device Recommendation Advisory Banner */}
        <DeviceRecommendationBanner />

        {/* Top Breadcrumb & Milestone Stepper */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/student/overview">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Workshop Lab Session
                </span>
                <span className="text-[10px] rounded bg-blue-500/10 px-1.5 py-0.2 text-[#4285F4] font-semibold hidden sm:inline">
                  Remote Cloud Sandbox
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {workshop.title}
              </h2>
            </div>
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {challenges.map((c, idx) => {
              const isSolved = solvedIds.includes(c.id);
              const isCurrent = idx === currentIdx;

              return (
                <button
                  key={c.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-[#1a73e8] text-white shadow-sm'
                      : isSolved
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {isSolved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/10 dark:bg-white/10">
                      {idx + 1}
                    </span>
                  )}
                  <span>Task {idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Remote Execution Platform Pill & Reset Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 px-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 shrink-0 text-[#4285F4]" />
            <span className="text-[11px]">
              <strong>Remote Cloud Sandbox:</strong> Running on isolated Linux cloud VM. Accessible across Windows, macOS, Linux, ChromeOS, iOS & Android without local installs.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetContainer}
            className="text-[11px] h-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 self-end sm:self-auto"
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Sandbox
          </Button>
        </div>

        {/* Mobile View Switcher Tabs (Only visible on screens < lg) */}
        <div className="flex lg:hidden rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setMobileActiveTab('guide')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mobileActiveTab === 'guide'
                ? 'bg-white dark:bg-slate-900 text-[#4285F4] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Challenge Guide</span>
          </button>
          <button
            onClick={() => setMobileActiveTab('terminal')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mobileActiveTab === 'terminal'
                ? 'bg-white dark:bg-slate-900 text-[#4285F4] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal Console</span>
          </button>
        </div>

        {/* Main Work Area: Left (Challenge Details & Hints) | Right (Interactive Terminal) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: Challenge Guide */}
          <div
            className={`lg:col-span-5 space-y-4 ${
              mobileActiveTab === 'terminal' ? 'hidden lg:block' : 'block'
            }`}
          >
            <Card className="border-t-4 border-t-[#4285F4]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="domain" size="sm">
                    {currentChallenge.difficulty} Level
                  </Badge>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    +{currentChallenge.points} Points
                  </span>
                </div>
                <CardTitle className="text-base pt-1">
                  {currentChallenge.title}
                </CardTitle>
                <CardDescription className="text-xs pt-1 leading-relaxed">
                  {currentChallenge.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                {/* Instructions Box */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    Step-by-Step Instructions
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                    {currentChallenge.instructions}
                  </div>
                </div>

                {/* Progressive Hints Accordion */}
                {currentChallenge.hints && currentChallenge.hints.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Available Hints ({currentChallenge.hints.length})
                    </span>

                    {currentChallenge.hints.map((hint, hIdx) => {
                      const isRevealed = revealedHints.includes(hint.id);
                      return (
                        <div
                          key={hint.id}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                              Hint #{hIdx + 1}
                            </span>
                            {!isRevealed ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                                onClick={() =>
                                  setSelectedHintToReveal({
                                    id: hint.id,
                                    content: hint.content,
                                    penalty: hint.penaltyPercent,
                                  })
                                }
                              >
                                Reveal (-{hint.penaltyPercent}%)
                              </Button>
                            ) : (
                              <Badge variant="warning" size="sm">
                                Revealed (-{hint.penaltyPercent}%)
                              </Badge>
                            )}
                          </div>

                          {isRevealed && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-mono pt-1">
                              {hint.content}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full text-xs font-semibold"
                  size="md"
                  isLoading={isEvaluating}
                  onClick={runEvaluation}
                  leftIcon={<Play className="w-4 h-4" />}
                >
                  Run Auto-Evaluation
                </Button>

                {isCurrentSolved && currentIdx < challenges.length - 1 && (
                  <Button
                    variant="outline"
                    className="w-full text-xs text-emerald-600 border-emerald-500/30"
                    size="sm"
                    onClick={() => setCurrentIdx(currentIdx + 1)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Proceed to Next Challenge
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Right Panel: Interactive Terminal */}
          <div
            className={`lg:col-span-7 ${
              mobileActiveTab === 'guide' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col h-[520px] sm:h-[560px]">
              {/* Terminal Window Header Bar */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 ml-1">
                    bash — student@gdg-sandbox:~
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                    TTY 80x24
                  </span>
                </div>
              </div>

              {/* Terminal Logs & Stream Area */}
              <div
                className="flex-1 p-3 sm:p-4 overflow-y-auto font-mono text-[11px] sm:text-xs space-y-1.5 selection:bg-[#4285F4]/40"
                onClick={() => inputRef.current?.focus()}
              >
                {terminalLines.map((line) => (
                  <div
                    key={line.id}
                    className={
                      line.type === 'input'
                        ? 'text-slate-200'
                        : line.type === 'system'
                        ? 'text-slate-500'
                        : line.type === 'error'
                        ? 'text-rose-400 font-semibold'
                        : line.type === 'success'
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-300'
                    }
                  >
                    {line.text}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Mobile Virtual Modifier Accessory Bar (Essential for touch devices/tablets) */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-900/90 border-t border-slate-800 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-mono text-slate-500 uppercase px-1 select-none hidden sm:inline">
                  Keys:
                </span>
                {[
                  { label: 'Tab', val: 'Tab' },
                  { label: 'Ctrl+C', val: 'Ctrl+C' },
                  { label: 'clear', val: 'clear' },
                  { label: '|', val: '|' },
                  { label: '/', val: '/' },
                  { label: 'sudo', val: 'sudo' },
                  { label: 'ls -la', val: 'ls -la' },
                  { label: 'chmod 640', val: 'sudo chmod 640 /etc/labops/config.json' },
                  { label: 'chgrp', val: 'sudo chgrp gdg-lab /etc/labops/config.json' },
                ].map((k) => (
                  <button
                    key={k.label}
                    type="button"
                    onClick={() => handleVirtualKey(k.val)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono text-[11px] shrink-0 border border-slate-700/60 shadow-sm transition-colors"
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              {/* Command Input Bar */}
              <form
                onSubmit={handleCommandSubmit}
                className="flex items-center gap-2 p-2 sm:p-2.5 bg-slate-950 border-t border-slate-800"
              >
                <span className="font-mono text-xs text-[#4285F4] pl-2 select-none shrink-0">
                  $&gt;
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Type shell command..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="flex-1 min-w-0 bg-transparent font-mono text-xs text-white focus:outline-none placeholder:text-slate-600"
                />
                <Button size="sm" type="submit" variant="secondary" className="h-7 text-[11px] px-2.5 shrink-0">
                  <span className="hidden sm:inline">Execute</span>
                  <CornerDownLeft className="w-3.5 h-3.5 sm:hidden" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Hint Reveal Confirmation Dialog */}
        <Dialog open={!!selectedHintToReveal} onOpenChange={() => setSelectedHintToReveal(null)}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              <DialogTitle>Reveal Hint #{selectedHintToReveal?.id}?</DialogTitle>
            </div>
            <DialogDescription>
              Unlocking this hint will deduct <strong>{selectedHintToReveal?.penalty}%</strong> of the potential points for this challenge on the live leaderboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedHintToReveal(null)}>
              Keep Trying Without Hint
            </Button>
            <Button size="sm" onClick={handleRevealHint} className="bg-amber-600 hover:bg-amber-700">
              Confirm & Reveal (-{selectedHintToReveal?.penalty}%)
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </AppShell>
  );
}
