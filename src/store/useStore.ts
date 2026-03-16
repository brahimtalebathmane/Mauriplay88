import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';

interface StoreState {
  isLoggedIn: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  setSession: (user: User | null, isLoggedIn: boolean) => void;
  logout: () => void;
  updateWalletBalance: (balance: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      setUser: (user) => {
        // نضمن هنا أن القيمة دائمًا موجودة حتى لو نسيتها قاعدة البيانات
        if (user) {
          user.is_verified = user.is_verified ?? (user as any).verified ?? false;
        }
        set({ user, isLoggedIn: !!user });
      },
      setSession: (user, isLoggedIn) => {
        if (user) {
          user.is_verified = user.is_verified ?? (user as any).verified ?? false;
        }
        set({ user, isLoggedIn });
      },
      logout: () => {
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
    }
  )
);