import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PageVariantsMap } from '../types/pageVariant.types';

interface PageVariantsStore {
  variants: PageVariantsMap;
  isLoaded: boolean;
  setVariants: (variants: PageVariantsMap) => void;
  setIsLoaded: (loaded: boolean) => void;
  reset: () => void;
}

export const usePageVariantsStore = create<PageVariantsStore>()(
  devtools(
    (set) => ({
      variants: {},
      isLoaded: false,
      setVariants: (variants) => set({ variants }, false, 'setVariants'),
      setIsLoaded: (isLoaded) => set({ isLoaded }, false, 'setIsLoaded'),
      reset: () => set({ variants: {}, isLoaded: false }, false, 'reset'),
    }),
    { name: 'PageVariantsStore' },
  ),
);
