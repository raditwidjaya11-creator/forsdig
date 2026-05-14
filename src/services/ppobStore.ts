import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PPOBService, PPOBTransaction, BalanceMutation, UserProfile, UserMarkup } from '../types';
import axios from 'axios';
import { snakeToCamel, saveData, deleteData } from './supabaseService';
import { generateUUID } from '../lib/utils';
import { toast } from 'sonner';

// Configure axios with a default timeout
const api = axios.create({
  timeout: 15000 // 15 seconds
});

interface PPOBState {
  services: PPOBService[];
  transactions: PPOBTransaction[];
  mutations: BalanceMutation[];
  userProfile: UserProfile | null;
  userMarkups: UserMarkup[];
  users: UserProfile[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchServices: () => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  fetchMutations: (userId: string) => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<boolean>;
  fetchUserMarkups: (userId: string) => Promise<void>;
  fetchUsers: () => Promise<void>;
  adjustBalance: (data: {
    userId: string;
    amount: number;
    type: 'topup' | 'deduction';
    description: string;
  }) => Promise<boolean>;
  
  calculateFinalPrice: (service: PPOBService) => number;
  
  createTransaction: (data: {
    service: PPOBService;
    customerNumber: string;
    userId: string;
    outletId: string;
  }) => Promise<PPOBTransaction | null>;
  
  syncTransactionStatus: (txId: string) => Promise<boolean>;
  syncBalance: (userId: string) => Promise<void>;
  syncWithTripay: (provider?: 'Tripay' | 'Digiflazz') => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addMarkup: (markup: UserMarkup) => Promise<void>;
  deleteMarkup: (id: string) => Promise<void>;
}

export const usePPOBStore = create<PPOBState>((set, get) => ({
  services: [],
  transactions: [],
  mutations: [],
  userProfile: null,
  userMarkups: [],
  users: [],
  isLoading: false,
  error: null,

  calculateFinalPrice: (service: PPOBService) => {
    const { userProfile, userMarkups } = get();
    const baseTotal = service.basePrice + service.adminMarkup;
    if (!userProfile) return baseTotal;

    // Priority 1: Product specific markup
    const productMarkup = userMarkups.find(m => m.productId === service.id);
    if (productMarkup) return baseTotal + productMarkup.markup;

    // Priority 2: Category specific markup
    const categoryMarkup = userMarkups.find(m => m.categoryName === service.category);
    if (categoryMarkup) return baseTotal + categoryMarkup.markup;

    // Priority 3: User default markup
    const defaultUserMarkup = userProfile.defaultMarkup || 0;
    return baseTotal + defaultUserMarkup;
  },

  fetchUserMarkups: async (userId) => {
    if (!isSupabaseConfigured || userId === 'demo-user-id') return;
    try {
      const { data, error } = await supabase
        .from('user_markups')
        .select('*')
        .eq('user_id', userId);
      
      if (!error) {
        const markups = (data || []).map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          productId: m.product_id,
          categoryName: m.category_name,
          markup: Number(m.markup),
          createdAt: m.created_at
        }));
        set({ userMarkups: markups });
      }
    } catch (err) {
      console.error('Error fetching markups:', err);
    }
  },

