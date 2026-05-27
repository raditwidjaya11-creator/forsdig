import { useContext } from 'react';
import { AuthContext, AuthContextType } from '../providers/AuthProvider';

/**
 * Custom React Hook to access the global robust AuthProvider.
 * Provides unified state for session, authenticated user profile, authState, sync triggers, 
 * loading animations, login wrapper processes, and logout routines.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed inside an <AuthProvider> context container.');
  }
  return context;
}
