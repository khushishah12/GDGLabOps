'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import { useUser } from '@/lib/user-context';
import { useToast } from '@/lib/toast-context';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  Shield,
  GraduationCap,
  LogOut,
  Sparkles,
  Command,
  CheckCircle2,
  X,
} from 'lucide-react';

interface TopbarProps {
  onToggleMobile: () => void;
}

export function Topbar({ onToggleMobile }: TopbarProps) {
  const pathname = usePathname();
  const { theme, setTheme, isDark } = useTheme();
  const { currentUser, setRole, isAuthenticated, logout } = useUser();
  const { info, success } = useToast();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Notifications State
  const [realNotifications, setRealNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = React.useCallback(async () => {
    if (!currentUser.id) return;
    try {
      const res = await fetch('/api/notifications?limit=8');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setRealNotifications(json.data.items || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } catch {
      // ignore
    }
  }, [currentUser.id]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      if (res.ok) {
        setUnreadCount(0);
        setRealNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        success('Notifications Cleared', 'All notifications marked as read.');
      }
    } catch {
      // ignore
    }
  };

  // Generate dynamic breadcrumb segments
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { title, href, isLast: index === pathSegments.length - 1 };
  });

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#090d16]/80 px-4 sm:px-6 backdrop-blur-md">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobile}
            className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link
              href="/"
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              GDG LabOps
            </Link>
            {breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.href}>
                <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 dark:text-slate-600" />
                {crumb.isLast ? (
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {crumb.title}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    {crumb.title}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Center: Command Palette / Search Trigger */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
          <button
            onClick={() => setShowSearchModal(true)}
            className="w-full flex items-center justify-between h-9 px-3 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search workshops, labs, tools...</span>
            </span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/60 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions, Notifications, Theme & Profile */}
        <div className="flex items-center gap-2">
          {/* Quick Role Switcher Pill for reviewer/demoing */}
          <div className="hidden sm:flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 p-0.5">
            <button
              onClick={() => {
                setRole('ORGANISER');
                info('Switched to Organiser View', 'Managing workshops and viewing live lab telemetry.');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                currentUser.role === 'ORGANISER'
                  ? 'bg-white dark:bg-slate-800 text-[#1a73e8] dark:text-[#4285F4] shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Shield className="w-3 h-3" />
              Organiser
            </button>
            <button
              onClick={() => {
                setRole('STUDENT');
                info('Switched to Student View', 'Accessing learning portal, active sandbox, and challenges.');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                currentUser.role === 'STUDENT'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              Student
            </button>
          </div>

          {/* Notifications Dropdown */}
          <DropdownMenu
            align="right"
            trigger={
              <button
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[#EA4335] text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            }
            items={
              realNotifications.length > 0
                ? [
                    ...realNotifications.map((n) => ({
                      label: `${n.title}: ${n.message.slice(0, 45)}...`,
                      icon: <CheckCircle2 className={`w-3.5 h-3.5 ${n.isRead ? 'text-slate-400' : 'text-blue-500'}`} />,
                      onClick: () => {
                        fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
                        fetchNotifications();
                        if (n.link) window.location.href = n.link;
                      },
                    })),
                    {
                      label: 'Mark all as read',
                      onClick: handleMarkAllRead,
                    },
                  ]
                : [
                    {
                      label: 'No new notifications (All caught up!)',
                      onClick: () => {},
                    },
                  ]
            }
          />

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Profile Menu */}
          <DropdownMenu
            align="right"
            trigger={
              <button className="flex items-center gap-2 rounded-full ring-2 ring-transparent hover:ring-[#4285F4]/30 transition-all p-0.5">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              </button>
            }
            items={[
              {
                label: `${currentUser.name} (${currentUser.role})`,
                onClick: () => {},
                disabled: true,
              },
              {
                label: 'Profile Settings',
                onClick: () => info('Profile', 'Account settings dialog'),
              },
              {
                label: currentUser.role === 'ORGANISER' ? 'Switch to Student View' : 'Switch to Organiser View',
                onClick: () => {
                  const targetRole = currentUser.role === 'ORGANISER' ? 'STUDENT' : 'ORGANISER';
                  setRole(targetRole);
                  success('Role Updated', `Now viewing as ${targetRole.toLowerCase()}`);
                },
              },
              {
                label: 'Sign Out',
                danger: true,
                icon: <LogOut className="w-3.5 h-3.5" />,
                onClick: () => logout(),
              },
            ]}
          />
        </div>
      </header>

      {/* Global Command Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setShowSearchModal(false)}
          />
          <div className="relative z-50 w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e1526] p-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                placeholder="Type to search workshops, challenges, commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pt-3 space-y-1">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Navigation
              </p>
              <Link
                href="/dashboard/workshops"
                onClick={() => setShowSearchModal(false)}
                className="flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <span>Browse All Workshops</span>
                <span className="text-[10px] text-slate-400">Workspaces</span>
              </Link>
              <Link
                href="/dashboard/templates"
                onClick={() => setShowSearchModal(false)}
                className="flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <span>Lab Templates & Docker Images</span>
                <span className="text-[10px] text-slate-400">Environments</span>
              </Link>
              <Link
                href="/student/lab/demo-session"
                onClick={() => setShowSearchModal(false)}
                className="flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <span>Launch Interactive Web Terminal Sandbox</span>
                <span className="text-[10px] text-[#4285F4]">Interactive</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
