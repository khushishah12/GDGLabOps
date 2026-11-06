'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/user-context';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Users,
  BarChart3,
  Terminal,
  Trophy,
  Server,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Code2,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, isOrganiser } = useUser();

  // Navigation items for Organisers / Admins
  const organiserNav = [
    {
      group: 'Workspace',
      items: [
        { label: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
        { label: 'Workshops', href: '/dashboard/workshops', icon: Calendar },
        { label: 'Lab Templates', href: '/dashboard/templates', icon: Layers },
        { label: 'Live Monitor', href: '/dashboard/monitor', icon: Users },
        { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      group: 'Lab Management',
      items: [
        { label: 'Active Sessions', href: '/dashboard/sessions', icon: Terminal },
        { label: 'Challenges', href: '/dashboard/challenges', icon: Trophy },
        { label: 'Lab Environments', href: '/dashboard/environments', icon: Server },
      ],
    },
    {
      group: 'Administration',
      items: [
        { label: 'Team Members', href: '/dashboard/team', icon: UserCheck },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  // Navigation items for Students
  const studentNav = [
    {
      group: 'Learning Portal',
      items: [
        { label: 'My Dashboard', href: '/student/overview', icon: LayoutDashboard },
        { label: 'Browse Workshops', href: '/student/explore', icon: BookOpen },
        { label: 'My Registrations', href: '/student/workshops', icon: Calendar },
        { label: 'My Learning Journey', href: '/student/learning', icon: BarChart3 },
        { label: 'Global Leaderboard', href: '/leaderboard', icon: Trophy },
        { label: 'My Labs', href: '/student/labs', icon: Terminal },
        { label: 'Interactive Sandbox', href: '/student/lab/demo-session', icon: Code2 },
        { label: 'Achievements', href: '/student/achievements', icon: Sparkles },
      ],
    },
    {
      group: 'Account',
      items: [
        { label: 'Settings', href: '/student/settings', icon: Settings },
      ],
    },
  ];

  const currentNav = isOrganiser ? organiserNav : studentNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#090d16] transition-all duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-64',
          // Mobile state
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Workspace Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            {/* Google / GDG Styled Brand Mark */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-800 border border-slate-700/50 shadow-inner">
              <span className="flex gap-0.5 font-black text-xs">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">D</span>
                <span className="text-[#FBBC04]">G</span>
              </span>
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                    LabOps
                  </span>
                  <span className="rounded bg-blue-500/10 px-1 py-0.2 text-[9px] font-semibold text-[#1a73e8] dark:text-[#4285F4]">
                    PROD
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  GDG on Campus
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {currentNav.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.group}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onCloseMobile?.()}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all group relative',
                        isActive
                          ? 'bg-[#1a73e8]/10 text-[#1a73e8] dark:bg-[#4285F4]/15 dark:text-[#4285F4] font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200',
                        collapsed && 'justify-center px-0'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#1a73e8] dark:bg-[#4285F4]" />
                      )}
                      <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-[#1a73e8] dark:text-[#4285F4]' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300')} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Identity / Role Indicator Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-lg p-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60',
              collapsed && 'justify-center p-1.5'
            )}
          >
            <div className="relative">
              <img
                src={currentUser.avatarUrl || currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96'}
                alt={currentUser.name}
                className="h-7 w-7 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
              />
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