  syncWithTripay: async (provider: 'Tripay' | 'Digiflazz' = 'Tripay') => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/api/ppob/sync', { provider });
      await get().fetchServices();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: `Gagal sinkronasi dengan ${provider}`, isLoading: false });
    }
  },

  fetchServices: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use our server proxy for better reliability and consistency
      const response = await api.get('/api/ppob/products');
      const data = response.data;
        
      const services = (data || []).map((s: any) => ({
        id: s.id,
        category: s.category,
        code: s.code,
        name: s.name,
        provider: s.provider,
        basePrice: Number(s.base_price),
        adminMarkup: Number(s.admin_markup),
        sellingPrice: Number(s.selling_price),
        isActive: s.is_active,
        description: s.description,
        updatedAt: s.updated_at
      }));
      
      set({ services, isLoading: false });
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorInfo = typeof errorData === 'string' ? errorData : (errorData?.error || errorData?.message);
      const errorMsg = String(errorInfo || err.message || "Unknown error");
      
      console.error("[PPOB] Fetch Services Error:", errorMsg);
      
      let friendlyError = `Gagal memuat layanan: ${errorMsg}`;
      const safeErrorMsg = errorMsg.toLowerCase();
      
      if (safeErrorMsg.includes('permission denied')) {
        friendlyError = "Izin ditolak untuk mengakses layanan PPOB.";
      } else if (safeErrorMsg.includes('table_not_found') || safeErrorMsg.includes('not found')) {
        friendlyError = "Layanan PPOB belum dikonfigurasi di database.";
      }
      
      set({ error: friendlyError, isLoading: false });
    }
  },

  fetchTransactions: async (userId) => {
    if (!isSupabaseConfigured || userId === 'demo-user-id') {
      return;
    }

    const { data, error } = await supabase
      .from('ppob_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (!error) {
      const transactions = (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        productId: t.product_id,
        customerNumber: t.customer_number,
        sellingPrice: Number(t.selling_price),
        profitAdmin: Number(t.profit_admin),
        profitUser: Number(t.profit_user),
        status: t.status,
        reference: t.reference,
        sn: t.sn,
        details: t.details,
        createdAt: t.created_at
      }));
      set({ transactions });
    }
  },

  fetchMutations: async (userId) => {
    if (!isSupabaseConfigured || userId === 'demo-user-id') {
      return;
    }

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
        timestamp: new Date(m.timestamp).getTime(),
        userName: m.profiles?.full_name || m.profiles?.username
      }));
      set({ mutations });
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

  adjustBalance: async (data) => {
    set({ isLoading: true });
    try {
      await api.post('/api/admin/adjust-balance', data);
      await get().fetchUsers();
      // Only fetch if a valid user ID is available, or use a separate admin fetch
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

  fetchUserProfile: async (userId) => {
    if (!userId || String(userId) === 'undefined' || String(userId) === 'null') {
      console.warn("[PPOB] fetchUserProfile dipanggil dengan ID tidak valid:", userId);
      return false;
    }

    if (!isSupabaseConfigured || userId === 'demo-user-id') {
      console.log("[PPOB] Menggunakan profil demo...");
      set({ userProfile: {
        id: userId,
        username: 'demo_user',
        fullName: 'Demo User',
        email: 'demo@forsdig.com',
        phone: '08123456789',
        role: 'admin',
        balance: 1000000,
        defaultMarkup: 0,
        minMarkup: 0,
        maxMarkup: 5000,
        subscriptionStatus: 'active',
        packageType: 'FREE',
        status: 'active',
        createdAt: Date.now()
      }});
      return true;
    }

    try {
      console.log(`[PPOB] Memulai fetchUserProfile untuk: ${userId}`);
      // Use backend proxy to bypass RLS/permission issues
      const response = await api.get(`/api/user/profile/${userId}`);
      
      if (!response.data || typeof response.data !== 'object') {
        console.error("[PPOB] Response data profil tidak valid atau kosong:", response.data);
        throw new Error("Data profil tidak valid diterima dari server");
      }

      const data = response.data;
      console.log("[PPOB] Data profil berhasil diterima:", {
        id: data.id,
        username: data.username,
        role: data.role,
        balance: data.balance
      });

      set({ userProfile: {
        id: data.id,
        username: data.username || `user_${String(data.id || '').substring(0, 5)}`,
        fullName: data.full_name || 'User',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || 'kasir',
        balance: Number(data.balance || 0),
        defaultMarkup: Number(data.default_markup || 0),
        minMarkup: Number(data.min_markup || 0),
        maxMarkup: Number(data.max_markup || 10000),
        subscriptionStatus: data.subscription_status || 'active',
        packageType: data.package_type || 'FREE',
        status: data.status || 'active',
        createdAt: data.created_at || Date.now()
      }});
      
      return true;
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorInfo = typeof errorData === 'string' ? errorData : (errorData?.error || errorData?.message);
      const errorMsg = String(errorInfo || err.message || "Unknown error");
      
      console.error("[PPOB] Fetch Profile Error Detail:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        type: typeof errorMsg
      });
      
      let friendlyError = `Gagal memuat profil: ${errorMsg}`;
      
      // Safe string check for includes
      const safeErrorMsg = errorMsg.toLowerCase();
      
      if (safeErrorMsg.includes('permission denied')) {
        friendlyError = "Izin ditolak untuk mengakses data profil pengguna.";
      } else if (safeErrorMsg.includes('not found') || err.response?.status === 404) {
        friendlyError = "Profil pengguna tidak ditemukan (404).";
      } else if (err.response?.status === 400) {
        friendlyError = "Permintaan profil tidak valid (ID salah).";
      }
      
      set({ error: friendlyError });
      toast.error(friendlyError);
      return false;
    }
  },

  syncTransactionStatus: async (txId: string) => {
    const tx = get().transactions.find(t => t.id === txId);
    if (!tx || !tx.reference) return false;

    // Demo mode bypass
    if (!isSupabaseConfigured || tx.userId === 'demo-user-id') {
      return true;
    }

    set({ isLoading: true });
    try {
      // Retry logic for obtaining status
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await api.get(`/api/ppob/check-status/${tx.reference}`);
          break;
        } catch (e) {
          retries--;
          if (retries === 0) throw e;
          await new Promise(res => setTimeout(res, 1000));
        }
      }

      const data = response?.data?.data;

      if (data && data.status) {
        let newStatus = tx.status;
        if (data.status === 'Success') newStatus = 'success';
        else if (data.status === 'Gagal') newStatus = 'failed';

        // Update if status changed
        if (newStatus !== tx.status) {
          const { error } = await supabase
            .from('ppob_transactions')
            .update({ 
              status: newStatus, 
              sn: data.sn || tx.sn,
              details: { ...tx.details, api_note: data.note || '' }
            })
            .eq('id', txId);

          if (error) throw error;

          // If failed, auto-refund
          if (newStatus === 'failed') {
            await supabase.rpc('process_transaction', {
              p_user_id: tx.userId,
              p_amount: tx.sellingPrice,
              p_type: 'refund',
              p_description: `Refund: Transaksi Gagal`,
              p_reference_id: txId
            });
            await get().syncBalance(tx.userId);
          }

          // Refresh transactions
          await get().fetchTransactions(tx.userId);
        }
        set({ isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (err: any) {
      console.error("[PPOB] Sync Status Error:", err.message);
      set({ error: `Gagal sinkronasi status: ${err.message}`, isLoading: false });
      return false;
    }
  },

  createTransaction: async (data) => {
    const { service, customerNumber, userId, outletId } = data;
    
    // Calculate User Markup
    const finalPrice = get().calculateFinalPrice(service);
    const userMarkup = finalPrice - (service.basePrice + service.adminMarkup);
    const adminMarkup = service.adminMarkup;
    
    const apiRef = `POS-${userId.slice(0, 4)}-${Date.now()}`;
    const provider = service.provider || 'Tripay';
    
    set({ isLoading: true, error: null });
    
    try {
      // Handle Demo Mode
      if (!isSupabaseConfigured || userId === 'demo-user-id') {
        const demoTx: PPOBTransaction = {
          id: generateUUID(),
          userId,
          productId: service.id,
          customerNumber,
          sellingPrice: finalPrice,
          profitAdmin: adminMarkup,
          profitUser: userMarkup,
          status: 'success',
          createdAt: new Date().toISOString(),
          reference: apiRef,
          sn: '1234567890'
        };
        
        // Mock balance update
        const currentProfile = get().userProfile;
        if (currentProfile) {
          set({ userProfile: { ...currentProfile, balance: currentProfile.balance - finalPrice } as UserProfile });
        }
        
        set({ transactions: [demoTx, ...get().transactions], isLoading: false });
        return demoTx;
      }

      // 1. Double check balance
      let profile;
      try {
        const profileRes = await api.get(`/api/user/profile/${userId}`);
        profile = profileRes.data;
      } catch (profErr: any) {
        throw new Error(`Gagal mengambil profil pengguna: ${profErr.response?.data?.error || profErr.message}`);
      }
      
      if (!profile) throw new Error('Profil pengguna tidak ditemukan');
      if (profile.balance < finalPrice) {
        throw new Error(`Saldo tidak cukup. Dibutuhkan ${finalPrice}, saldo saat ini ${profile.balance}`);
      }

      // 3. Save Pending Transaction to DB first
      const { data: newTx, error: txErr } = await supabase
        .from('ppob_transactions')
        .insert({
          user_id: userId,
          product_id: service.id,
          customer_number: customerNumber,
          selling_price: finalPrice,
          profit_admin: adminMarkup,
          profit_user: userMarkup,
          status: 'pending',
          reference: apiRef,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (txErr) throw txErr;

      // 4. Deduct balance
      const { error: rpcErr } = await supabase.rpc('process_transaction', {
        p_user_id: userId,
        p_amount: -finalPrice,
        p_type: 'transaction',
        p_description: `PPOB ${service.name} - ${customerNumber}`,
        p_reference_id: newTx.id
      });

      if (rpcErr) {
        await supabase.from('ppob_transactions').delete().eq('id', newTx.id);
        throw new Error(`Gagal memotong saldo: ${rpcErr.message}`);
      }

      // 5. Call Backend API
      let apiResponse;
      try {
        apiResponse = await api.post('/api/ppob/transaction', {
          productCode: service.code,
          customerNumber: customerNumber,
          ref: apiRef,
          provider
        });
      } catch (apiErr: any) {
          // If API fails, status remains pending, we will sync later
          console.error("API Error during transaction:", apiErr);
      }

      const responseData = apiResponse?.data?.data;
      
      // 6. Update transaction
      const { data: updatedTx } = await supabase
        .from('ppob_transactions')
        .update({
          reference: responseData?.reference || apiRef,
          status: responseData?.status === 'Success' ? 'success' : 
                  responseData?.status === 'Gagal' ? 'failed' : 'pending',
          sn: responseData?.sn || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', newTx.id)
        .select()
        .single();

      // 7. Auto-refund if Gagal
      if (responseData?.status === 'Gagal') {
        await supabase.rpc('process_transaction', {
          p_user_id: userId,
          p_amount: finalPrice,
          p_type: 'refund',
          p_description: `Refund: Transaksi Gagal (${responseData?.note || 'API Error'})`,
          p_reference_id: newTx.id
        });
      }

      set({ isLoading: false });
      await get().syncBalance(userId);
      await get().fetchTransactions(userId);
      
      return snakeToCamel(updatedTx);
    } catch (err: any) {
      console.error("[PPOB] Transaction Flow Error:", err);
      set({ error: err.message || "Transaksi gagal diproses", isLoading: false });
      await get().syncBalance(userId);
      await get().fetchTransactions(userId);
      return null;
    }
  },

  syncBalance: async (userId) => {
    await get().fetchUserProfile(userId);
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

  addMarkup: async (markup) => {
    const { userMarkups } = get();
    set({ userMarkups: [...userMarkups, markup] });
    try {
      await saveData('user_markups' as any, markup);
    } catch (err) {
      console.error('Failed to add markup:', err);
    }
  },

  deleteMarkup: async (id) => {
    const { userMarkups } = get();
    set({ userMarkups: userMarkups.filter(m => m.id !== id) });
    try {
      await deleteData('user_markups' as any, id);
    } catch (err) {
      console.error('Failed to delete markup:', err);
    }
  }
}));
