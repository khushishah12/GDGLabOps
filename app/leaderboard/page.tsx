'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toast-context';
import Link from 'next/link';
import {
  Trophy,
  Medal,
  Award,
  Users,
  Shield,
  EyeOff,
  Flame,
  Crown,
  Search,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  points: number;
  badgesCount: number;
  isCurrentUser: boolean;
  isAnonymous: boolean;
}

export default function LeaderboardPage() {
  const { error: toastError } = useToast();
  const [scope, setScope] = useState<'all-time' | 'monthly' | 'organisation' | 'workshop'>('all-time');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | undefined>();
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?scope=${scope}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data.entries || []);
        setUserRank(json.data.userRank);
        setTotalCount(json.data.totalCount || 0);
      } else {
        toastError('Failed to load leaderboard', json.error?.message);
      }
    } catch (e: any) {
      toastError('Connection Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [scope]);

  const filteredEntries = search
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const top3 = entries.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                Community Leaderboard
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Recognizing active participants across hands-on labs, challenges, and workshops.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/student/learning">
              <Button size="sm" variant="outline" className="text-xs" leftIcon={<EyeOff className="w-3.5 h-3.5 text-slate-400" />}>
                Privacy Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Scope Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-slate-900 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 w-full sm:w-auto">
            {(
              [
                { id: 'all-time', label: 'All-Time' },
                { id: 'monthly', label: 'This Month' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setScope(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  scope === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search participants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Podium for Top 3 */}
        {!loading && entries.length >= 3 && !search && (
          <div className="grid grid-cols-3 gap-3 pt-6 pb-2 items-end max-w-2xl mx-auto">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center font-bold text-slate-200 text-sm mb-2 shadow-md">
                  {top3[1].name.charAt(0)}
                </div>
                <div className="text-center mb-2">
                  <span className="font-semibold text-xs text-slate-200 block truncate max-w-[100px]">
                    {top3[1].name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 font-bold">
                    {top3[1].points} pts
                  </span>
                </div>
                <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-t-xl h-24 flex flex-col items-center justify-center">
                  <Medal className="w-6 h-6 text-slate-300" />
                  <span className="text-xs font-bold text-slate-300 mt-1">#2</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="flex flex-col items-center">
                <Crown className="w-6 h-6 text-amber-400 animate-bounce mb-1" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border-2 border-yellow-300 flex items-center justify-center font-bold text-slate-950 text-lg mb-2 shadow-lg shadow-amber-500/20">
                  {top3[0].name.charAt(0)}
                </div>
                <div className="text-center mb-2">
                  <span className="font-semibold text-xs text-slate-100 block truncate max-w-[120px]">
                    {top3[0].name}
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {top3[0].points} pts
                  </span>
                </div>
                <div className="w-full bg-gradient-to-t from-amber-500/20 to-yellow-500/10 border border-amber-500/40 rounded-t-xl h-32 flex flex-col items-center justify-center">
                  <Trophy className="w-7 h-7 text-amber-400" />
                  <span className="text-sm font-bold text-amber-300 mt-1">#1</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-amber-700 flex items-center justify-center font-bold text-slate-300 text-sm mb-2 shadow-md">
                  {top3[2].name.charAt(0)}
                </div>
                <div className="text-center mb-2">
                  <span className="font-semibold text-xs text-slate-200 block truncate max-w-[100px]">
                    {top3[2].name}
                  </span>
                  <span className="text-[11px] font-mono text-amber-600 font-bold">
                    {top3[2].points} pts
                  </span>
                </div>
                <div className="w-full bg-slate-800/80 border border-amber-900/40 rounded-t-xl h-20 flex flex-col items-center justify-center">
                  <Medal className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold text-amber-600 mt-1">#3</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current User Sticky Banner */}
        {userRank && (
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                Your Rank #{userRank.rank}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {userRank.name} {userRank.isAnonymous && <span className="text-slate-500 text-[10px]">(Masked on Leaderboards)</span>}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">{userRank.badgesCount} badges</span>
              <span className="text-blue-400 font-bold">{userRank.points} pts</span>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredEntries.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">No participants found.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredEntries.map((entry) => (
                  <div
                    key={`${entry.rank}-${entry.userId}`}
                    className={`p-3.5 flex items-center justify-between text-xs transition-colors ${
                      entry.isCurrentUser ? 'bg-blue-950/20' : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 text-center font-mono font-bold ${
                          entry.rank === 1
                            ? 'text-amber-400'
                            : entry.rank === 2
                            ? 'text-slate-300'
                            : entry.rank === 3
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        }`}
                      >
                        #{entry.rank}
                      </span>

                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0">
                        {entry.isAnonymous ? '?' : entry.name.charAt(0)}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              entry.isCurrentUser ? 'text-blue-400' : 'text-slate-200'
                            }`}
                          >
                            {entry.name}
                          </span>
                          {entry.isCurrentUser && (
                            <span className="text-[10px] px-1 rounded bg-blue-500/20 text-blue-300 font-medium">
                              You
                            </span>
                          )}
                          {entry.isAnonymous && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <EyeOff className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {entry.badgesCount} badges earned
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-100 text-sm">
                        {entry.points}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
