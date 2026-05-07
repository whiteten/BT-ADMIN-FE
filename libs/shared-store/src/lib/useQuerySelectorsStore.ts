import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { QuerySelectorRegistry } from '../types/querySelector.types';

interface QuerySelectorsStore {
  registry: QuerySelectorRegistry;
  isLoaded: boolean;
  setRegistry: (registry: QuerySelectorRegistry) => void;
  setIsLoaded: (loaded: boolean) => void;
}

export const useQuerySelectorsStore = create<QuerySelectorsStore>()(
  devtools(
    (set) => ({
      registry: {},
      isLoaded: false,
      setRegistry: (registry) => set({ registry, isLoaded: true }, false, 'setRegistry'),
      setIsLoaded: (isLoaded) => set({ isLoaded }, false, 'setIsLoaded'),
    }),
    { name: 'QuerySelectorsStore' },
  ),
);
