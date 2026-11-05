'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/user-context';
import { Trophy, Award, Sparkles, Terminal, Shield, Zap, CheckCircle2 } from 'lucide-react';

export default function StudentAchievementsPage() {
  const { currentUser } = useUser();

  const achievements = [
    { title: 'Shell Master', desc: 'Solved 10 POSIX terminal challenges without viewing hints', icon: Terminal, date: 'Oct 28, 2026', unlocked: true },
    { title: 'Container Pilot', desc: 'Deployed multi-pod Kubernetes services and passed all probes', icon: Shield, date: 'Nov 02, 2026', unlocked: true },
    { title: 'Speed Demon', desc: 'Completed challenge evaluation in under 180 seconds', icon: Zap, date: 'Nov 05, 2026', unlocked: true },
    { title: 'Vulnerability Slayer', desc: 'Patched SQL injection vulnerability on first attempt', icon: Sparkles, date: 'Nov 05, 2026', unlocked: true },
    { title: 'Chapter Top 3', desc: 'Ranked in top 3 on any workshop live leaderboard', icon: Trophy, date: 'Locked', unlocked: false },
    { title: 'Fullstack Pioneer', desc: 'Complete Next.js + Postgres serverless workshop', icon: Award, date: 'Locked', unlocked: false },
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Achievements & Leaderboard Rank
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Badges and milestones unlocked across GDG technical workshops.
            </p>
          </div>
          <div className="flex items-center gap-2 p-2 px-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Score</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">{currentUser.points || 850} Points</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card
                key={idx}
                className={`p-4 space-y-3 ${
                  item.unlocked
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'opacity-50 border-dashed bg-slate-50/40 dark:bg-slate-900/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#4285F4]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant={item.unlocked ? 'success' : 'secondary'} size="sm">
                    {item.unlocked ? 'Unlocked' : 'Locked'}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
                </div>

                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {item.unlocked ? `Unlocked on ${item.date}` : 'Complete workshop requirements to unlock'}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
