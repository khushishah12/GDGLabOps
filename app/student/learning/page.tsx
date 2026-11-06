'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import Link from 'next/link';
import {
  Trophy,
  Award,
  Terminal,
  Zap,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles,
  Shield,
  Compass,
} from 'lucide-react';

export default function StudentLearningPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [optOut, setOptOut] = useState(false);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);

  useEffect(() => {
    fetch('/api/student/learning')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
          setOptOut(json.data.profile.leaderboardOptOut);
        } else {
          toastError('Error', json.error?.message || 'Could not load learning journey');
        }
      })
      .catch((e) => toastError('Connection Error', e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleTogglePrivacy = async () => {
    setTogglingPrivacy(true);
    const newStatus = !optOut;
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optOut: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setOptOut(newStatus);
        toastSuccess('Privacy Setting Updated', json.message);
      } else {
        toastError('Failed', json.error?.message);
      }
    } catch (e: any) {
      toastError('Connection Error', e.message);
    } finally {
      setTogglingPrivacy(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="text-center py-16">
          <p className="text-slate-400">Unable to load learning data.</p>
        </div>
      </AppShell>
    );
  }

  const { profile, stats, domainBreakdown, achievements, recentTransactions, recommendedWorkshops } = data;

  const iconMap: Record<string, any> = {
    Terminal: Terminal,
    Shield: Shield,
    Zap: Zap,
    Sparkles: Sparkles,
    Award: Award,
    CheckCircle: CheckCircle2,
    Trophy: Trophy,
    Compass: Compass,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Gamification Profile Header */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                {profile.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{profile.name}</h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                    Rank #{profile.rank}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  GDG Developer Journey &bull; {stats.badgesCount} Badges Unlocked &bull; {profile.totalPoints} Total Points
                </p>
              </div>
            </div>

            {/* Privacy Toggle Button */}
            <div className="flex items-center gap-2 bg-slate-900/70 p-2 rounded-xl border border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePrivacy}
                disabled={togglingPrivacy}
                className="text-xs"
                leftIcon={optOut ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
              >
                {optOut ? 'Masked on Leaderboards' : 'Visible on Leaderboards'}
              </Button>
              <Link href="/leaderboard">
                <Button size="sm" className="text-xs" rightIcon={<Trophy className="w-3.5 h-3.5" />}>
                  View Leaderboards
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Learning KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Workshops Attended</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{stats.workshopsAttended}</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Registered for {stats.workshopsRegistered} GDG workshops
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Hands-on Labs</span>
              <Terminal className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{stats.labsCompleted}</div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.labsActive} active cloud sandbox sessions
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Challenges Solved</span>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{stats.challengesCompleted}</div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.challengeSuccessRate}% automated evaluation pass rate
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Achievements & Badges</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{stats.badgesCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">
              {achievements.filter((a: any) => !a.isUnlocked).length} badges waiting to be unlocked
            </p>
          </Card>
        </div>

        {/* Technical Domain Mastery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              Technical Domain Mastery
            </CardTitle>
            <CardDescription className="text-xs">
              Challenges solved and skill points earned across core technologies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {domainBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Complete your first workshop challenge to start tracking domain skills!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {domainBreakdown.map((item: any) => (
                  <div key={item.domain} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm text-slate-200">{item.domain}</span>
                      <span className="text-xs font-mono font-bold text-blue-400">+{item.pointsEarned} pts</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{item.challengesCompleted} challenges completed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Badges & Achievements Showcase */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Achievements & Badge Showcase
                </CardTitle>
                <CardDescription className="text-xs">
                  Milestones automatically recognized through cloud lab and workshop actions
                </CardDescription>
              </div>
              <Badge variant="outline" size="sm">{stats.badgesCount} of {achievements.length} Unlocked</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((ach: any) => {
                const IconComponent = iconMap[ach.icon] || Trophy;
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border transition-all ${
                      ach.isUnlocked
                        ? 'bg-slate-900/80 border-amber-500/30 hover:border-amber-500/50 shadow-sm shadow-amber-500/5'
                        : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          ach.isUnlocked
                            ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {ach.isUnlocked ? <IconComponent className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-semibold text-xs text-slate-200 truncate">{ach.name}</h4>
                          <span className="text-[10px] font-mono text-amber-400 font-bold shrink-0">
                            +{ach.points} pts
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                          {ach.description}
                        </p>
                        {ach.isUnlocked && ach.unlockedAt && (
                          <div className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activity Ledger & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Points Ledger */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Points Transaction Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable, append-only history of points awarded
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800">
                {recentTransactions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No transactions recorded yet.</p>
                ) : (
                  recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium text-slate-200 block">{tx.reason}</span>
                        <span className="text-[10px] text-slate-500">
                          {tx.sourceActivity} &bull; {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Next Workshops */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Recommended Next Steps
              </CardTitle>
              <CardDescription className="text-xs">
                Workshops to expand your skills into new technical areas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedWorkshops.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  You are registered for all available upcoming workshops!
                </p>
              ) : (
                recommendedWorkshops.map((w: any) => (
                  <div key={w.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200 truncate">{w.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {w.domain}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {w.instructorName ? `by ${w.instructorName}` : 'GDG Study Jam'}
                      </span>
                    </div>
                    <Link href={`/student/workshops`}>
                      <Button size="sm" variant="outline" className="text-xs shrink-0" rightIcon={<ArrowRight className="w-3 h-3" />}>
                        Explore
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
