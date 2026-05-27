import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured, setCachedUserId } from '../lib/supabase';
import { UserProfile } from '../types';
import { useUserStore } from '../services/userStore';
import { usePOSStore } from '../services/posStore';
import { toast } from 'sonner';

export interface AuthContextType {
  user: UserProfile | null;
  session: any | null; // Supabase authentication session
  authState: 'loading' | 'authenticated' | 'unauthenticated';
  isSyncing: boolean;
  isSupabaseConfigured: boolean;
  login: (email?: string, password?: string, fullName?: string, phone?: string, isSignup?: boolean) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isSyncing, setIsSyncing] = useState(false);

  const { userProfile: user, fetchUserProfile, fetchMutations } = useUserStore();
  const { fetchInitialData } = usePOSStore();

  // Refs to prevent duplicate runs and handle cleanup safely
  const isInitializedRef = useRef(false);
  const lastProcessedUserRef = useRef<string | null>(null);
  const authStateRef = useRef(authState);

  // Keep ref in sync
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  // Robust profile fetching with retries and exponential backoff
  const fetchProfileWithRetry = useCallback(async (userId: string, retries = 3, initialDelay = 500): Promise<boolean> => {
    let delay = initialDelay;
    for (let i = 0; i < retries; i++) {
      console.log(`[ForsDig AuthProvider] [Profile Fetch Attempt ${i + 1}/${retries}] userId: ${userId}`);
      try {
        const success = await fetchUserProfile(userId);
        if (success) {
          console.log(`[ForsDig AuthProvider] Profile loaded successfully on attempt ${i + 1}`);
          return true;
        }
      } catch (err) {
        console.error(`[ForsDig AuthProvider] Attempt ${i + 1} profile fetch exception:`, err);
      }

      if (i < retries - 1) {
        console.warn(`[ForsDig AuthProvider] Retrying profile fetch in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
    return false;
  }, [fetchUserProfile]);

  // Unified function to fetch profile + initialize application data with safe handling
  const handleSessionResolution = useCallback(async (currentSession: any) => {
    const userId = currentSession?.user?.id || null;
    setCachedUserId(userId);

    if (!userId) {
      console.log('[ForsDig AuthProvider] Session cleared. Setting state to unauthenticated.');
      lastProcessedUserRef.current = null;
      setAuthState('unauthenticated');
      setIsSyncing(false);
      return;
    }

    // Check if this user is already the active processed session
    if (lastProcessedUserRef.current === userId && authStateRef.current === 'authenticated') {
      console.log(`[ForsDig AuthProvider] De-duplicated redundant processing for user: ${userId}`);
      return;
    }

    console.log(`[ForsDig AuthProvider] Transitioning to load workspace for user: ${userId}`);
    lastProcessedUserRef.current = userId;
    setIsSyncing(true);

    try {
      // 1. Fetch user profile from Database or Fallback
      const profileSuccess = await fetchProfileWithRetry(userId);
      
      if (profileSuccess) {
        setSession(currentSession);
        setAuthState('authenticated');
        
        console.log('[ForsDig AuthProvider] Initiating parallel master-data sync...');
        // 2. Fetch business products, transactions, other stores data in parallel
        await Promise.allSettled([
          fetchInitialData(),
          fetchMutations(userId)
        ]);
        console.log('[ForsDig AuthProvider] Workspace successfully initialized!');
      } else {
        console.error('[ForsDig AuthProvider] Critical: Profile creation or fetch failed completely.');
        toast.error('Gagal memuat detail profil usaha Anda. Silakan coba masuk kembali.');
        setAuthState('unauthenticated');
      }
    } catch (err: any) {
      console.error('[ForsDig AuthProvider] Error preparing user workspace:', err);
      toast.error('Gagal menyiapkan sistem kasir. Periksa jaringan Anda.');
      setAuthState('unauthenticated');
    } finally {
      setIsSyncing(false);
    }
  }, [fetchProfileWithRetry, fetchInitialData, fetchMutations]);

  // Main Authentication initialization effect (run once)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    console.log('[ForsDig AuthProvider] Mounting authentication hook, checking static configurations...');
    
    // Safety timeout to prevent infinite LoadingScreen in bad initialization conditions
    const safetyTimeout = setTimeout(() => {
      if (authStateRef.current === 'loading') {
        console.warn('[ForsDig AuthProvider] Initialization timeout. Forcing unauthenticated state.');
        setAuthState('unauthenticated');
      }
    }, 15000);

    const initializeAuth = async () => {
      // Handle Offline/Local Demo Mode if Supabase is not configured
      if (!isSupabaseConfigured) {
        const isDemoLoggedIn = localStorage.getItem('pos_demo_logged_in') === 'true';
        console.log('[ForsDig AuthProvider] Supabase not configured. Checking demo storage credentials:', isDemoLoggedIn);
        
        if (isDemoLoggedIn) {
          setIsSyncing(true);
          const success = await fetchUserProfile('demo-user-id');
          if (success) {
            setAuthState('authenticated');
            console.log('[ForsDig AuthProvider] Restored DEMO local offline workspace.');
          } else {
            setAuthState('unauthenticated');
          }
          setIsSyncing(false);
        } else {
          setAuthState('unauthenticated');
        }
        clearTimeout(safetyTimeout);
        return;
      }

      // Check current active session in Supabase client instance
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (initialSession) {
          console.log('[ForsDig AuthProvider] Found active session in client memory.');
          await handleSessionResolution(initialSession);
        } else {
          console.log('[ForsDig AuthProvider] No initial session found.');
          setAuthState('unauthenticated');
        }
      } catch (err) {
        console.error('[ForsDig AuthProvider] Initial session check failed:', err);
        setAuthState('unauthenticated');
      } finally {
        clearTimeout(safetyTimeout);
      }
    };

    initializeAuth();

    // If Supabase isn't active, we don't need a real db sub listener
    if (!isSupabaseConfigured) {
      return () => {
        clearTimeout(safetyTimeout);
      };
    }

    // Set up the ONLY Supabase auth state change handler for the entire app!
    console.log('[ForsDig AuthProvider] Setting up single DB auth sub listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[ForsDig AuthProvider] DB Auth State Change trigger: [${event}] for: ${currentSession?.user?.id || 'null'}`);
      
      // We only handle events of actual concern or de-duplicate
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setAuthState('unauthenticated');
        lastProcessedUserRef.current = null;
        setCachedUserId(null);
        return;
      }

      if (currentSession) {
        await handleSessionResolution(currentSession);
      } else {
        setSession(null);
        setAuthState('unauthenticated');
      }
    });

    // Cleanup: unsubscribe on component disposal to avoid memory leak
    return () => {
      clearTimeout(safetyTimeout);
      console.log('[ForsDig AuthProvider] Disposing database auth subscription...');
      subscription.unsubscribe();
    };
  }, [handleSessionResolution, fetchUserProfile]);

  // Explicit function to manually refresh profile
  const refreshProfile = useCallback(async (): Promise<boolean> => {
    const currentUserId = lastProcessedUserRef.current;
    if (!currentUserId) return false;
    
    setIsSyncing(true);
    try {
      const refreshed = await fetchUserProfile(currentUserId);
      return refreshed;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [fetchUserProfile]);

  // Log In operation wrapper
  const login = useCallback(async (
    email?: string, 
    password?: string,
    fullName?: string,
    phone?: string,
    isSignup = false
  ): Promise<{ success: boolean; message?: string }> => {
    setIsSyncing(true);
    
    try {
      // Demo authentication flow to handle lack of cloud instance seamlessly
      if (!isSupabaseConfigured) {
        localStorage.setItem('pos_demo_logged_in', 'true');
        const success = await fetchUserProfile('demo-user-id');
        if (success) {
          setAuthState('authenticated');
          toast.success('Masuk dalam Mode Demo (Offline)!');
          return { success: true };
        }
        return { success: false, message: 'Gagal inisialisasi sesi offline.' };
      }

      if (!email || !password) {
        return { success: false, message: 'Email dan sandi harus diisi.' };
      }

      if (isSignup) {
        // Sign-up process
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || 'Kasir',
              phone: phone || '',
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.session) {
          return { 
            success: true, 
            message: 'Pendaftaran berhasil! Silakan periksa email Anda untuk memverifikasi pendaftaran.' 
          };
        }
        
        // If auto-logged-in on signup
        if (data.session) {
          await handleSessionResolution(data.session);
          return { success: true };
        }
        return { success: true };
      } else {
        // Sign-in process
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          await handleSessionResolution(data.session);
          return { success: true };
        }
        return { success: false, message: 'Gagal membuat sesi login.' };
      }
    } catch (err: any) {
      console.error('[ForsDig AuthProvider] Execute operation exception:', err);
      return { success: false, message: err.message || 'Terjadi kesalahan sistem' };
    } finally {
      setIsSyncing(false);
    }
  }, [handleSessionResolution, fetchUserProfile]);

  // Logout wrapper
  const logout = useCallback(async () => {
    setIsSyncing(true);
    try {
      lastProcessedUserRef.current = null;
      setCachedUserId(null);

      if (!isSupabaseConfigured) {
        localStorage.removeItem('pos_demo_logged_in');
        setSession(null);
        setAuthState('unauthenticated');
        toast.success('Berhasil keluar dari Mode Demo.');
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setSession(null);
      setAuthState('unauthenticated');
      toast.success('Berhasil keluar dari akun.');
    } catch (err: any) {
      console.error('[ForsDig AuthProvider] Logout exception:', err);
      toast.error(`Gagal keluar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const valueValue = React.useMemo(() => ({
    user,
    session,
    authState,
    isSyncing,
    isSupabaseConfigured,
    login,
    logout,
    refreshProfile
  }), [user, session, authState, isSyncing, login, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={valueValue}>
      {children}
    </AuthContext.Provider>
  );
}
