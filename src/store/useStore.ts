import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';

interface StoreState {
  isLoggedIn: boolean;
  user: User | null;
  isHydrated: boolean; // إضافة حالة التأكد من تحميل البيانات
  setUser: (user: User | null) => void;
  setSession: (user: User | null, isLoggedIn: boolean) => void;
  logout: () => void;
  updateWalletBalance: (balance: number) => void;
  setHydrated: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      isHydrated: false, // تبدأ بـ false حتى تكتمل القراءة من localStorage
      
      setHydrated: () => set({ isHydrated: true }),

      setUser: (user) => {
        console.log('[Store] setUser called with:', user);
        set({ user, isLoggedIn: !!user });
      },

      setSession: (user, isLoggedIn) => {
        console.log('[Store] setSession called with:', { user, isLoggedIn });
        set({ user, isLoggedIn });
      },

      logout: () => {
        console.log('[Store] logout called');
        localStorage.removeItem('pending_phone');
        localStorage.removeItem('temp_pin');
        localStorage.removeItem('last_active_time');
        set({ user: null, isLoggedIn: false });
      },

      updateWalletBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, wallet_balance: balance } : null,
        })),
    }),
    {
      name: 'mauriplay-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user
      }),
      onRehydrateStorage: () => (state) => {
        // بمجرد اكتمال استرجاع البيانات من المتصفح
        if (state) {
          state.setHydrated();
          console.log('[Store] Hydration complete. User:', state.user?.phone_number);
        }
      },
    }
  )
);