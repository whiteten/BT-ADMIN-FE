import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { RemoteRoutesMap } from '../types/remoteRoute.types';

interface RemoteRoutesStore {
  routes: RemoteRoutesMap;
  setRoutes: (routes: RemoteRoutesMap) => void;
  reset: () => void;
}

export const useRemoteRoutesStore = create<RemoteRoutesStore>()(
  devtools(
    (set) => ({
      routes: {},
      setRoutes: (routes) => set({ routes }, false, 'setRoutes'),
      reset: () => set({ routes: {} }, false, 'reset'),
    }),
    { name: 'RemoteRoutesStore' },
  ),
);
