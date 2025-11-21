import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthStore {
  isLogined: boolean;
  getIsLogined: () => boolean;
  login: (onSuccess?: () => void) => void;
  logout: (onSuccess?: () => void) => void;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      isLogined: false,
      getIsLogined: () => get().isLogined,
      login: (onSuccess) => {
        set({ isLogined: true });
        onSuccess?.();
      },
      logout: (onSuccess) => {
        set({ isLogined: false });
        onSuccess?.();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
