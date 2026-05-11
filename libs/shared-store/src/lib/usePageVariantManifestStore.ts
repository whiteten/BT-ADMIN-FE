import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PageVariantManifestMap } from '../types/pageVariantManifest.types';

interface PageVariantManifestStore {
  variants: PageVariantManifestMap;
  isLoaded: boolean;
  setVariants: (variants: PageVariantManifestMap) => void;
  setIsLoaded: (loaded: boolean) => void;
  reset: () => void;
}

export const usePageVariantManifestStore = create<PageVariantManifestStore>()(
  devtools(
    (set) => ({
      variants: {},
      isLoaded: false,
      setVariants: (variants) => set({ variants }, false, 'setVariants'),
      setIsLoaded: (isLoaded) => set({ isLoaded }, false, 'setIsLoaded'),
      reset: () => set({ variants: {}, isLoaded: false }, false, 'reset'),
    }),
    { name: 'PageVariantManifestStore' },
  ),
);
