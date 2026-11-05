'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { mockUsers } from '@/lib/mock-data';
import { useSession, signOut } from 'next-auth/react';

interface UserContextType {
  currentUser: User;
  setRole: (role: UserRole) => void;
  isOrganiser: boolean;
  isStudent: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [role, setRoleState] = useState<UserRole>('ORGANISER');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('gdg-labops-role') as UserRole;
      if (savedRole && (savedRole === 'ORGANISER' || savedRole === 'STUDENT' || savedRole === 'SUPER_ADMIN')) {
        setRoleState(savedRole);
      }
    } catch {
      // Ignore
    }
    setMounted(true);
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem('gdg-labops-role', newRole);
    } catch {
      // Ignore
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Determine current user: Prefer live NextAuth session, fallback to mockUser for offline development
  let currentUser: User;

  if (session?.user) {
    const userRole = (session.user.role as UserRole) || 'STUDENT';
    currentUser = {
      id: session.user.id || 'usr-live-01',
      name: session.user.name || 'GDG Member',
      email: session.user.email || 'user@campus.dev',
      role: userRole,
      avatarUrl: session.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user.name || 'U')}`,
      avatar: session.user.avatar || null,
    };
  } else {
    currentUser =
      role === 'STUDENT'
        ? mockUsers.student
        : role === 'SUPER_ADMIN'
        ? mockUsers.superadmin
        : mockUsers.organiser;
  }

  const effectiveRole = currentUser.role;

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setRole,
        isOrganiser: effectiveRole === 'ORGANISER' || effectiveRole === 'SUPER_ADMIN',
        isStudent: effectiveRole === 'STUDENT',
        isSuperAdmin: effectiveRole === 'SUPER_ADMIN',
        isAuthenticated: status === 'authenticated',
        logout: handleLogout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
