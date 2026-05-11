import React from 'react';
import { User } from '../types';

interface RoleGuardProps {
  user: User | null;
  allowedRoles: ('Admin' | 'Cashier')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  user, 
  allowedRoles, 
  children, 
  fallback = (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
      </div>
      <h2 className="text-xl font-bold text-slate-800">Akses Dibatasi</h2>
      <p className="text-slate-500 max-w-xs">Anda tidak memiliki izin untuk mengakses halaman ini. Halaman ini hanya untuk {allowedRoles.join(' atau ')}.</p>
    </div>
  )
}) => {
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
