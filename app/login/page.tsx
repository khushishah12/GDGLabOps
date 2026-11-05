'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useToast } from '@/lib/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Terminal,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';
  const errorParam = searchParams.get('error');
  const registeredParam = searchParams.get('registered');

  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    errorParam === 'ACCOUNT_SUSPENDED'
      ? 'Your account has been suspended. Please contact platform administrators.'
      : ''
  );

  const handleAutoFill = (role: 'ORGANISER' | 'STUDENT') => {
    if (role === 'ORGANISER') {
      setEmail('alex.rivera@gdgcampus.dev');
      setPassword('Organiser@Pass2026!');
      toastSuccess('Filled demo Organiser credentials');
    } else {
      setEmail('elena.rostova@student.gdg.dev');
      setPassword('Student@Pass2026!');
      toastSuccess('Filled demo Student credentials');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!res) {
        setErrorMessage('Unable to connect to the authentication service.');
        setLoading(false);
        return;
      }

      if (res.error) {
        if (res.error.includes('RATE_LIMITED')) {
          setErrorMessage(res.error.replace('Error: ', ''));
        } else if (res.error.includes('ACCOUNT_SUSPENDED')) {
          setErrorMessage('Your account has been suspended. Please contact platform administrators.');
        } else {
          setErrorMessage('Invalid email or password. Please try again.');
        }
        setLoading(false);
        return;
      }

      toastSuccess('Signed in successfully.');

      // Determine redirect target
      if (callbackUrl && callbackUrl.startsWith('/')) {
        router.push(callbackUrl);
      } else {
        // Query current session to route to role-appropriate portal
        fetch('/api/auth/session')
          .then((r) => r.json())
          .then((data) => {
            if (data?.user?.role === 'STUDENT') {
              router.push('/student/overview');
            } else {
              router.push('/dashboard/overview');
            }
            router.refresh();
          })
          .catch(() => {
            router.push('/dashboard/overview');
            router.refresh();
          });
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#4285F4]/10 dark:bg-[#4285F4]/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1A73E8] to-[#4285F4] flex items-center justify-center text-white shadow-lg shadow-[#4285F4]/20 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              GDG LabOps
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign in to your account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access your technical workshops, cloud sandboxes, and labs
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-xl">
          {registeredParam && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Account created successfully! Please sign in with your credentials.</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.chen@student.gdg.dev"
                  className="pl-9"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#1A73E8] dark:text-[#4285F4] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#4285F4] focus:ring-[#4285F4]"
                />
                Remember me for 30 days
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-2 bg-[#1A73E8] hover:bg-[#1557b0] text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials Help */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mb-2 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                Demo Roles Provisioned in Neon:
              </span>
              <span className="text-[10px] text-blue-500 dark:text-blue-400 font-mono">
                Click to autofill
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleAutoFill('ORGANISER')}
                className="p-2.5 rounded-lg text-left bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-900 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Organiser
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-medium">
                    Fill
                  </span>
                </div>
                <div className="text-slate-500 text-[10px] truncate mt-0.5">alex.rivera@gdgcampus.dev</div>
              </button>

              <button
                type="button"
                onClick={() => handleAutoFill('STUDENT')}
                className="p-2.5 rounded-lg text-left bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-900 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Student
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-medium">
                    Fill
                  </span>
                </div>
                <div className="text-slate-500 text-[10px] truncate mt-0.5">elena.rostova@student.gdg.dev</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-[#1A73E8] dark:text-[#4285F4] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
