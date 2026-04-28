import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

interface StatisticsFilterStore {
  serviceIds: string[];
  modelIds: string[];
  setServiceIds: (serviceIds: string[]) => void;
  setModelIds: (modelIds: string[]) => void;
}

export const useStatisticsFilterStore = create<StatisticsFilterStore>()(
  devtools(
    persist(
      (set) => ({
        serviceIds: [],
        modelIds: [],
        setServiceIds: (serviceIds) => set({ serviceIds }, false, 'setServiceIds'),
        setModelIds: (modelIds) => set({ modelIds }, false, 'setModelIds'),
      }),
      {
        name: 'statistics-filter-storage',
        storage: createJSONStorage(() => localStorage),
      },
    ),
    { name: 'StatisticsFilterStore' },
  ),
);
