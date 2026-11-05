'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/lib/toast-context';
import { useUser } from '@/lib/user-context';
import {
  Terminal,
  Cpu,
  Shield,
  Zap,
  CheckCircle2,
  Users,
  BarChart3,
  ArrowRight,
  ExternalLink,
  Code2,
  Server,
  Layers,
  Sparkles,
  Lock,
  Play,
  Award,
  GraduationCap,
  Laptop,
  Smartphone,
  Globe,
  Monitor,
} from 'lucide-react';

export default function LandingPage() {
  const { info } = useToast();
  const { setRole } = useUser();
  const [eventCodeInput, setEventCodeInput] = useState('');

  const domains = [
    { name: 'Cybersecurity', icon: Shield, desc: 'Sandboxed CTF targets, vulnerability scanning & patch validation without campus network risk.', color: 'text-rose-500' },
    { name: 'Cloud Computing', icon: Server, desc: 'Kubernetes pods, cluster networking, service meshes and microservice ingress.', color: 'text-blue-500' },
    { name: 'Web Development', icon: Code2, desc: 'Modern Next.js, TypeScript, PostgreSQL and edge runtime environments.', color: 'text-emerald-500' },
    { name: 'DevOps', icon: Layers, desc: 'CI/CD pipeline automation, Docker containerization and POSIX system administration.', color: 'text-amber-500' },
    { name: 'Artificial Intelligence', icon: Cpu, desc: 'Quantized LLM inference, vector databases, and semantic retrieval pipelines.', color: 'text-purple-500' },
    { name: 'Machine Learning', icon: BarChart3, desc: 'Jupyter-grade interactive notebooks with pre-seeded datasets and model training.', color: 'text-cyan-500' },
    { name: 'Open Source', icon: Zap, desc: 'Real Git workflows, pull request simulations, and collaborative code reviews.', color: 'text-green-500' },
  ];

  const features = [
    {
      title: 'Zero-Install Browser Labs',
      description: 'Students access hardened Linux terminals or VS Code web IDEs directly in their browser in under 2 seconds. No local Docker or virtualization required.',
      icon: Terminal,
      color: 'bg-blue-500/10 text-[#4285F4]',
    },
    {
      title: 'Automated Task Evaluation',
      description: 'Non-intrusive container grading bots verify exit codes, stdout patterns, and filesystem states inside student containers with instant feedback.',
      icon: CheckCircle2,
      color: 'bg-green-500/10 text-[#34A853]',
    },
    {
      title: 'Live Organiser Telemetry',
      description: 'Monitor all 50+ connected students in real-time. Detect who is blocked on specific milestones and provide targeted instructor assistance.',
      icon: Users,
      color: 'bg-yellow-500/10 text-[#FBBC04]',
    },
    {
      title: 'Event Code Fast-Join',
      description: 'Distribute a single alphanumeric code (e.g. GDG-K8S-2026). Students join instantly with pre-configured credentials and isolated sandboxes.',
      icon: Zap,
      color: 'bg-red-500/10 text-[#EA4335]',
    },
    {
      title: 'Reusable Lab Templates',
      description: 'Version-controlled Docker recipes with preset CPU, RAM, and storage quotas that any GDG chapter can clone, customize, and share.',
      icon: Layers,
      color: 'bg-purple-500/10 text-purple-400',
    },
    {
      title: 'Gamified Leaderboards',
      description: 'Live workshop scoreboards, completion time streaks, and digital badges that keep students engaged throughout multi-hour sessions.',
      icon: Award,
      color: 'bg-amber-500/10 text-amber-400',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-[#4285F4]/30 selection:text-[#4285F4]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-800 border border-slate-700 shadow-inner">
              <span className="flex gap-0.5 font-black text-xs">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">D</span>
                <span className="text-[#FBBC04]">G</span>
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight">GDG LabOps</span>
                <span className="rounded bg-blue-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-[#1a73e8] dark:text-[#4285F4]">
                  Platform
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Google Developer Groups on Campus
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-[#4285F4] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#4285F4] transition-colors">How It Works</a>
            <a href="#domains" className="hover:text-[#4285F4] transition-colors">Domains</a>
            <a href="#comparison" className="hover:text-[#4285F4] transition-colors">Benefits</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/dashboard/overview" onClick={() => setRole('ORGANISER')}>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs">
                Organiser Portal
              </Button>
            </Link>
            <Link href="/student/explore" onClick={() => setRole('STUDENT')}>
              <Button size="sm" className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]">
                Explore Platform
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 border-b border-slate-200/80 dark:border-slate-800/60">
        {/* Subtle Background Glow Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-xs text-[#1a73e8] dark:text-[#4285F4] animate-in fade-in slide-in-from-top-3">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#4285F4] animate-pulse" />
            Designed specifically for GDG on Campus Technical Workshops
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Turn Technical Workshops Into{' '}
            <span className="bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC04] bg-clip-text text-transparent">
              Hands-On Experiences.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Create practical learning environments, launch interactive labs, track student progress
            and make technical workshops more engaging — all from one platform.
          </p>

          {/* Quick Action CTAs & Event Code Input */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
            <Link href="/dashboard/overview" className="w-full sm:w-auto">
              <Button size="lg" className="w-full text-sm font-semibold shadow-lg shadow-blue-500/10">
                Explore Platform
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full text-sm">
                How It Works
              </Button>
            </a>
          </div>

          {/* Interactive Event Code Banner */}
          <div className="pt-4 flex items-center justify-center">
            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 max-w-sm w-full">
              <span className="text-xs text-slate-400 font-mono">Code:</span>
              <input
                type="text"
                placeholder="Enter GDG Event Code..."
                value={eventCodeInput}
                onChange={(e) => setEventCodeInput(e.target.value.toUpperCase())}
                className="bg-transparent text-xs font-mono uppercase text-slate-800 dark:text-slate-200 focus:outline-none flex-1"
              />
              <Link
                href={`/student/explore?code=${eventCodeInput || 'GDG-LNX-2026'}`}
                onClick={() => setRole('STUDENT')}
              >
                <Button size="sm" variant="secondary" className="text-xs shrink-0">
                  Join Lab
                </Button>
              </Link>
            </div>
          </div>

          {/* Realistic Platform UI Preview Mockup */}
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1222] p-2 shadow-2xl shadow-blue-500/5">
              {/* Window Title Bar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400">
                    gdg-labops-runtime-session-01.sandbox
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" size="sm">
                    ● Container Running (512MB RAM)
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">Latency: 28ms</span>
                </div>
              </div>

              {/* Mockup Split Interface: Challenge Task + Interactive Terminal */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0 text-left min-h-[340px]">
                {/* Challenge Guide Panel */}
                <div className="md:col-span-5 p-4 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="domain" size="sm">DevOps Challenge 1 of 4</Badge>
                    <span className="text-xs font-semibold text-emerald-500">100 Points</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    POSIX Permissions & Process Audit
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Verify file ownership on <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">/etc/labops/config.json</code> and terminate orphaned daemon processes.
                  </p>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-950 text-xs space-y-1.5">
                    <p className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                      Step Instructions:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
                      <li>Run <code className="font-mono">ls -la /etc/labops/</code> to verify group bits.</li>
                      <li>Assign group <code className="font-mono">gdg-lab</code> with read rights.</li>
                      <li>Click <strong>Evaluate Task</strong> when complete.</li>
                    </ul>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <Button size="sm" variant="primary" className="text-xs w-full">
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Run Auto-Evaluation
                    </Button>
                  </div>
                </div>

                {/* Simulated Terminal Preview */}
                <div className="md:col-span-7 p-4 bg-slate-950 text-emerald-400 font-mono text-xs flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="text-slate-500">
                      # GDG LabOps Linux Sandboxed Environment v1.2
                    </div>
                    <div className="text-slate-500">
                      # Attached to ephemeral container (cgroups v2, 0.5 CPU, no-net-egress)
                    </div>
                    <div className="pt-1">
                      <span className="text-[#4285F4]">student@gdg-lab</span>:<span className="text-amber-400">~</span>$ ls -l /etc/labops/config.json
                    </div>
                    <div className="text-slate-300">
                      -rw-r----- 1 root root 842 Nov 5 14:02 /etc/labops/config.json
                    </div>
                    <div className="pt-1">
                      <span className="text-[#4285F4]">student@gdg-lab</span>:<span className="text-amber-400">~</span>$ sudo chgrp gdg-lab /etc/labops/config.json
                    </div>
                    <div>
                      <span className="text-[#4285F4]">student@gdg-lab</span>:<span className="text-amber-400">~</span>$ sudo chmod 640 /etc/labops/config.json
                    </div>
                    <div className="text-emerald-300 pt-1">
                      [+] Validation bot: EXIT 0 | Task solved (+100 pts)
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-800 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      TTY Connected (Session: ws-linux-892)
                    </span>
                    <span>xterm.js WebGL Engine</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section id="features" className="py-20 bg-slate-50/50 dark:bg-[#0b101d] border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="default" size="md">Platform Capabilities</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Engineered for Frictionless Technical Workshops
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Everything required to orchestrate hands-on developer experiences without fighting configuration issues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md">
                  <CardHeader>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${feature.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed pt-1">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary" size="md">Workflow Architecture</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              How GDG LabOps Works in Practice
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              From workshop setup to student verification in four streamlined steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Select Lab Template',
                desc: 'Organiser selects from pre-built Docker environments (Linux, Kubernetes, Cyber CTF, AI) or creates custom challenges.',
              },
              {
                step: '02',
                title: 'Distribute Event Code',
                desc: 'Students join via a single code like GDG-K8S-2026. No registration passwords or OAuth confusion required.',
              },
              {
                step: '03',
                title: 'Instant Container Sandbox',
                desc: 'A dedicated Docker container with strict RAM/CPU cgroups spins up in seconds, exposing a terminal directly in their browser.',
              },
              {
                step: '04',
                title: 'Live Evaluation & Observability',
                desc: 'Students click evaluate to grade tasks. The organiser observes live class progress and assists anyone falling behind.',
              },
            ].map((s, idx) => (
              <div key={idx} className="relative p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526] space-y-2">
                <span className="font-mono text-2xl font-black text-[#4285F4]/30 dark:text-[#4285F4]/40">
                  {s.step}
                </span>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{s.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Technical Domains */}
      <section id="domains" className="py-20 bg-slate-50/50 dark:bg-[#0b101d] border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="default" size="md">Curriculum Support</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Built for Every Technical Domain
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Pre-configured runtime environments optimized for GDG on Campus study jams and workshops.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {domains.map((d, idx) => {
              const Icon = d.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1526] hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${d.color}`} />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">{d.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {d.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cross-Platform & Device Compatibility Section */}
      <section id="compatibility" className="py-20 border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="default" size="md">Cross-Platform Standard</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Accessible Everywhere. Zero Local Installations.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Run technical workshops without operating system lock-in. Docker containers execute securely on cloud servers, not student devices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-[#4285F4] flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">All Major Operating Systems</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Native browser support on <strong>Windows 10/11</strong>, <strong>macOS</strong>, <strong>Linux</strong>, <strong>ChromeOS</strong>, <strong>Android</strong>, and <strong>iOS / iPadOS</strong>.
              </p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Modern Browser Certified</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tested and verified across <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, <strong>Mozilla Firefox</strong>, and <strong>Apple Safari</strong>.
              </p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 text-[#FBBC04] flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Remote Cloud Sandboxing</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Docker containers run in hardened cloud worker nodes. No virtual machines, WSL, or Docker Desktop required on student hardware.
              </p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Adaptive Device Ergonomics</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mobile and tablet-friendly for viewing guides and leaderboards. <strong>Laptop/Desktop recommended</strong> for intensive command-line workshops.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Organiser vs Student Benefits Comparison */}
      <section id="comparison" className="py-20 border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary" size="md">Value Proposition</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Empowering Both Organisers & Students
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Eliminating friction so chapters can focus purely on technical learning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Organiser Benefits */}
            <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-4">
              <div className="flex items-center gap-2 text-[#1a73e8] dark:text-[#4285F4]">
                <Shield className="w-5 h-5" />
                <h3 className="font-bold text-base">For GDG Organisers & Mentors</h3>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span><strong>Zero setup downtime:</strong> No more spending the first 45 minutes of a workshop fixing Python PATH or Docker Desktop bugs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span><strong>Live classroom visibility:</strong> Instantly see which students completed each challenge and who raised a digital hand for help.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span><strong>Exportable chapter analytics:</strong> Generate participation reports, completion rates, and feedback metrics for leadership presentations.</span>
                </li>
              </ul>
            </div>

            {/* Student Benefits */}
            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="w-5 h-5" />
                <h3 className="font-bold text-base">For University Students & Developers</h3>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Hardware agnostic:</strong> Access heavy Kubernetes and AI environments even from budget laptops, Chromebooks, or tablets.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Safe sandbox:</strong> Experiment freely with root privileges and offensive security tools without breaking your own computer.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Interactive validation:</strong> Receive instant feedback on command success, earn points, and climb the workshop leaderboard.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call To Action */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Supercharge Your Next GDG Workshop?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Explore pre-configured lab templates, simulate hands-on container environments, and inspect live organizer dashboards.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard/overview" onClick={() => setRole('ORGANISER')}>
              <Button size="lg" className="text-xs font-semibold">
                Launch Organiser Dashboard
              </Button>
            </Link>
            <Link href="/student/lab/demo-session" onClick={() => setRole('STUDENT')}>
              <Button variant="outline" size="lg" className="text-xs">
                Try Interactive Web Terminal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-8 text-xs text-slate-500 bg-slate-50 dark:bg-[#070a12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">GDG LabOps</span>
            <span>—</span>
            <span>Technical Workshop Infrastructure Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Built for GDG on Campus</span>
            <span>•</span>
            <Link href="/dashboard/workshops" className="hover:underline">Workshops</Link>
            <span>•</span>
            <Link href="/dashboard/templates" className="hover:underline">Templates</Link>
            <span>•</span>
            <Link href="/dashboard/analytics" className="hover:underline">Analytics</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
