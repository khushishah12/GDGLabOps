'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DeviceRecommendationBanner } from '@/components/ui/device-recommendation-banner';
import { useToast } from '@/lib/toast-context';
import {
  Terminal as TerminalIcon,
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
  Clock,
  Laptop,
  Smartphone,
  Server,
  StopCircle,
  RefreshCw,
  CornerDownLeft,
  BookOpen,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error' | 'success';
  text: string;
}

export default function InteractiveLabSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.sessionId as string) || '';
  const { success, error, info } = useToast();

  // Session State
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'OFFLINE' | 'TERMINATED'>('CONNECTING');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [isTerminating, setIsTerminating] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);

  // Mobile View Switcher (Guide vs Terminal)
  const [mobileActiveTab, setMobileActiveTab] = useState<'guide' | 'terminal'>('terminal');

  // Terminal I/O State
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'GDG LabOps Cloud Execution Gateway v2.0',
    },
    {
      id: 'init-2',
      type: 'system',
      text: 'Establishing secure cryptographic connection ticket with container runner...',
    },
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Session Data
  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingSession(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setSessionData(json.data);
        if (json.data.expiresAt) {
          const diffSec = Math.max(0, Math.floor((new Date(json.data.expiresAt).getTime() - Date.now()) / 1000));
          setRemainingSeconds(diffSec);
        }
      } else {
        error('Session Error', json.error?.message || 'Could not load lab session');
      }
    } catch {
      error('Network Error', 'Failed to communicate with control plane');
    } finally {
      setIsLoadingSession(false);
    }
  }, [sessionId, error]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // 2. Countdown Timer & Heartbeat Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setConnectionStatus('TERMINATED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(async () => {
      if (sessionId && connectionStatus !== 'TERMINATED') {
        try {
          await fetch(`/api/sessions/${sessionId}/heartbeat`, { method: 'POST' });
        } catch {
          // Silent heartbeat catch
        }
      }
    }, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(heartbeat);
    };
  }, [sessionId, connectionStatus]);

  // 3. Connect WebSocket to Execution Plane Gateway
  useEffect(() => {
    if (!sessionData) return;

    if (sessionData.status === 'TERMINATED' || sessionData.status === 'EXPIRED') {
      setConnectionStatus('TERMINATED');
      return;
    }

    let wsUrl = sessionData.accessUrl;
    // If accessUrl is relative, construct absolute ws URL
    if (wsUrl && wsUrl.startsWith('/')) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.host}${wsUrl}`;
    } else if (!wsUrl && sessionData.connectionTicket) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.hostname}:8080/ws/terminal?ticket=${sessionData.connectionTicket}`;
    }

    if (!wsUrl) {
      setConnectionStatus('OFFLINE');
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('CONNECTED');
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `ws-${Date.now()}`,
            type: 'success',
            text: `[CONNECTED] Cloud container attached: ${sessionData.environmentProfile || 'ubuntu-fundamentals'} (non-root sandbox)`,
          },
        ]);
      };

      ws.onmessage = (event) => {
        const text = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}-${Math.random()}`,
            type: 'output',
            text,
          },
        ]);
      };

      ws.onerror = () => {
        setConnectionStatus('OFFLINE');
      };

      ws.onclose = () => {
        if (connectionStatus === 'CONNECTED') {
          setConnectionStatus('OFFLINE');
        }
      };

      return () => {
        ws.close();
      };
    } catch {
      setConnectionStatus('OFFLINE');
    }
  }, [sessionData]);

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Send Command to Container or Simulated Fallback
  const handleCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    // Append to local terminal history
    setHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);
    setCommandInput('');

    // If WebSocket is open, send to cloud container directly
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + '\n');
      return;
    }

    // Otherwise, execute in local interactive sandbox fallback
    setTerminalLines((prev) => [
      ...prev,
      {
        id: `in-${Date.now()}`,
        type: 'input',
        text: `labuser@gdg-sandbox:~$ ${cmd}`,
      },
    ]);

    const lower = cmd.toLowerCase();
    if (lower === 'clear') {
      setTerminalLines([]);
    } else if (lower === 'help') {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: 'Available commands: ls, cat, whoami, uname, ps, uptime, python3, node, git, clear, exit',
        },
      ]);
    } else if (lower === 'whoami') {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: 'labuser (uid=1000 gid=1000) [no-root]',
        },
      ]);
    } else if (lower === 'uname' || lower.startsWith('uname')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: 'Linux gdg-cloud-node 5.15.0 #GDG-SANDBOX SMP x86_64',
        },
      ]);
    } else if (lower === 'ls') {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: 'instructions.txt  workspace  README.md',
        },
      ]);
    } else if (lower.startsWith('cat')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: '=== GDG LabOps Cloud Environment ===\nProceed with the milestones in your curriculum guide.',
        },
      ]);
    } else {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: `${cmd}: executed in unprivileged sandbox`,
        },
      ]);
    }
  };

  // Terminate Session Handler
  const handleTerminateSession = async () => {
    setIsTerminating(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        success('Session Ended', 'Your cloud environment was safely stopped and cleaned.');
        setShowTerminateConfirm(false);
        router.push(sessionData?.workshopId ? `/student/workshops/${sessionData.workshopId}` : '/student/workshops');
      } else {
        error('Error', json.error?.message || 'Failed to terminate environment.');
      }
    } catch {
      error('Error', 'Network error during termination.');
    } finally {
      setIsTerminating(false);
    }
  };

  const minutesRemaining = Math.floor(remainingSeconds / 60);
  const secondsRemaining = remainingSeconds % 60;
  const timeFormatted = `${String(minutesRemaining).padStart(2, '0')}:${String(secondsRemaining).padStart(2, '0')}`;

  const template = sessionData?.labTemplate;
  const workshop = sessionData?.workshop;

  return (
    <AppShell>
      <div className="space-y-4 max-w-7xl mx-auto pb-12">
        {/* Mobile Device Banner */}
        <DeviceRecommendationBanner />

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <Link
              href={workshop ? `/student/workshops/${workshop.id}` : '/student/workshops'}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">
                  {template?.name || 'Interactive Cloud Lab'}
                </span>
                <Badge variant="outline" size="sm" className="bg-slate-800 text-slate-300 border-slate-700 font-mono text-[10px]">
                  {sessionData?.environmentProfile || 'ubuntu-fundamentals'}
                </Badge>
              </div>
              <span className="text-[11px] text-slate-400 block">
                {workshop?.title || 'GDG Workshop'}
              </span>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-3">
            {/* Connection Indicator */}
            <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
              {connectionStatus === 'CONNECTED' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 font-mono text-[11px]">RUNNING</span>
                </>
              ) : connectionStatus === 'CONNECTING' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-amber-300 font-mono text-[11px]">CONNECTING</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-400 font-mono text-[11px]">OFFLINE</span>
                </>
              )}
            </div>

            {/* Countdown Lease Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeFormatted}</span>
            </div>

            {/* Stop Environment Button */}
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowTerminateConfirm(true)}
              className="text-xs h-7 px-2.5 flex items-center gap-1 font-semibold"
            >
              <StopCircle className="w-3.5 h-3.5" /> Stop Environment
            </Button>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setMobileActiveTab('guide')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mobileActiveTab === 'guide'
                ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Instructions & Milestones
          </button>
          <button
            onClick={() => setMobileActiveTab('terminal')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mobileActiveTab === 'terminal'
                ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Cloud Terminal
          </button>
        </div>

        {/* Workspace Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel: Lab Guide & Instructions */}
          <div
            className={`lg:col-span-5 space-y-4 ${
              mobileActiveTab === 'guide' ? 'block' : 'hidden lg:block'
            }`}
          >
            <Card className="h-[620px] flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#1a73e8]" />
                  Curriculum & Lab Instructions
                </CardTitle>
                <CardDescription className="text-xs">
                  Perform exercises inside the terminal on the right.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {template ? (
                  <>
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider block">
                        Overview
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {template.description || template.shortDescription}
                      </p>
                    </div>

                    {template.learningObjectives && (
                      <div className="space-y-1.5 pt-2">
                        <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider block">
                          Learning Objectives
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1">
                          {Array.isArray(template.learningObjectives) ? (
                            template.learningObjectives.map((obj: string, i: number) => (
                              <li key={i}>{obj}</li>
                            ))
                          ) : (
                            <li>Complete the designated commands and configuration steps.</li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 space-y-1">
                      <span className="font-bold text-blue-900 dark:text-blue-200 block text-[11px] flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Container Security Sandbox
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                        This session is running in an unprivileged, isolated Linux cgroup. Root commands (sudo) are disabled to protect host integrity.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400">Loading lab guidelines...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Interactive Cloud Terminal */}
          <div
            className={`lg:col-span-7 ${
              mobileActiveTab === 'terminal' ? 'block' : 'hidden lg:block'
            }`}
          >
            <Card className="h-[620px] flex flex-col bg-slate-950 border-slate-800 text-slate-100 overflow-hidden shadow-xl">
              {/* Terminal Window Chrome */}
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  </div>
                  <span className="font-mono text-xs text-slate-400 ml-2">
                    bash - labuser@gdg-sandbox:~
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTerminalLines([])}
                    title="Clear Screen"
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Terminal Output Buffer */}
              <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 selection:bg-blue-600 selection:text-white">
                {terminalLines.map((line) => {
                  let color = 'text-slate-300';
                  if (line.type === 'system') color = 'text-blue-400 font-semibold';
                  if (line.type === 'input') color = 'text-slate-100 font-bold';
                  if (line.type === 'error') color = 'text-rose-400';
                  if (line.type === 'success') color = 'text-emerald-400';

                  return (
                    <div key={line.id} className={`whitespace-pre-wrap ${color}`}>
                      {line.text}
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>

              {/* Terminal Input Line */}
              <form
                onSubmit={handleCommandSubmit}
                className="bg-slate-900/90 border-t border-slate-800 px-3 py-2 flex items-center gap-2"
              >
                <span className="font-mono text-xs text-emerald-400 font-bold select-none">
                  labuser@gdg-sandbox:~$
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Type command and press Enter..."
                  autoFocus
                  className="flex-1 bg-transparent font-mono text-xs text-slate-100 focus:outline-none"
                />
                <button
                  type="submit"
                  className="text-slate-400 hover:text-slate-200 p-1 rounded"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </button>
              </form>
            </Card>
          </div>
        </div>

        {/* Terminate Confirmation Modal */}
        <ConfirmDialog
          open={showTerminateConfirm}
          onOpenChange={(open) => setShowTerminateConfirm(open)}
          title="Stop Cloud Environment"
          description="Are you sure you want to stop your environment? Any unsaved changes in temporary files will be cleaned up and your lease will end."
          confirmLabel={isTerminating ? 'Stopping...' : 'Stop Environment'}
          cancelLabel="Keep Working"
          isDestructive={true}
          isLoading={isTerminating}
          onConfirm={handleTerminateSession}
        />
      </div>
    </AppShell>
  );
}
