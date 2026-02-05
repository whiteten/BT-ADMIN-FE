import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface RememberMeData {
  userAccount: string;
  tenant: string;
  rememberMe: boolean;
}

interface RememberMeStore {
  data: RememberMeData;
  setRememberMeData: (data: Partial<RememberMeData>) => void;
  clearRememberMeData: () => void;
}

const initialData: RememberMeData = {
  userAccount: '',
  tenant: '',
  rememberMe: false,
};

export const useRememberMeStore = create<RememberMeStore>()(
  persist(
    (set) => ({
      data: initialData,
      setRememberMeData: (newData) =>
        set((state) => ({
          data: { ...state.data, ...newData },
        })),
      clearRememberMeData: () => set({ data: initialData }),
    }),
    {
      name: 'remember-me-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
