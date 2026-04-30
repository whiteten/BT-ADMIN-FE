import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PageMappingsMap } from '../types/pageMapping.types';

interface PageMappingsStore {
  mappings: PageMappingsMap;
  isLoaded: boolean;
  setMappings: (mappings: PageMappingsMap) => void;
  setIsLoaded: (loaded: boolean) => void;
  reset: () => void;
}

export const usePageMappingsStore = create<PageMappingsStore>()(
  devtools(
    (set) => ({
      mappings: {},
      isLoaded: false,
      setMappings: (mappings) => set({ mappings }, false, 'setMappings'),
      setIsLoaded: (isLoaded) => set({ isLoaded }, false, 'setIsLoaded'),
      reset: () => set({ mappings: {}, isLoaded: false }, false, 'reset'),
    }),
    { name: 'PageMappingsStore' },
  ),
);
