import { create } from 'zustand';
import { isFirebaseConfigured, auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, orderBy, getDocs } from 'firebase/firestore';
import { UserProfile, BalanceMutation } from '../types';
import axios from 'axios';
import { saveData } from './firebaseService';

const api = axios.create({
  timeout: 15000
});

interface UserState {
  userProfile: UserProfile | null;
  users: UserProfile[];
  mutations: BalanceMutation[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchUserProfile: (userId: string) => Promise<boolean>;
  fetchUsers: () => Promise<void>;
  fetchMutations: (userId: string) => Promise<void>;
  adjustBalance: (data: {
    userId: string;
    amount: number;
    type: 'topup' | 'deduction';
    description: string;
  }) => Promise<boolean>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  syncBalance: (userId: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  userProfile: null,
  users: [],
  mutations: [],
  isLoading: false,
  error: null,

  fetchUserProfile: async (userId) => {
    if (!userId || String(userId) === 'undefined' || String(userId) === 'null') {
      console.warn("[UserStore] fetchUserProfile: Invalid user ID", userId);
      return false;
    }

    // 1. Check local cache first for instant, near-zero loading experience on page load!
    const cachedProfileRaw = localStorage.getItem('pos_local_user_profile');
    if (cachedProfileRaw) {
      try {
        const cachedProfile = JSON.parse(cachedProfileRaw);
        if (cachedProfile && cachedProfile.id === userId) {
          set({ userProfile: cachedProfile });
          
          // Trigger asynchronous background refresh without blocking the main workflow!
          if (isFirebaseConfigured && userId !== 'demo-user-id') {
            (async () => {
              try {
                const docRef = doc(db, 'profiles', userId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  const freshProfile: UserProfile = {
                    id: docSnap.id,
                    username: data.username || `user_${String(docSnap.id).substring(0, 5)}`,
                    fullName: data.fullName || data.full_name || 'User',
                    email: data.email || '',
                    phone: data.phone || '',
                    role: (data.role === 'user' ? 'user' : 'admin') as 'admin' | 'user',
                    balance: Number(data.balance || 0),
                    subscriptionStatus: (data.subscriptionStatus || data.subscription_status || 'active') as 'active' | 'expired' | 'suspended',
                    packageType: data.packageType || data.package_type || 'FREE',
                    status: (data.status || 'active') as 'active' | 'blocked',
                    createdAt: data.createdAt || data.created_at || Date.now()
                  };
                  set({ userProfile: freshProfile });
                  localStorage.setItem('pos_local_user_profile', JSON.stringify(freshProfile));
                }
              } catch (bgErr) {
                console.warn("[UserStore Background] Silent profile refresh failed:", bgErr);
              }
            })();
          }
          return true;
        }
      } catch (cacheErr) {
        console.warn("[UserStore] Error parsing cached user profile profile:", cacheErr);
      }
    }

    if (!isFirebaseConfigured || userId === 'demo-user-id') {
      const demoProfile: UserProfile = {
        id: userId,
        username: 'demo_user',
        fullName: 'Demo User',
        email: 'demo@forsdig.com',
        phone: '08123456789',
        role: 'admin',
        balance: 1000000,
        subscriptionStatus: 'active',
        packageType: 'FREE',
        status: 'active',
        createdAt: Date.now()
      };
      set({ userProfile: demoProfile });
      localStorage.setItem('pos_local_user_profile', JSON.stringify(demoProfile));
      return true;
    }

    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.warn("[UserStore] Profile not found in Firebase Firestore for userId:", userId, "Auto-creating profile row...");
        let email = 'user@forsdig.com';
        let fullName = 'Pemilik Smart POS';
        let phone = '';

        try {
          const user = auth.currentUser;
          if (user) {
            email = user.email || email;
            fullName = user.displayName || fullName;
            phone = user.phoneNumber || phone;
          }
        } catch (uErr) {
          console.warn("[UserStore] Could not fetch authenticated user details:", uErr);
        }

        const fallbackProfile: UserProfile = {
          id: userId,
          username: email ? email.split('@')[0] : `user_${String(userId).substring(0, 5)}`,
          fullName: fullName,
          email: email,
          phone: phone,
          role: 'admin',
          balance: 0,
          subscriptionStatus: 'active',
          packageType: 'FREE',
          status: 'active',
          createdAt: Date.now()
        };

        try {
          await setDoc(doc(db, 'profiles', userId), fallbackProfile);
          console.log("[UserStore] Profile row successfully created in database.");
        } catch (dbErr) {
          console.warn("[UserStore] Database insert exception, proceeding with local fallback state:", dbErr);
        }

        set({ userProfile: fallbackProfile });
        localStorage.setItem('pos_local_user_profile', JSON.stringify(fallbackProfile));
        return true;
      }

      const data = docSnap.data();
      const loadedProfile: UserProfile = {
        id: docSnap.id,
        username: data.username || `user_${String(docSnap.id).substring(0, 5)}`,
        fullName: data.fullName || data.full_name || 'User',
        email: data.email || '',
        phone: data.phone || '',
        role: (data.role === 'user' ? 'user' : 'admin') as 'admin' | 'user',
        balance: Number(data.balance || 0),
        subscriptionStatus: data.subscriptionStatus || data.subscription_status || 'active',
        packageType: data.packageType || data.package_type || 'FREE',
        status: data.status || 'active',
        createdAt: data.createdAt || data.created_at || Date.now()
      };

      set({ userProfile: loadedProfile });
      localStorage.setItem('pos_local_user_profile', JSON.stringify(loadedProfile));
      return true;
    } catch (err: any) {
      console.error("[UserStore] fetchUserProfile Failure:", err.message);
      // Even if fetchUserProfile fails because of network/DB issues, provide a local-first profile
      // so the app stays functional and responsive rather than hanging
      const localFallbackProfile: UserProfile = {
        id: userId,
        username: `user_${String(userId).substring(0, 5)}`,
        fullName: 'Pemilik Toko (Lokal)',
        email: '',
        phone: '',
        role: 'admin',
        balance: 0,
        subscriptionStatus: 'active',
        packageType: 'FREE',
        status: 'active',
        createdAt: Date.now()
      };
      set({ userProfile: localFallbackProfile });
      localStorage.setItem('pos_local_user_profile', JSON.stringify(localFallbackProfile));
      return true;
    }
  },

  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/api/admin/users');
      const data = response.data;
      const users = (data || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName || u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        balance: u.balance,
        status: u.status,
        createdAt: u.createdAt || new Date(u.created_at).getTime()
      }));
      set({ users, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMutations: async (userId) => {
    if (!isFirebaseConfigured || userId === 'demo-user-id') return;

    try {
      const q = query(
        collection(db, 'balance_mutations'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const mutations: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const m = docSnap.data();
        mutations.push({
          id: docSnap.id,
          userId: m.userId || m.user_id,
          amount: m.amount,
          type: m.type,
          description: m.description,
          referenceId: m.referenceId || m.reference_id,
          previousBalance: m.previousBalance || m.previous_balance,
          currentBalance: m.currentBalance || m.current_balance,
          timestamp: m.timestamp
        });
      });
      set({ mutations });
    } catch (err) {
      console.error("[UserStore] fetchMutations Error:", err);
    }
  },

  adjustBalance: async (data) => {
    set({ isLoading: true });
    try {
      await api.post('/api/admin/adjust-balance', data);
      await get().fetchUsers();
      if (data.userId !== 'all') {
        await get().fetchMutations(data.userId);
      }
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  updateUserProfile: async (profile) => {
    const { userProfile } = get();
    if (!userProfile) return;
    const updated = { ...userProfile, ...profile };
    set({ userProfile: updated });
    try {
      await saveData('profiles', updated);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  },

  syncBalance: async (userId) => {
    await get().fetchUserProfile(userId);
  }
}));
