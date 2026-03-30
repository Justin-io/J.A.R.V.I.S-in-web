import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  loginWithPassword: (password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

const MOCK_OPERATOR_ID = import.meta.env.VITE_OS;
const SYSTEM_PASSWORD = import.meta.env.VITE_ID;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      initialized: false,
      setUser: (user) => set({ user, loading: false }),
      loginWithPassword: async (password: string) => {
        if (password === SYSTEM_PASSWORD) {
          const mockUser = { id: MOCK_OPERATOR_ID, email: 'operator@jarvis.ai' };
          set({ user: mockUser, loading: false });
          return true;
        }
        return false;
      },
      signOut: async () => {
        set({ user: null });
      },
      initialize: async () => {
        // In this version, the persist middleware handles state recovery
        set({ loading: false, initialized: true });
      },
    }),
    {
      name: 'jarvis-auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
