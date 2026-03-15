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

// Validate and sanitize stored state
const validateStoredState = (state: any): Partial<StoreState> | undefined => {
  try {
    if (!state || typeof state !== 'object') {
      console.warn('[Store] Invalid state structure, resetting');
      return undefined;
    }

    // Validate user object if it exists
    if (state.user) {
      const user = state.user;
      const requiredFields = ['id', 'phone_number', 'role'];
      const hasRequiredFields = requiredFields.every(field => field in user);

      if (!hasRequiredFields) {
        console.warn('[Store] User object missing required fields, resetting');
        return undefined;
      }
    }

    // Return validated state
    return {
      isLoggedIn: Boolean(state.isLoggedIn && state.user),
      user: state.user || null,
    };
  } catch (error) {
    console.error('[Store] Error validating state:', error);
    return undefined;
  }
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
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
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[Store] Hydration error:', error);
          // Clear corrupted storage
          localStorage.removeItem('mauriplay-storage');
          window.location.reload();
        } else if (state) {
          console.log('[Store] State rehydrated successfully');
          // Validate the rehydrated state
          const validatedState = validateStoredState(state);
          if (!validatedState) {
            console.warn('[Store] Clearing invalid state');
            localStorage.removeItem('mauriplay-storage');
            window.location.reload();
          }
        }
      },
    }
  )
);
