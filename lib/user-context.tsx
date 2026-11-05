'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { mockUsers } from '@/lib/mock-data';

interface UserContextType {
  currentUser: User;
  setRole: (role: UserRole) => void;
  isOrganiser: boolean;
  isStudent: boolean;
  isSuperAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
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

  const currentUser: User =
    role === 'STUDENT'
      ? mockUsers.student
      : role === 'SUPER_ADMIN'
      ? mockUsers.superadmin
      : mockUsers.organiser;

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setRole,
        isOrganiser: currentUser.role === 'ORGANISER' || currentUser.role === 'SUPER_ADMIN',
        isStudent: currentUser.role === 'STUDENT',
        isSuperAdmin: currentUser.role === 'SUPER_ADMIN',
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
