import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PPOBService, PPOBTransaction, BalanceMutation, User } from '../types';
import axios from 'axios';

interface PPOBState {
  services: PPOBService[];
  transactions: PPOBTransaction[];
  mutations: BalanceMutation[];
  userProfile: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchServices: () => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  fetchMutations: (userId: string) => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<void>;
  
  createTransaction: (data: {
    service: PPOBService;
    customerNumber: string;
    userId: string;
    outletId: string;
  }) => Promise<PPOBTransaction | null>;
  
  syncTransactionStatus: (txId: string) => Promise<boolean>;
  syncBalance: (userId: string) => Promise<void>;
}

export const usePPOBStore = create<PPOBState>((set, get) => ({
  // ... existing state ...
  services: [],
  transactions: [],
  mutations: [],
  userProfile: null,
  isLoading: false,
  error: null,

  fetchServices: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use our server proxy for better reliability and consistency
      const response = await axios.get('/api/ppob/products');
      const data = response.data;
        
      const services = (data || []).map((s: any) => ({
        id: s.id,
        category: s.category,
        code: s.code,
        name: s.name,
        provider: s.provider,
        basePrice: s.base_price,
        markupPrice: s.markup_price,
        adminFee: s.admin_fee,
        isActive: s.is_active,
        desc: s.description
      }));
      
      set({ services, isLoading: false });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      console.error("[PPOB] Fetch Services Error:", errorMsg);
      
      let friendlyError = `Gagal memuat layanan: ${errorMsg}`;
      if (errorMsg.includes('permission denied')) {
        friendlyError = "Izin ditolak untuk mengakses tabel 'ppob_services'. Silakan jalankan SQL schema terbaru di dashboard Supabase (terutama bagian GRANT service_role).";
      } else if (errorMsg.includes('TABLE_NOT_FOUND')) {
        friendlyError = "Tabel 'ppob_services' tidak ditemukan. Pastikan Anda sudah menjalankan SQL schema di Supabase dashboard.";
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
      .order('timestamp', { ascending: false });
      
    if (!error) {
      const transactions = (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        outletId: t.outlet_id,
        serviceId: t.service_id,
        customerNumber: t.customer_number,
        productName: t.product_name,
        productCode: t.product_code,
        amount: t.amount,
        markup: t.markup,
        adminFee: t.admin_fee,
        total: t.total,
        status: t.status,
        reference: t.reference,
        sn: t.sn,
        timestamp: new Date(t.timestamp).getTime(),
        updatedAt: t.updated_at ? new Date(t.updated_at).getTime() : undefined,
        paymentMethod: t.payment_method,
        notes: t.notes
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
        timestamp: new Date(m.timestamp).getTime()
      }));
      set({ mutations });
    }
  },

  fetchUserProfile: async (userId) => {
    if (!isSupabaseConfigured || userId === 'demo-user-id') {
      set({ userProfile: {
        id: userId,
        username: 'demo_user',
        fullName: 'Demo User',
        email: 'demo@forsdig.com',
        phone: '08123456789',
        role: 'admin',
        balance: 1000000,
        status: 'active',
        createdAt: Date.now()
      }});
      return;
    }

    try {
      // Use backend proxy to bypass RLS/permission issues
      const response = await axios.get(`/api/user/profile/${userId}`);
      const data = response.data;

      if (data) {
        set({ userProfile: {
          id: data.id,
          username: data.username,
          fullName: data.full_name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          balance: data.balance,
          status: data.status,
          createdAt: new Date(data.created_at).getTime()
        }});
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      console.error("[PPOB] Fetch Profile Error:", errorMsg);
      
      let friendlyError = `Gagal memuat profil: ${errorMsg}`;
      
      if (errorMsg.includes('permission denied')) {
        friendlyError = "Izin ditolak untuk mengakses tabel 'profiles'. Pastikan SUPABASE_SERVICE_ROLE_KEY di server sudah benar dan kebijakan RLS (Row Level Security) sudah dikonfigurasi.";
      } else if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
        friendlyError = `Struktur tabel 'profiles' tidak sesuai (kolom hilang: ${errorMsg}). Silakan jalankan ulang SQL schema di dashboard Supabase.`;
      }
      
      set({ error: friendlyError });
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
          response = await axios.get(`/api/ppob/check-status/${tx.reference}`);
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
              notes: data.note || tx.notes,
              updated_at: new Date().toISOString()
            })
            .eq('id', txId);

          if (error) throw error;

          // If failed, auto-refund
          if (newStatus === 'failed') {
            await supabase.rpc('process_transaction', {
              p_user_id: tx.userId,
              p_amount: tx.total,
              p_type: 'refund',
              p_description: `Refund: Transaksi ${tx.productName} Gagal`,
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
    const total = service.basePrice + service.markupPrice + service.adminFee;
    const apiRef = `POS-${userId.slice(0, 4)}-${Date.now()}`;
    
    set({ isLoading: true, error: null });
    
    try {
      // Handle Demo Mode
      if (!isSupabaseConfigured || userId === 'demo-user-id') {
        const demoTx: PPOBTransaction = {
          id: `DEMO-${Date.now()}`,
          userId,
          outletId,
          serviceId: service.id,
          customerNumber,
          productName: service.name,
          productCode: service.code,
          amount: service.basePrice,
          markup: service.markupPrice,
          adminFee: service.adminFee,
          total,
          status: 'success',
          timestamp: Date.now(),
          paymentMethod: 'Saldo',
          reference: apiRef,
          sn: '1234567890'
        };
        
        // Mock balance update
        const currentProfile = get().userProfile;
        if (currentProfile) {
          set({ userProfile: { ...currentProfile, balance: currentProfile.balance - total } });
        }
        
        set({ transactions: [demoTx, ...get().transactions], isLoading: false });
        return demoTx;
      }

      // 1. Double check balance via backend to bypass RLS issues
      let profile;
      try {
        const profileRes = await axios.get(`/api/user/profile/${userId}`);
        profile = profileRes.data;
      } catch (profErr: any) {
        throw new Error(`Gagal mengambil profil pengguna: ${profErr.response?.data?.error || profErr.message}`);
      }
      
      if (!profile) throw new Error('Profil pengguna tidak ditemukan');
      if (profile.balance < total) {
        throw new Error(`Saldo tidak cukup. Dibutuhkan ${total}, saldo saat ini ${profile.balance}`);
      }

      // 2. Already prepared above

      // 3. Save Pending Transaction to DB first
      const { data: newTx, error: txErr } = await supabase
        .from('ppob_transactions')
        .insert({
          user_id: userId,
          outlet_id: outletId,
          service_id: service.id,
          customer_number: customerNumber,
          product_name: service.name,
          product_code: service.code,
          amount: service.basePrice,
          markup: service.markupPrice,
          admin_fee: service.adminFee,
          total: total,
          status: 'pending',
          payment_method: 'Saldo',
          reference: apiRef
        })
        .select()
        .single();

      if (txErr) throw txErr;

      // 4. Deduct balance using RPC
      const { error: rpcErr } = await supabase.rpc('process_transaction', {
        p_user_id: userId,
        p_amount: -total,
        p_type: 'transaction',
        p_description: `PPOB ${service.name} - ${customerNumber}`,
        p_reference_id: newTx.id
      });

      if (rpcErr) {
        // Rollback transaction record if balance deduction fails
        await supabase.from('ppob_transactions').delete().eq('id', newTx.id);
        throw new Error(`Gagal memotong saldo: ${rpcErr.message}`);
      }

      // 5. Call Backend API to Tripay with retry
      let tripayResponse;
      let retries = 2;
      while (retries >= 0) {
        try {
          tripayResponse = await axios.post('/api/ppob/transaction', {
            productCode: service.code,
            customerNumber: customerNumber,
            ref: apiRef
          });
          break;
        } catch (triErr: any) {
          if (retries === 0 || triErr.response?.status < 500) {
             throw triErr;
          }
          retries--;
          await new Promise(res => setTimeout(res, 2000));
        }
      }

      const tripayData = tripayResponse?.data?.data;
      
      // 6. Update transaction with Tripay results
      const { data: updatedTx } = await supabase
        .from('ppob_transactions')
        .update({
          reference: tripayData?.reference || apiRef,
          status: tripayData?.status === 'Success' ? 'success' : 
                  tripayData?.status === 'Gagal' ? 'failed' : 'pending',
          sn: tripayData?.sn || '',
          notes: tripayData?.note || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', newTx.id)
        .select()
        .single();

      // 7. If Tripay immediately says "Gagal", refund
      if (tripayData?.status === 'Gagal') {
        await supabase.rpc('process_transaction', {
          p_user_id: userId,
          p_amount: total,
          p_type: 'Refund',
          p_description: `Refund: Transaksi Gagal (${tripayData?.note || 'API Error'})`,
          p_reference_id: newTx.id
        });
      }

      set({ isLoading: false });
      await get().syncBalance(userId);
      await get().fetchTransactions(userId);
      
      return updatedTx;
    } catch (err: any) {
      console.error("[PPOB] Transaction Flow Error:", err);
      // Determine if we should refund (only if we are sure Tripay didn't process it)
      const isClientError = err.response?.status >= 400 && err.response?.status < 500;
      
      set({ error: err.message || "Transaksi gagal diproses", isLoading: false });
      await get().syncBalance(userId);
      await get().fetchTransactions(userId);
      return null;
    }
  },

  syncBalance: async (userId) => {
    await get().fetchUserProfile(userId);
  }
}));
