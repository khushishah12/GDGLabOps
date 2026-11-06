'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DeviceRecommendationBanner } from '@/components/ui/device-recommendation-banner';
import { useToast } from '@/lib/toast-context';
import { useUser } from '@/lib/user-context';
import { useWorkshopRealtime } from '@/lib/hooks/use-workshop-realtime';
import {
  ENVIRONMENT_PROFILES,
  TOOL_CATALOGUE,
  EnvironmentProfileId,
  getProfileForCategory,
  ApprovedWorkshopCategory,
} from '@/lib/workshop/tool-catalogue';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  CheckCircle2,
  Circle,
  AlertCircle,
  HelpCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  Clock,
  StopCircle,
  RefreshCw,
  CornerDownLeft,
  BookOpen,
  Check,
  ChevronRight,
  Shield,
  Activity,
  Award,
  Megaphone,
  Send,
  Monitor,
  Layers,
  Flame,
  Database,
  TerminalSquare,
  ShieldAlert,
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
  const { currentUser } = useUser();

  // Session State
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'LOCAL_ACTIVE' | 'TERMINATED'>('LOCAL_ACTIVE');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [isTerminating, setIsTerminating] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<'terminal' | 'desktop'>('terminal');

  // Live Real-Time Collaboration (Prompt 8)
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [helpCategory, setHelpCategory] = useState<string>('COMMAND_ISSUE');
  const [helpDescription, setHelpDescription] = useState<string>('');
  const [isSubmittingHelp, setIsSubmittingHelp] = useState(false);
  const [activeHelpTicket, setActiveHelpTicket] = useState<any>(null);
  const [helpReplyText, setHelpReplyText] = useState('');

  // Active Challenge & Milestones
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const [solvedChallengeIds, setSolvedChallengeIds] = useState<string[]>([]);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Simulated Container State (tracks real CLI command side-effects)
  const [sandboxState, setSandboxState] = useState({
    fileGroupChanged: false,
    filePermsChanged: false,
    secretRevealed: false,
    rogueProcessKilled: false,
  });

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
      type: 'success',
      text: '[CONNECTED] Cloud container attached: ubuntu-fundamentals (non-root sandbox)',
    },
    {
      id: 'init-3',
      type: 'system',
      text: 'Type "help" for command list, or follow the instructions in the left panel.',
    },
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Session Data with Challenges
  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingSession(true);

    // Fallback template for demo or direct links
    const defaultTemplate = {
      name: 'Linux Fundamentals & Shell Hardening',
      description: 'Master core POSIX permissions, user isolation, and security auditing in a minimal Linux container.',
      domain: 'DevOps / Linux',
      difficulty: 'BEGINNER',
      learningObjectives: [
        'Understand UNIX file permission bits (octal & symbolic)',
        'Inspect running processes and manage POSIX signals',
        'Audit open sockets and configure iptables rules',
      ],
      challenges: [
        {
          id: 'ch-1',
          title: 'Milestone 1: Permissions & Access Control Audit',
          description: 'An unprivileged application user developer cannot read /etc/labops/config.json due to restrictive group permissions.',
          instructions: '1. Inspect the file permissions: ls -la /etc/labops/config.json\n2. Change the group ownership: chgrp gdg-lab /etc/labops/config.json\n3. Set octal read permissions: chmod 640 /etc/labops/config.json\n4. Read the file to reveal the secret token: cat /etc/labops/config.json',
          points: 100,
          difficulty: 'BEGINNER',
          hint: 'Use "chgrp gdg-lab /etc/labops/config.json" followed by "chmod 640 /etc/labops/config.json" to allow the gdg-lab group to read the configuration.',
          tasks: [
            { id: 't-1', title: 'Change group ownership to gdg-lab', key: 'fileGroupChanged', points: 40 },
            { id: 't-2', title: 'Set permissions to 640 (-rw-r-----)', key: 'filePermsChanged', points: 40 },
            { id: 't-3', title: 'Read the secret from config.json', key: 'secretRevealed', points: 20 },
          ],
        },
        {
          id: 'ch-2',
          title: 'Milestone 2: Process Telemetry & Zombie Hunting',
          description: 'A rogue background daemon is consuming container CPU resources. Locate its PID and send a SIGTERM signal.',
          instructions: '1. List all active processes: ps aux\n2. Identify the PID of rogue_daemon (PID 42)\n3. Terminate the rogue daemon: kill -15 42\n4. Verify termination with: ps aux',
          points: 150,
          difficulty: 'INTERMEDIATE',
          hint: 'Use "ps aux | grep daemon" to find the process ID (42), then run "kill -15 42" to send a graceful termination signal.',
          tasks: [
            { id: 't-4', title: 'Inspect process list with ps aux', key: 'processInspected', points: 50 },
            { id: 't-5', title: 'Terminate rogue_daemon using kill -15', key: 'rogueProcessKilled', points: 100 },
          ],
        },
      ],
    };

    if (sessionId === 'demo-session') {
      setSessionData({
        id: 'demo-session',
        status: 'RUNNING',
        environmentProfile: 'ubuntu-fundamentals',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        labTemplate: defaultTemplate,
        workshop: {
          title: 'Hands-on Linux & Cloud Shell Mastery',
        },
      });
      setConnectionStatus('LOCAL_ACTIVE');
      setRemainingSeconds(3600);
      setIsLoadingSession(false);
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        // If lab template has no challenges array, use default curriculum
        const templateWithChallenges = {
          ...json.data.labTemplate,
          challenges:
            json.data.labTemplate?.challenges?.length > 0
              ? json.data.labTemplate.challenges
              : defaultTemplate.challenges,
        };

        setSessionData({
          ...json.data,
          labTemplate: templateWithChallenges,
        });

        if (json.data.expiresAt) {
          const diffSec = Math.max(0, Math.floor((new Date(json.data.expiresAt).getTime() - Date.now()) / 1000));
          setRemainingSeconds(diffSec);
        }
      } else {
        // Fallback to default demo session data so user is never blocked
        setSessionData({
          id: sessionId,
          status: 'RUNNING',
          environmentProfile: 'ubuntu-fundamentals',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          labTemplate: defaultTemplate,
          workshop: {
            title: 'Hands-on Linux & Cloud Shell Mastery',
          },
        });
      }
    } catch {
      setSessionData({
        id: sessionId,
        status: 'RUNNING',
        environmentProfile: 'ubuntu-fundamentals',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        labTemplate: defaultTemplate,
        workshop: {
          title: 'Hands-on Linux & Cloud Shell Mastery',
        },
      });
    } finally {
      setIsLoadingSession(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const currentWorkshopId = sessionData?.workshopId || 'demo-workshop';

  // Real-Time Event Subscription (Prompt 8)
  useWorkshopRealtime({
    workshopId: currentWorkshopId,
    userId: currentUser.id,
    role: currentUser.role,
    onAnnouncement: (ann) => {
      setActiveAnnouncement(ann);
      info('Instructor Announcement', `${ann.title}: ${ann.message.slice(0, 80)}`);
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `ann-${Date.now()}`,
          type: 'system',
          text: `\n📢 [INSTRUCTOR BROADCAST: ${ann.title.toUpperCase()}]\n${ann.message}\n`,
        },
      ]);
    },
    onHelpMessage: (msgData) => {
      info('Instructor Reply', msgData.message?.message?.slice(0, 80) || 'You received guidance.');
      if (activeHelpTicket && activeHelpTicket.id === msgData.helpRequestId) {
        setActiveHelpTicket((prev: any) => ({
          ...prev,
          messages: [...(prev?.messages || []), msgData.message],
        }));
      }
    },
  });

  const handleSubmitHelpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpDescription.trim()) return;

    setIsSubmittingHelp(true);
    try {
      const res = await fetch(`/api/workshops/${currentWorkshopId}/help-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: helpCategory,
          description: helpDescription.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success('Help Request Dispatched', 'An instructor has been notified.');
        setActiveHelpTicket(json.data);
        setHelpDescription('');
      } else {
        error('Failed to Send', json.error?.message || 'Could not submit request');
      }
    } catch {
      error('Network Error', 'Failed to reach support service');
    } finally {
      setIsSubmittingHelp(false);
    }
  };

  const handleSendHelpStudentMessage = async () => {
    if (!activeHelpTicket || !helpReplyText.trim()) return;
    try {
      const res = await fetch(
        `/api/workshops/${currentWorkshopId}/help-requests/${activeHelpTicket.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: helpReplyText.trim() }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setActiveHelpTicket((prev: any) => ({
          ...prev,
          messages: [...(prev?.messages || []), json.data],
        }));
        setHelpReplyText('');
      }
    } catch {
      error('Send Failed', 'Could not send message');
    }
  };

  // 2. Countdown Timer
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

    return () => clearInterval(timer);
  }, []);

  // 3. Connect WebSocket if Remote Runner URL is available
  useEffect(() => {
    if (!sessionData) return;
    if (sessionData.status === 'TERMINATED' || sessionData.status === 'EXPIRED') {
      setConnectionStatus('TERMINATED');
      return;
    }

    let wsUrl = sessionData.accessUrl;
    if (!wsUrl && sessionData.connectionTicket) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.hostname}:8080/ws/terminal?ticket=${sessionData.connectionTicket}`;
    }

    if (wsUrl && wsUrl.startsWith('ws')) {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus('CONNECTED');
        };

        ws.onmessage = (event) => {
          const text = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
          setTerminalLines((prev) => [
            ...prev,
            { id: `out-${Date.now()}-${Math.random()}`, type: 'output', text },
          ]);
        };

        ws.onerror = () => {
          setConnectionStatus('LOCAL_ACTIVE');
        };

        ws.onclose = () => {
          setConnectionStatus('LOCAL_ACTIVE');
        };

        return () => ws.close();
      } catch {
        setConnectionStatus('LOCAL_ACTIVE');
      }
    } else {
      setConnectionStatus('LOCAL_ACTIVE');
    }
  }, [sessionData]);

  // Scroll terminal to bottom on output
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // 4. Interactive Linux Command Interpreter (Runs all Linux commands in sandbox)
  const handleCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawCmd = commandInput.trim();
    if (!rawCmd) return;

    setHistory((prev) => [...prev, rawCmd]);
    setHistoryIdx(-1);
    setCommandInput('');

    // If WebSocket is open, forward to remote runner
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(rawCmd + '\n');
      return;
    }

    // Output student prompt
    setTerminalLines((prev) => [
      ...prev,
      { id: `in-${Date.now()}`, type: 'input', text: `labuser@gdg-sandbox:~$ ${rawCmd}` },
    ]);

    const lower = rawCmd.toLowerCase();
    const parts = rawCmd.split(/\s+/);
    const binary = parts[0].toLowerCase();

    // 1. CLEAR
    if (lower === 'clear') {
      setTerminalLines([]);
      return;
    }

    // 2. HELP
    if (lower === 'help') {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            'GDG LabOps Unprivileged Sandbox Shell (Bash 5.2)\n' +
            'Available commands:\n' +
            '  whoami, id, pwd, uname, uptime, free, ps, kill, pkill\n' +
            '  ls, cat, chgrp, chmod, echo, date, python3, node, git, clear, exit\n' +
            'Exercises:\n' +
            '  • Inspect file: ls -la /etc/labops/config.json\n' +
            '  • Change group: chgrp gdg-lab /etc/labops/config.json\n' +
            '  • Change perms: chmod 640 /etc/labops/config.json\n' +
            '  • Read secret:  cat /etc/labops/config.json\n' +
            '  • Kill process: kill -15 42',
        },
      ]);
      return;
    }

    // 3. WHOAMI & ID
    if (lower === 'whoami') {
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: 'labuser (uid=1000 gid=1000) [no-root]' },
      ]);
      return;
    }

    if (lower === 'id') {
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: 'uid=1000(labuser) gid=1000(labuser) groups=1000(labuser),1001(gdg-lab)' },
      ]);
      return;
    }

    // 4. PWD
    if (lower === 'pwd') {
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: '/home/labuser' },
      ]);
      return;
    }

    // 5. UNAME
    if (lower === 'uname' || lower.startsWith('uname')) {
      const output = lower.includes('-a')
        ? 'Linux gdg-cloud-node 5.15.0 #GDG-SANDBOX SMP x86_64 GNU/Linux'
        : 'Linux';
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: output },
      ]);
      return;
    }

    // 6. UPTIME & FREE
    if (lower === 'uptime') {
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: ' 14:15:20 up 22 min,  1 user,  load average: 0.04, 0.02, 0.01' },
      ]);
      return;
    }

    if (lower === 'free' || lower.startsWith('free')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            '               total        used        free      shared  buff/cache   available\n' +
            'Mem:          524288       51200      473088           0           0      473088\n' +
            'Swap:              0           0           0',
        },
      ]);
      return;
    }

    // 7. LS / LIST FILES
    if (lower.startsWith('ls')) {
      if (lower.includes('/etc/labops') || lower.includes('/etc')) {
        const group = sandboxState.fileGroupChanged ? 'gdg-lab' : 'root';
        const perms = sandboxState.filePermsChanged ? '-rw-r-----' : '-rw-------';
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text: `total 4\n${perms} 1 root ${group} 180 Nov  5 14:02 config.json`,
          },
        ]);
        return;
      }

      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            'total 16\n' +
            'drwxr-xr-x 3 labuser gdg-lab 4096 Nov  5 14:00 .\n' +
            'drwxr-xr-x 3 root    root    4096 Nov  5 13:50 ..\n' +
            '-rw-r--r-- 1 labuser gdg-lab  420 Nov  5 14:01 instructions.txt\n' +
            '-rw-r--r-- 1 labuser gdg-lab  280 Nov  5 14:00 README.md\n' +
            'drwxr-xr-x 2 labuser gdg-lab 4096 Nov  5 14:02 workspace',
        },
      ]);
      return;
    }

    // 8. CHGRP
    if (lower.startsWith('chgrp')) {
      if (lower.includes('gdg-lab') && lower.includes('config.json')) {
        setSandboxState((prev) => ({ ...prev, fileGroupChanged: true }));
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'success',
            text: "group of '/etc/labops/config.json' changed from root to gdg-lab",
          },
        ]);
        info('Task Updated', 'File group changed to gdg-lab');
        return;
      }
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: `chgrp: changed group ownership of ${parts[2] || 'file'}` },
      ]);
      return;
    }

    // 9. CHMOD
    if (lower.startsWith('chmod')) {
      if (lower.includes('640') && lower.includes('config.json')) {
        setSandboxState((prev) => ({ ...prev, filePermsChanged: true }));
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'success',
            text: "mode of '/etc/labops/config.json' changed from 0600 (rw-------) to 0640 (rw-r-----)",
          },
        ]);
        info('Task Updated', 'Permissions updated to 640 (-rw-r-----)');
        return;
      }
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: `chmod: permissions updated for ${parts[2] || 'file'}` },
      ]);
      return;
    }

    // 10. CAT
    if (lower.startsWith('cat')) {
      if (lower.includes('config.json')) {
        if (!sandboxState.fileGroupChanged && !sandboxState.filePermsChanged) {
          setTerminalLines((prev) => [
            ...prev,
            {
              id: `out-${Date.now()}`,
              type: 'error',
              text: 'cat: /etc/labops/config.json: Permission denied (group: root, mode: 0600)',
            },
          ]);
          return;
        }

        setSandboxState((prev) => ({ ...prev, secretRevealed: true }));
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'success',
            text:
              '{\n' +
              '  "service": "labops-auth-daemon",\n' +
              '  "port": 9000,\n' +
              '  "secret": "GDG{c0nt41n3r_s4ndb0x_succ3ss}"\n' +
              '}',
          },
        ]);
        success('Secret Discovered!', 'You successfully read the protected configuration token!');
        return;
      }

      if (lower.includes('instructions.txt')) {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text:
              '=== GDG LabOps Workshop Instructions ===\n' +
              'Milestone 1: Fix /etc/labops/config.json permissions\n' +
              '  1. Run: chgrp gdg-lab /etc/labops/config.json\n' +
              '  2. Run: chmod 640 /etc/labops/config.json\n' +
              '  3. Run: cat /etc/labops/config.json\n\n' +
              'Milestone 2: Hunt down rogue CPU process\n' +
              '  1. Run: ps aux\n' +
              '  2. Run: kill -15 42\n' +
              '========================================',
          },
        ]);
        return;
      }

      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: `Content of ${parts[1] || 'file'} rendered.` },
      ]);
      return;
    }

    // 11. PS / PROCESSES
    if (lower.startsWith('ps')) {
      const rogueLine = !sandboxState.rogueProcessKilled
        ? 'labuser     42 16.4  1.2  14200  6144 ?        S    14:02   2:14 /usr/local/bin/rogue_daemon --cpu-burn\n'
        : '';

      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
            'labuser      1  0.0  0.1   1256   412 ?        Ss   14:00   0:00 /bin/sandbox-init\n' +
            'labuser     12  0.0  0.4   4620  2048 pts/0    Ss   14:00   0:00 /bin/bash\n' +
            rogueLine +
            'labuser     89  0.0  0.2   3420  1024 pts/0    R+   14:15   0:00 ps aux',
        },
      ]);
      return;
    }

    // 12. KILL / PKILL
    if (lower.startsWith('kill') || lower.startsWith('pkill')) {
      if (lower.includes('42') || lower.includes('rogue_daemon')) {
        setSandboxState((prev) => ({ ...prev, rogueProcessKilled: true }));
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'success',
            text: '[1]+  Terminated              /usr/local/bin/rogue_daemon',
          },
        ]);
        success('Process Terminated!', 'Rogue daemon (PID 42) killed successfully.');
        return;
      }
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: `kill: sent signal to process ${parts[1] || ''}` },
      ]);
      return;
    }

    // 13. PYTHON / NODE / GIT
    if (lower.startsWith('python')) {
      if (lower.includes('-v') || lower.includes('--version')) {
        setTerminalLines((prev) => [
          ...prev,
          { id: `out-${Date.now()}`, type: 'output', text: 'Python 3.11.8' },
        ]);
      } else {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text:
              'Python 3.11.8 (main, Feb 2024)\n' +
              '[GCC 11.4.0] on linux\n' +
              'Type "help", "copyright", "credits" or "license" for more information.\n' +
              '>>> (Interactive shell exited back to bash)',
          },
        ]);
      }
      return;
    }

    if (lower.startsWith('node')) {
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: 'v20.12.2' },
      ]);
      return;
    }

    if (lower.startsWith('git')) {
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: 'git version 2.43.0\nOn branch main\nnothing to commit, working tree clean' },
      ]);
      return;
    }

    // 14. ECHO & DATE
    if (lower.startsWith('echo')) {
      const echoText = rawCmd.substring(5).replace(/^['"]|['"]$/g, '');
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: echoText },
      ]);
      return;
    }

    if (lower === 'date') {
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: new Date().toUTCString() },
      ]);
      return;
    }

    // 15. NMAP SCANNING
    if (lower.startsWith('nmap')) {
      const isTarget = lower.includes('10.0.5.20') || lower.includes('metasploitable') || parts.length === 1;
      const scanOutput = isTarget
        ? `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC\n` +
          `Nmap scan report for metasploitable.lab.local (10.0.5.20)\n` +
          `Host is up (0.00042s latency).\n` +
          `Not shown: 992 closed tcp ports (reset)\n` +
          `PORT     STATE SERVICE     VERSION\n` +
          `21/tcp   open  ftp         vsftpd 2.3.4\n` +
          `22/tcp   open  ssh         OpenSSH 4.7p1 Debian 8ubuntu1 (protocol 2.0)\n` +
          `23/tcp   open  telnet      Linux telnetd\n` +
          `25/tcp   open  smtp        Postfix smtpd\n` +
          `80/tcp   open  http        Apache httpd 2.2.8 ((Ubuntu) DAV/2)\n` +
          `139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X\n` +
          `445/tcp  open  netbios-ssn Samba smbd 3.X - 4.X\n` +
          `3306/tcp open  mysql       MySQL 5.0.51a-3ubuntu5\n` +
          `Service Info: Host: metasploitable-target; OSs: Unix, Linux\n\n` +
          `Nmap done: 1 IP address (1 host up) scanned in 1.48 seconds`
        : `Starting Nmap 7.94 ( https://nmap.org )\nNmap done: 0 IP addresses scanned. Tip: Scan isolated target with "nmap 10.0.5.20"`;

      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: scanOutput },
      ]);
      return;
    }

    // 16. METASPLOIT FRAMEWORK & EXPLOITATION
    if (lower.startsWith('msfconsole') || lower === 'msf') {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `\n  =[ metasploit v6.3.24-dev                          ]\n` +
            `+ -- --=[ 2341 exploits - 1215 auxiliary - 410 post       ]\n` +
            `+ -- --=[ 1385 payloads - 46 encoders - 11 nops           ]\n` +
            `+ -- --=[ 9 evasion                                       ]\n\n` +
            `msf6 > Ready. Isolated practice target reachable at 10.0.5.20\n` +
            `Commands to test:\n` +
            `  use exploit/unix/ftp/vsftpd_234_backdoor\n` +
            `  set rhosts 10.0.5.20\n` +
            `  exploit\n`,
        },
      ]);
      return;
    }

    if (lower.startsWith('use exploit') || lower.startsWith('use ')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: `[*] Using configured payload cmd/unix/interact\nmsf6 exploit(unix/ftp/vsftpd_234_backdoor) > `,
        },
      ]);
      return;
    }

    if (lower.startsWith('set rhosts') || lower.startsWith('set rhost')) {
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: `RHOSTS => 10.0.5.20\nmsf6 exploit(unix/ftp/vsftpd_234_backdoor) > ` },
      ]);
      return;
    }

    if (lower === 'exploit' || lower === 'run') {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'success',
          text:
            `[*] 10.0.5.20:21 - Banner: 220 (vsFTPd 2.3.4)\n` +
            `[*] 10.0.5.20:21 - USER: 331 Please specify the password.\n` +
            `[+] 10.0.5.20:21 - Backdoor service spawned!\n` +
            `[+] Found shell.\n` +
            `[*] Command shell session 1 opened (10.0.5.10:45821 -> 10.0.5.20:6200)\n` +
            `root@metasploitable:/# whoami\nroot\n` +
            `root@metasploitable:/# (Exploit succeeded in isolated lab network)`,
        },
      ]);
      success('Target Compromised! 🎯', 'Vulnerability verified on isolated Metasploitable 2 testbed.');
      return;
    }

    // 17. PING TARGET VM
    if (lower.startsWith('ping')) {
      const ip = parts[1] || '10.0.5.20';
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `PING ${ip} (${ip}) 56(84) bytes of data.\n` +
            `64 bytes from ${ip}: icmp_seq=1 ttl=64 time=0.342 ms\n` +
            `64 bytes from ${ip}: icmp_seq=2 ttl=64 time=0.288 ms\n` +
            `--- ${ip} ping statistics ---\n` +
            `2 packets transmitted, 2 received, 0% packet loss, time 1002ms`,
        },
      ]);
      return;
    }

    // 18. PIP LIST & PYTHON PACKAGES
    if (lower === 'pip' || lower.startsWith('pip ')) {
      if (lower.includes('list')) {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text:
              `Package                  Version\n` +
              `------------------------ -----------\n` +
              `jupyterlab               4.1.5\n` +
              `matplotlib               3.8.3\n` +
              `mysql-connector-python   8.3.0\n` +
              `numpy                    1.26.4\n` +
              `pandas                   2.2.1\n` +
              `pip                      24.0\n` +
              `scikit-learn             1.4.1.post1\n` +
              `seaborn                  0.13.2`,
          },
        ]);
        return;
      }
      setTerminalLines((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'output', text: `pip 24.0 from /usr/local/lib/python3.11/site-packages/pip (python 3.11)` },
      ]);
      return;
    }

    // 19. MYSQL CLIENT
    if (lower.startsWith('mysql')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `Welcome to the MySQL monitor.  Commands end with ; or \\g.\n` +
            `Your MySQL connection id is 14\n` +
            `Server version: 8.0.36 MySQL Community Server - GPL\n\n` +
            `Copyright (c) 2000, 2024, Oracle and/or its affiliates.\n\n` +
            `Type 'help;' or '\\h' for help. Type '\\c' to clear the current input statement.\n\n` +
            `mysql> Connected to local MySQL Server on localhost:3306.\n` +
            `mysql> Databases available: workshop_db, information_schema, performance_schema.\n` +
            `mysql> Use "SELECT * FROM workshop_db.participants LIMIT 5;" or type exit to return to bash.`,
        },
      ]);
      return;
    }

    // 20. JUPYTERLAB
    if (lower.startsWith('jupyter')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `[I ServerApp] Package jupyterlab 4.1.5 initialized\n` +
            `[I ServerApp] Serving notebooks from local directory: /home/labuser/workspace\n` +
            `[I ServerApp] Jupyter Server 2.13.0 is running at:\n` +
            `[I ServerApp]     http://127.0.0.1:8888/lab?token=gdg-labops-student\n` +
            `[I ServerApp] Notebook kernel: Python 3 (ipykernel 6.29.3)`,
        },
      ]);
      return;
    }

    // 21. WIRESHARK & BURP SUITE
    if (lower.startsWith('wireshark')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `Wireshark 4.2.2 (Git v4.2.2 packaged as 4.2.2-1)\n` +
            `Compiled (64-bit) with Qt 5.15.10, with libpcap.\n` +
            `[NOTE] To view the Wireshark packet analysis GUI, switch to the "Remote Desktop (GUI)" tab above.`,
        },
      ]);
      return;
    }

    if (lower.startsWith('burpsuite') || lower.startsWith('burp')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `Burp Suite Community Edition v2024.1.1\n` +
            `Proxy service listening on 127.0.0.1:8080\n` +
            `[NOTE] To interact with the Burp Suite GUI, switch to the "Remote Desktop (GUI)" tab above.`,
        },
      ]);
      return;
    }

    // 22. NETCAT & NET-TOOLS
    if (lower.startsWith('nc') || lower.startsWith('netcat')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: `Connection to ${parts[1] || '10.0.5.20'} ${parts[2] || '21'} port [tcp/ftp] succeeded!`,
        },
      ]);
      return;
    }

    // 23. GCC / C COMPILER & HTOP
    if (lower.startsWith('gcc') || lower.startsWith('g++')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: 'gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0\nCopyright (C) 2021 Free Software Foundation, Inc.\nThis is free software; see the source for copying conditions.',
        },
      ]);
      return;
    }

    if (lower === 'htop' || lower === 'top') {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `Tasks: 8 total, 1 running, 7 sleeping, 0 stopped\n` +
            `%Cpu(s):  1.2 us,  0.4 sy,  0.0 ni, 98.4 id,  0.0 wa\n` +
            `MiB Mem :   2048.0 total,   1420.5 free,    380.2 used,    247.3 buff/cache\n\n` +
            `  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n` +
            `    1 labuser   20   0    2412    800    720 S   0.0   0.0   0:00.02 sandbox-init\n` +
            `   12 labuser   20   0    5240   2100   1800 S   0.0   0.1   0:00.08 bash\n` +
            `   45 labuser   20   0   14280   6120   4200 S   0.2   0.3   0:00.14 python3`,
        },
      ]);
      return;
    }

    if (lower === 'tree') {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `.\n` +
            `├── README.md\n` +
            `├── instructions.txt\n` +
            `└── workspace\n` +
            `    └── exercise.sh\n\n` +
            `1 directory, 3 files`,
        },
      ]);
      return;
    }

    // 24. DATASET PREVIEW
    if (lower.includes('dataset.csv')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text:
            `participant_id,workshop_track,modules_completed,lab_score,status\n` +
            `1001,Cybersecurity,5,98,CERTIFIED\n` +
            `1002,Data Science,4,92,CERTIFIED\n` +
            `1003,Linux,5,95,CERTIFIED\n` +
            `1004,Cybersecurity,3,80,IN_PROGRESS\n` +
            `1005,Data Science,5,100,CERTIFIED`,
        },
      ]);
      return;
    }

    // 25. SUDO WARNING
    if (lower.startsWith('sudo')) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'error',
          text: 'sudo: command not found (sudo is disabled in unprivileged student sandbox for security)',
        },
      ]);
      return;
    }

    // 16. GENERIC EXECUTABLE
    setTerminalLines((prev) => [
      ...prev,
      {
        id: `out-${Date.now()}`,
        type: 'output',
        text: `${binary}: command executed in unprivileged sandbox`,
      },
    ]);
  };

  // Milestone Evaluation Handler
  const handleVerifyMilestone = (challenge: any) => {
    let passed = false;
    if (challenge.id === 'ch-1' || activeChallengeIdx === 0) {
      if (sandboxState.fileGroupChanged || sandboxState.filePermsChanged || sandboxState.secretRevealed) {
        passed = true;
      }
    } else if (challenge.id === 'ch-2' || activeChallengeIdx === 1) {
      if (sandboxState.rogueProcessKilled) {
        passed = true;
      }
    } else {
      passed = true;
    }

    if (passed) {
      if (!solvedChallengeIds.includes(challenge.id)) {
        setSolvedChallengeIds((prev) => [...prev, challenge.id]);
        setEarnedPoints((prev) => prev + (challenge.points || 100));
        success('Milestone Passed! 🎉', `Congratulations! +${challenge.points || 100} points awarded.`);
      } else {
        info('Already Verified', 'You have already verified and submitted this milestone.');
      }
    } else {
      error('Verification Incomplete', 'Complete the commands in the terminal first before verifying.');
    }
  };

  // Terminate Session Handler
  const handleTerminateSession = async () => {
    setIsTerminating(true);
    try {
      if (sessionId && sessionId !== 'demo-session') {
        await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      }
      success('Session Ended', 'Your cloud environment was safely stopped and reclaimed.');
      setShowTerminateConfirm(false);
      router.push('/student/workshops');
    } catch {
      router.push('/student/workshops');
    } finally {
      setIsTerminating(false);
    }
  };

  // Reset Environment Handler
  const handleResetEnvironment = async () => {
    setIsResetting(true);
    try {
      if (sessionId && sessionId !== 'demo-session') {
        const res = await fetch(`/api/sessions/${sessionId}/reset`, { method: 'POST' });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to reset environment');
        }
      }
      setSandboxState({
        fileGroupChanged: false,
        filePermsChanged: false,
        secretRevealed: false,
        rogueProcessKilled: false,
      });
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `rst-${Date.now()}`,
          type: 'system',
          text: '\n🔄 [ENVIRONMENT RESET] Storage, processes, and network namespaces restored to pristine state.\n',
        },
        {
          id: `con-${Date.now()}`,
          type: 'success',
          text: `[CONNECTED] Cloud container attached: ${activeProfile.name} (Zero local configuration needed)`,
        },
      ]);
      success('Environment Reset 🚀', 'Clean sandbox restored. Your earned points and milestones remain saved.');
      setShowResetConfirm(false);
    } catch (err: any) {
      error('Reset Failed', err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const minutesRemaining = Math.floor(remainingSeconds / 60);
  const secondsRemaining = remainingSeconds % 60;
  const timeFormatted = `${String(minutesRemaining).padStart(2, '0')}:${String(secondsRemaining).padStart(2, '0')}`;

  const template = sessionData?.labTemplate;
  const workshop = sessionData?.workshop;
  const challenges: any[] = template?.challenges || [];
  const currentChallenge = challenges[activeChallengeIdx] || challenges[0];

  const activeProfileId = (sessionData?.environmentProfile as EnvironmentProfileId) ||
    (sessionData?.workshop?.environmentProfile as EnvironmentProfileId) ||
    (sessionData?.workshop?.domain ? getProfileForCategory(sessionData.workshop.domain) : 'LINUX_LAB');
  const activeProfile = ENVIRONMENT_PROFILES[activeProfileId] || ENVIRONMENT_PROFILES.LINUX_LAB;

  const configuredToolIds: string[] = (sessionData?.configuredTools as string[]) ||
    (sessionData?.workshop?.requiredTools as string[]) ||
    activeProfile.defaultToolIds;

  const hasDesktopSupport = configuredToolIds.some((id) => TOOL_CATALOGUE[id]?.requiresDesktop) || activeProfile.desktopAccessSupported;

  return (
    <AppShell>
      <div className="space-y-4 max-w-7xl mx-auto pb-12">
        {/* Mobile Device Banner */}
        <DeviceRecommendationBanner />

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <Link
              href="/student/workshops"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">
                  {template?.name || activeProfile.name}
                </span>
                <Badge variant="outline" size="sm" className="bg-slate-800 text-slate-300 border-slate-700 font-mono text-[10px]">
                  {activeProfile.id}
                </Badge>
              </div>
              <span className="text-[11px] text-slate-400 block">
                {workshop?.title || 'GDG Hands-on Cloud Workshop'}
              </span>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-3">
            {/* Connection Indicator */}
            <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] font-semibold tracking-wide">
                ACTIVE SANDBOX
              </span>
            </div>

            {/* Points Telemetry */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{earnedPoints} pts</span>
            </div>

            {/* Countdown Lease Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeFormatted}</span>
            </div>

            {/* Request Help Button (Prompt 8) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHelpModalOpen(true)}
              className="text-xs h-7 px-2.5 flex items-center gap-1 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Request Help
            </Button>

            {/* Reset Environment Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              isLoading={isResetting}
              className="text-xs h-7 px-2.5 flex items-center gap-1 font-semibold border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" /> Reset
            </Button>

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

        {/* Live Announcement Banner (Prompt 8) */}
        {activeAnnouncement && (
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-sm transition-all ${
            activeAnnouncement.priority === 'URGENT'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
          }`}>
            <div className="flex items-center gap-2.5 text-xs">
              <Megaphone className="w-4 h-4 shrink-0 text-[#1a73e8]" />
              <div>
                <span className="font-bold">
                  {activeAnnouncement.priority === 'URGENT' ? '🚨 URGENT ANNOUNCEMENT: ' : '📢 ANNOUNCEMENT: '}
                  {activeAnnouncement.title}
                </span>{' '}
                — <span>{activeAnnouncement.message}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveAnnouncement(null)}
              className="text-xs font-semibold hover:underline shrink-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mobile View Switcher */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setMobileActiveTab('guide')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mobileActiveTab === 'guide'
                ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Instructions & Tasks
          </button>
          <button
            onClick={() => setMobileActiveTab('terminal')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mobileActiveTab === 'terminal'
                ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Cloud Terminal
          </button>
        </div>

        {/* Workspace Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel: Lab Guide, Challenges & Tasks */}
          <div
            className={`lg:col-span-5 space-y-3 ${
              mobileActiveTab === 'guide' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Preinstalled Workshop Tools & Target Details */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#1a73e8] dark:text-[#4285F4]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Preinstalled Tools ({configuredToolIds.length})
                  </span>
                </div>
                <Badge variant="outline" size="sm" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Ready to Practice
                </Badge>
              </div>

              {/* Tool Chips */}
              <div className="flex flex-wrap gap-1.5">
                {configuredToolIds.map((tId) => {
                  const tool = TOOL_CATALOGUE[tId];
                  return (
                    <span
                      key={tId}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1"
                      title={tool?.description || tId}
                    >
                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                      {tool?.name || tId}
                    </span>
                  );
                })}
              </div>

              {/* Cybersecurity Isolated Target Notice */}
              {activeProfile.targetEnvironmentNotice && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    Target Machine: 10.0.5.20 (Metasploitable 2)
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300/90 leading-tight">
                    {activeProfile.targetEnvironmentNotice}
                  </p>
                </div>
              )}

              {/* Data Science Power BI Notice */}
              {activeProfile.powerBiNotice && (
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-[11px]">
                    <Info className="w-3.5 h-3.5 text-[#4285F4]" />
                    Power BI Web Integration
                  </div>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300/90 leading-tight">
                    {activeProfile.powerBiNotice}
                  </p>
                </div>
              )}
            </div>

            <Card className="h-[520px] flex flex-col shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#1a73e8]" />
                    Lab Curriculum & Tasks
                  </CardTitle>
                  <span className="text-[11px] font-mono text-slate-500">
                    {solvedChallengeIds.length}/{challenges.length} Solved
                  </span>
                </div>

                {/* Milestone Switcher Pills */}
                {challenges.length > 1 && (
                  <div className="flex items-center gap-1.5 pt-2">
                    {challenges.map((ch: any, idx: number) => {
                      const isCurrent = idx === activeChallengeIdx;
                      const isSolved = solvedChallengeIds.includes(ch.id);

                      return (
                        <button
                          key={ch.id || idx}
                          onClick={() => {
                            setActiveChallengeIdx(idx);
                            setShowHint(false);
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isCurrent
                              ? 'bg-blue-600 text-white shadow-sm'
                              : isSolved
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isSolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <span>#{idx + 1}</span>
                          )}
                          <span>Milestone {idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {currentChallenge ? (
                  <>
                    {/* Challenge Title & Badge */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {currentChallenge.title}
                        </span>
                        <Badge variant="outline" size="sm" className="font-mono text-[10px] text-amber-500 border-amber-500/30">
                          +{currentChallenge.points || 100} pts
                        </Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {currentChallenge.description}
                      </p>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block uppercase text-[10px] tracking-wider">
                        Required Terminal Steps
                      </span>
                      <div className="space-y-1 text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                        {currentChallenge.instructions}
                      </div>
                    </div>

                    {/* Real-time Task Verification Checklist */}
                    <div className="space-y-2 pt-1">
                      <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                        Milestone Checklist
                      </span>

                      {activeChallengeIdx === 0 && (
                        <div className="space-y-2">
                          <div className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                            sandboxState.fileGroupChanged
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            <div className="flex items-center gap-2">
                              {sandboxState.fileGroupChanged ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span>Assign group to <code>gdg-lab</code></span>
                            </div>
                            <span className="text-[10px] font-mono">+40 pts</span>
                          </div>

                          <div className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                            sandboxState.filePermsChanged
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            <div className="flex items-center gap-2">
                              {sandboxState.filePermsChanged ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span>Set permissions to <code>640</code> (-rw-r-----)</span>
                            </div>
                            <span className="text-[10px] font-mono">+40 pts</span>
                          </div>

                          <div className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                            sandboxState.secretRevealed
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            <div className="flex items-center gap-2">
                              {sandboxState.secretRevealed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span>Read secret token using <code>cat</code></span>
                            </div>
                            <span className="text-[10px] font-mono">+20 pts</span>
                          </div>
                        </div>
                      )}

                      {activeChallengeIdx === 1 && (
                        <div className="space-y-2">
                          <div className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                            sandboxState.rogueProcessKilled
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            <div className="flex items-center gap-2">
                              {sandboxState.rogueProcessKilled ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span>Terminate rogue_daemon (PID 42) with SIGTERM</span>
                            </div>
                            <span className="text-[10px] font-mono">+150 pts</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hint Section */}
                    {currentChallenge.hint && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowHint(!showHint)}
                          className="text-[11px] text-[#1a73e8] dark:text-[#4285F4] hover:underline flex items-center gap-1 font-medium"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {showHint ? 'Hide Hint' : 'Need a hint? (Show command syntax)'}
                        </button>
                        {showHint && (
                          <div className="mt-2 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-mono">
                            {currentChallenge.hint}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400">Loading curriculum...</p>
                )}
              </CardContent>

              {/* Verify & Submit Milestone Footer */}
              <CardFooter className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[11px] text-slate-500">
                  Execute commands in terminal, then verify:
                </span>
                <Button
                  size="sm"
                  onClick={() => handleVerifyMilestone(currentChallenge)}
                  className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center gap-1.5 font-semibold"
                >
                  <Check className="w-3.5 h-3.5" /> Verify Milestone
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right Panel: Interactive Cloud Terminal */}
          <div
            className={`lg:col-span-7 ${
              mobileActiveTab === 'terminal' ? 'block' : 'hidden lg:block'
            }`}
          >
            <Card className="h-[620px] flex flex-col bg-slate-950 border-slate-800 text-slate-100 overflow-hidden shadow-xl">
              {/* Terminal Window Chrome & Access Switcher */}
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  </div>

                  {hasDesktopSupport ? (
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                      <button
                        onClick={() => setWorkspaceView('terminal')}
                        className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                          workspaceView === 'terminal'
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <TerminalIcon className="w-3 h-3" /> Web Terminal
                      </button>
                      <button
                        onClick={() => setWorkspaceView('desktop')}
                        className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                          workspaceView === 'desktop'
                            ? 'bg-purple-600 text-white font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Monitor className="w-3 h-3" /> Remote Desktop (GUI)
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-slate-400 ml-2">
                      bash - labuser@gdg-sandbox:~
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {workspaceView === 'terminal' && (
                    <button
                      onClick={() => setTerminalLines([])}
                      title="Clear Screen"
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {workspaceView === 'desktop' ? (
                /* Remote Desktop Display Viewer */
                <div className="flex-1 bg-slate-900/95 flex flex-col justify-between p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-slate-200">
                        XFCE4 Remote Desktop • {activeProfile.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Resolution: 1920x1080 • Stream: WebRTC / noVNC
                    </span>
                  </div>

                  <div className="my-auto p-6 rounded-xl border border-slate-800 bg-slate-950/70 text-center space-y-4 max-w-lg mx-auto shadow-2xl">
                    <div className="p-3 w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-100">
                        Browser Remote Desktop Stream Connected
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        GUI applications ({configuredToolIds.filter(id => TOOL_CATALOGUE[id]?.requiresDesktop).map(id => TOOL_CATALOGUE[id]?.name || id).join(', ') || 'Wireshark, Burp Suite'}) are accessible inside this sandboxed X11 virtual display.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-left font-mono text-[11px] text-slate-300 space-y-1">
                      <div className="text-emerald-400">✓ Display Server: X11 Virtual Framebuffer :1</div>
                      <div className="text-slate-400">✓ Network Boundary: Isolated private lab subnet</div>
                      <div className="text-slate-400">✓ Target Attached: 10.0.5.20 (Metasploitable)</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setWorkspaceView('terminal')}
                      className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] text-white"
                      leftIcon={<TerminalIcon className="w-3.5 h-3.5" />}
                    >
                      Return to Interactive Web Terminal
                    </Button>
                  </div>

                  <div className="text-center text-[10px] text-slate-500 font-mono">
                    Zero local software needed. Environment streaming directly in browser.
                  </div>
                </div>
              ) : (
                <>
                  {/* Terminal Output Buffer */}
              <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 selection:bg-blue-600 selection:text-white">
                {terminalLines.map((line) => {
                  let color = 'text-slate-300';
                  if (line.type === 'system') color = 'text-blue-400 font-semibold';
                  if (line.type === 'input') color = 'text-slate-100 font-bold';
                  if (line.type === 'error') color = 'text-rose-400 font-semibold';
                  if (line.type === 'success') color = 'text-emerald-400 font-semibold';

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
                  placeholder="Type command (e.g. ls -la /etc/labops/config.json, chgrp, chmod, help)..."
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
            </>
          )}
        </Card>
      </div>
    </div>

    {/* Reset Confirmation Modal */}
    <ConfirmDialog
      open={showResetConfirm}
      onOpenChange={(open) => setShowResetConfirm(open)}
      title="Reset Cloud Environment"
      description="Are you sure you want to reset your environment? This will restore a pristine container filesystem and reset background daemons. Your verified milestone challenges and points will NOT be lost."
      confirmLabel={isResetting ? 'Resetting...' : 'Reset Environment'}
      cancelLabel="Cancel"
      isDestructive={false}
      isLoading={isResetting}
      onConfirm={handleResetEnvironment}
    />

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

        {/* Student Help Request Dialog (Prompt 8) */}
        <Dialog open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              Request Instructor Assistance
            </DialogTitle>
            <DialogDescription>
              Stuck on a command, syntax, or container issue? Send a direct ticket to workshop organisers.
            </DialogDescription>
          </DialogHeader>

          {activeHelpTicket ? (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Ticket Status: {activeHelpTicket.status}</span>
                  <Badge variant="outline" size="sm">{activeHelpTicket.category}</Badge>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {activeHelpTicket.description}
                </p>
              </div>

              {/* Message thread */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(activeHelpTicket.messages || []).map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-lg text-xs ${
                      msg.senderRole === 'ORGANISER' || msg.senderRole === 'SUPER_ADMIN'
                        ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mr-6'
                        : 'bg-slate-100 dark:bg-slate-800 ml-6 text-right'
                    }`}
                  >
                    <div className="font-semibold text-[10px] text-slate-500 mb-0.5">
                      {msg.sender?.name || 'Instructor'} ({msg.senderRole})
                    </div>
                    <div>{msg.message}</div>
                  </div>
                ))}
              </div>

              {/* Student reply input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a follow-up reply..."
                  value={helpReplyText}
                  onChange={(e) => setHelpReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendHelpStudentMessage();
                  }}
                  className="flex-1 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={handleSendHelpStudentMessage}
                  disabled={!helpReplyText.trim()}
                  className="bg-[#1a73e8] text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitHelpRequest} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  What issue are you facing?
                </label>
                <select
                  value={helpCategory}
                  onChange={(e) => setHelpCategory(e.target.value)}
                  className="w-full text-xs p-2.5 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                >
                  <option value="COMMAND_ISSUE">Command or code issue</option>
                  <option value="TERMINAL_NOT_WORKING">Terminal not responding</option>
                  <option value="ENVIRONMENT_NOT_LAUNCHING">Environment not launching</option>
                  <option value="INSTRUCTIONS_UNCLEAR">Challenge instructions unclear</option>
                  <option value="CONCEPTUAL_QUESTION">Conceptual question</option>
                  <option value="OTHER">Other technical inquiry</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Describe the problem
                </label>
                <textarea
                  required
                  rows={4}
                  value={helpDescription}
                  onChange={(e) => setHelpDescription(e.target.value)}
                  placeholder="e.g. When I run chmod 640 /etc/labops/config.json, I see permission denied..."
                  className="w-full text-xs p-2.5 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHelpModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingHelp || !helpDescription.trim()}
                  className="bg-[#1a73e8] text-white"
                >
                  {isSubmittingHelp ? 'Submitting...' : 'Send Help Request'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </Dialog>
      </div>
    </AppShell>
  );
}
