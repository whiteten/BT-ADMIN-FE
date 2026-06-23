import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface RemoteAvailabilityStore {
  /** remote 별 가용성 — host 부팅 시 각 remote 의 실제 라우트 보유 여부로 판정. `{ aoe: true, stt: false, ... }` */
  availableRemotes: Record<string, boolean>;
  setAvailableRemotes: (availableRemotes: Record<string, boolean>) => void;
  /** 특정 remote 가 가용한지 조회 (미판정 remote 는 false) */
  isRemoteAvailable: (appId: string) => boolean;
  reset: () => void;
}

export const useRemoteAvailabilityStore = create<RemoteAvailabilityStore>()(
  devtools(
    (set, get) => ({
      availableRemotes: {},
      setAvailableRemotes: (availableRemotes) => set({ availableRemotes }, false, 'setAvailableRemotes'),
      isRemoteAvailable: (appId) => get().availableRemotes[appId] === true,
      reset: () => set({ availableRemotes: {} }, false, 'reset'),
    }),
    { name: 'RemoteAvailabilityStore' },
  ),
);
