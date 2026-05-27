import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, BalanceMutation } from '../types';
import axios from 'axios';
import { saveData } from './supabaseService';

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

    if (!isSupabaseConfigured || userId === 'demo-user-id') {
      set({ userProfile: {
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
      }});
      return true;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        console.warn("[UserStore] Profile not found in DB for userId:", userId, "Auto-creating profile row...");
        let email = 'user@forsdig.com';
        let fullName = 'Pemilik Smart POS';
        let phone = '';

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            email = user.email || email;
            fullName = user.user_metadata?.full_name || user.user_metadata?.fullName || fullName;
            phone = user.user_metadata?.phone || phone;
          }
        } catch (uErr) {
          console.warn("[UserStore] Could not fetch authenticated user details:", uErr);
        }

        const fallbackProfile = {
          id: userId,
          username: email ? email.split('@')[0] : `user_${String(userId).substring(0, 5)}`,
          full_name: fullName,
          email: email,
          phone: phone,
          role: 'admin',
          balance: 0,
          subscription_status: 'active',
          package_type: 'FREE',
          status: 'active',
          created_at: new Date().toISOString()
        };

        try {
          const { data: insertedData, error: insertError } = await supabase
            .from('profiles')
            .insert(fallbackProfile)
            .select()
            .maybeSingle();

          if (insertError) {
            console.warn("[UserStore] Failed to insert profile into database, using local fallback state so user can proceed:", insertError);
          } else if (insertedData) {
            console.log("[UserStore] Profile row successfully created in database:", insertedData);
          }
        } catch (dbErr) {
          console.warn("[UserStore] Database insert exception, proceeding with local fallback state:", dbErr);
        }

        set({ userProfile: {
          id: userId,
          username: fallbackProfile.username,
          fullName: fallbackProfile.full_name,
          email: fallbackProfile.email,
          phone: fallbackProfile.phone,
          role: 'admin',
          balance: 0,
          subscriptionStatus: 'active',
          packageType: 'FREE',
          status: 'active',
          createdAt: Date.now()
        }});
        return true;
      }

      set({ userProfile: {
        id: data.id,
        username: data.username || `user_${String(data.id).substring(0, 5)}`,
        fullName: data.full_name || 'User',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || 'kasir',
        balance: Number(data.balance || 0),
        subscriptionStatus: data.subscription_status || 'active',
        packageType: data.package_type || 'FREE',
        status: data.status || 'active',
        createdAt: data.created_at || Date.now()
      }});
      
      return true;
    } catch (err: any) {
      console.error("[UserStore] fetchUserProfile Failure:", err.message);
      // Even if fetchUserProfile fails because of network/DB issues, provide a local-first profile
      // so the app stays functional and responsive rather than hanging
      set({ userProfile: {
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
      }});
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
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        balance: u.balance,
        status: u.status,
        createdAt: new Date(u.created_at).getTime()
      }));
      set({ users, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMutations: async (userId) => {
    if (!isSupabaseConfigured || userId === 'demo-user-id') return;

    const { data, error } = await supabase
      .from('balance_mutations')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
      
    if (!error) {
      const mutations = (data || []).map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        amount: m.amount,
        type: m.type,
        description: m.description,
        referenceId: m.reference_id,
        previousBalance: m.previous_balance,
        currentBalance: m.current_balance,
        timestamp: new Date(m.timestamp).getTime()
      }));
      set({ mutations });
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
