import React, { createContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { isFirebaseConfigured, auth, db, setCachedUserId } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { useUserStore } from '../services/userStore';
import { usePOSStore } from '../services/posStore';
import { toast } from 'sonner';

export interface AuthContextType {
  user: UserProfile | null;
  session: any | null; // Bridged session compatibility object
  authState: 'loading' | 'authenticated' | 'unauthenticated';
  isSyncing: boolean;
  isFirebaseConfigured: boolean;
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
  const { fetchInitialData, resetStore } = usePOSStore();

  const isInitializedRef = useRef(false);
  const lastProcessedUserRef = useRef<string | null>(null);
  const authStateRef = useRef(authState);

  // Keep ref in sync
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  // Robust profile fetching with retries
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

    if (lastProcessedUserRef.current === userId && authStateRef.current === 'authenticated') {
      console.log(`[ForsDig AuthProvider] De-duplicated redundant processing for user: ${userId}`);
      return;
    }

    console.log(`[ForsDig AuthProvider] Transitioning to load workspace for user: ${userId}`);
    lastProcessedUserRef.current = userId;
    setIsSyncing(true);

    try {
      const profileSuccess = await fetchProfileWithRetry(userId);
      
      if (profileSuccess) {
        setSession(currentSession);
        setAuthState('authenticated');
        
        console.log('[ForsDig AuthProvider] Initiating parallel background master-data sync...');
        // Resolve immediately so the user doesn't wait for cloud collections.
        // Syncing happens in the background.
        Promise.allSettled([
          fetchInitialData(false),
          fetchMutations(userId)
        ]).then(() => {
          console.log('[ForsDig AuthProvider] Workspace background sync completed!');
        });
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

  // Main Authentication initialization
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    console.log('[ForsDig AuthProvider] Mounting authentication hook, checking static configurations...');
    
    const safetyTimeout = setTimeout(() => {
      if (authStateRef.current === 'loading') {
        console.warn('[ForsDig AuthProvider] Initialization timeout. Forcing unauthenticated state.');
        setAuthState('unauthenticated');
      }
    }, 15000);

    const initializeAuth = async () => {
      // Local Demo Mode fallback if Firebase is not configured
      if (!isFirebaseConfigured) {
        const isDemoLoggedIn = localStorage.getItem('pos_demo_logged_in') === 'true';
        console.log('[ForsDig AuthProvider] Firebase not configured. Checking demo storage credentials:', isDemoLoggedIn);
        
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

      // Read current state of auth. currentUser is not always populated immediately, 
      // the onAuthStateChanged listener below will handle the asynchronous state dispatch!
      clearTimeout(safetyTimeout);
    };

    initializeAuth();

    if (!isFirebaseConfigured) {
      return () => {};
    }

    console.log('[ForsDig AuthProvider] Setting up single Firebase auth state change listener...');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log(`[ForsDig AuthProvider] Firebase Auth state changed: Logged in as uid: ${firebaseUser.uid}`);
        const fakeSession = {
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email,
          }
        };
        await handleSessionResolution(fakeSession);
      } else {
        console.log('[ForsDig AuthProvider] Firebase Auth state changed: Signed out');
        setSession(null);
        setAuthState('unauthenticated');
        lastProcessedUserRef.current = null;
        setCachedUserId(null);
      }
    });

    return () => {
      console.log('[ForsDig AuthProvider] Disposing database auth subscription...');
      unsubscribe();
    };
  }, [handleSessionResolution, fetchUserProfile]);

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

  // Log In / Sign Up operation
  const login = useCallback(async (
    email?: string, 
    password?: string,
    fullName?: string,
    phone?: string,
    isSignup = false
  ): Promise<{ success: boolean; message?: string }> => {
    setIsSyncing(true);
    
    try {
      if (!isFirebaseConfigured) {
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        await updateProfile(fbUser, {
          displayName: fullName || 'Kasir'
        });

        // Initialize user profile in Firestore
        const fallbackProfile = {
          id: fbUser.uid,
          username: email.split('@')[0],
          fullName: fullName || 'Pemilik Smart POS',
          email: email,
          phone: phone || '',
          role: 'admin',
          balance: 0,
          subscriptionStatus: 'active',
          packageType: 'FREE',
          status: 'active',
          createdAt: Date.now()
        };

        try {
          await setDoc(doc(db, 'profiles', fbUser.uid), fallbackProfile);
          console.log("[AuthProvider] Profile registered in Firestore!");
        } catch (dbErr) {
          console.warn("[AuthProvider] Error writing initial profile to Firestore:", dbErr);
        }

        const fakeSession = {
          user: {
            id: fbUser.uid,
            email: fbUser.email,
          }
        };
        await handleSessionResolution(fakeSession);
        return { success: true };
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        const fakeSession = {
          user: {
            id: fbUser.uid,
            email: fbUser.email,
          }
        };
        await handleSessionResolution(fakeSession);
        return { success: true };
      }
    } catch (err: any) {
      console.error('[ForsDig AuthProvider] Execute operation exception:', err);
      let errMsg = 'Terjadi kesalahan sistem';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = 'Email atau kata sandi salah.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Email tersebut sudah terdaftar.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Kata sandi terlalu lemah (minimal 6 karakter).';
      } else if (err.message) {
        errMsg = err.message;
      }
      return { success: false, message: errMsg };
    } finally {
      setIsSyncing(false);
    }
  }, [handleSessionResolution, fetchUserProfile]);

  const logout = useCallback(async () => {
    setIsSyncing(true);
    try {
      lastProcessedUserRef.current = null;
      setCachedUserId(null);
      resetStore();
      localStorage.removeItem('pos_local_user_profile');

      if (!isFirebaseConfigured) {
        localStorage.removeItem('pos_demo_logged_in');
        setSession(null);
        setAuthState('unauthenticated');
        toast.success('Berhasil keluar dari Mode Demo.');
        return;
      }

      await signOut(auth);
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

  const valueValue = useMemo(() => ({
    user,
    session,
    authState,
    isSyncing,
    isFirebaseConfigured,
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
