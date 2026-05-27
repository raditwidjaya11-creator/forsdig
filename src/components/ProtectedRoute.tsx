import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from './LoadingScreen';
import Auth from './Auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that enforces modern session guards.
 * It protects children render scopes using global lightweight contexts.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authState, isSyncing } = useAuth();

  if (authState === 'loading') {
    return <LoadingScreen message="Menyiapkan Sistem Kasir ForsDig..." />;
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Auth />
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}
