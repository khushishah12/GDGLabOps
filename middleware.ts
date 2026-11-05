import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // 1. Account Suspension Check
    if (token?.status === 'SUSPENDED') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'ACCOUNT_SUSPENDED');
      return NextResponse.redirect(url);
    }

    // 2. Super Admin Routes Protection
    if (pathname.startsWith('/admin')) {
      if (token?.role !== Role.SUPER_ADMIN) {
        const url = req.nextUrl.clone();
        url.pathname = token?.role === Role.STUDENT ? '/student/overview' : '/dashboard/overview';
        return NextResponse.redirect(url);
      }
    }

    // 3. Organiser Control Plane Protection
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/organiser')) {
      if (token?.role !== Role.ORGANISER && token?.role !== Role.SUPER_ADMIN) {
        const url = req.nextUrl.clone();
        url.pathname = '/student/overview';
        return NextResponse.redirect(url);
      }
    }

    // 4. Student Learning Hub
    if (pathname.startsWith('/student')) {
      // All authenticated roles can explore student views
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes that never require a session token
        if (
          pathname === '/' ||
          pathname === '/login' ||
          pathname === '/register' ||
          pathname === '/forgot-password' ||
          pathname === '/reset-password' ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/_next') ||
          pathname.includes('.')
        ) {
          return true;
        }

        // All other protected routes require a valid token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/organiser/:path*',
    '/student/:path*',
  ],
};
