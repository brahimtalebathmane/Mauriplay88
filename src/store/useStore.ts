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
        if (user) {
          const verifiedStatus = (user as any).is_verified ?? (user as any).verified ?? false;
          user.is_verified = verifiedStatus;
          // Ensure role is set from API so admin panel recognizes admin correctly
          if (typeof (user as any).role !== 'string') {
            (user as any).role = 'user';
          }
        }
        set({ user, isLoggedIn: !!user });
      },
      setSession: (user, isLoggedIn) => {
        if (user) {
          const verifiedStatus = (user as any).is_verified ?? (user as any).verified ?? false;
          user.is_verified = verifiedStatus;
          if (typeof (user as any).role !== 'string') {
            (user as any).role = 'user';
          }
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