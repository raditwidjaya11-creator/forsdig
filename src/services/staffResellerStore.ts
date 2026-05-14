import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Staff, Reseller, Commission } from '../types';

interface StaffResellerState {
  staffs: Staff[];
  resellers: Reseller[];
  commissions: Commission[];
  isLoading: boolean;
  
  // Actions
  setStaffs: (staffs: Staff[]) => void;
  addStaff: (staff: Staff) => void;
  updateStaff: (staff: Staff) => void;
  deleteStaff: (id: string) => void;
  
  setResellers: (resellers: Reseller[]) => void;
  addReseller: (reseller: Reseller) => void;
  updateReseller: (reseller: Reseller) => void;
  deleteReseller: (id: string) => void;
  
  setCommissions: (commissions: Commission[]) => void;
  addCommission: (commission: Commission) => void;
  updateCommissionStatus: (id: string, status: 'paid' | 'cancelled') => void;
}

export const useStaffResellerStore = create<StaffResellerState>()(
  persist(
    (set) => ({
      staffs: [],
      resellers: [],
      commissions: [],
      isLoading: false,

      setStaffs: (staffs) => set({ staffs }),
      addStaff: (newStaff) => set((state) => ({ 
        staffs: [newStaff, ...state.staffs] 
      })),
      updateStaff: (updatedStaff) => set((state) => ({
        staffs: state.staffs.map(s => s.id === updatedStaff.id ? updatedStaff : s)
      })),
      deleteStaff: (id) => set((state) => ({
        staffs: state.staffs.filter(s => s.id !== id)
      })),

      setResellers: (resellers) => set({ resellers }),
      addReseller: (newReseller) => set((state) => ({ 
        resellers: [newReseller, ...state.resellers] 
      })),
      updateReseller: (updatedReseller) => set((state) => ({
        resellers: state.resellers.map(r => r.id === updatedReseller.id ? updatedReseller : r)
      })),
      deleteReseller: (id) => set((state) => ({
        resellers: state.resellers.filter(r => r.id !== id)
      })),

      setCommissions: (commissions) => set({ commissions }),
      addCommission: (newCommission) => set((state) => ({
        commissions: [newCommission, ...state.commissions]
      })),
      updateCommissionStatus: (id, status) => set((state) => ({
        commissions: state.commissions.map(c => c.id === id ? { ...c, status } : c)
      })),
    }),
    {
      name: 'staff-reseller-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
