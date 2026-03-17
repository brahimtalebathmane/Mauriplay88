import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';
import { normalizeUser } from '../utils/auth';

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
        const normalizedUser = normalizeUser(user);
        set({ user: normalizedUser, isLoggedIn: !!normalizedUser });
      },
      setSession: (user, isLoggedIn) => {
        const normalizedUser = normalizeUser(user);
        set({ user: normalizedUser, isLoggedIn: isLoggedIn && !!normalizedUser });
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
      merge: (persistedState, currentState) => {
        const state = (persistedState as Partial<StoreState> | undefined) || {};
        const normalizedUser = normalizeUser(state.user);

        return {
          ...currentState,
          ...state,
          user: normalizedUser,
          isLoggedIn: !!normalizedUser && state.isLoggedIn !== false,
        };
      },
    }
  )
);