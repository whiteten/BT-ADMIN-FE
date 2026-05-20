/**
 * 콜트래킹 검색 상태 + 결과 캐시 (페이지 복귀 시 복원용)
 * 상세 화면에서 '목록으로' 돌아왔을 때 이전 검색 화면을 그대로 복원하기 위해 사용.
 */
import { create } from 'zustand';
import type { CallSearchResult, DateRangePreset, TrackingMode, TrackingSearchCriteria } from '../types/tracking.types';

interface CustomRangeIso {
  start: string;
  end: string;
}

interface SnapshotPayload {
  rawQuery: string;
  activePreset: DateRangePreset;
  customRange: CustomRangeIso | null;
  mode: TrackingMode;
  criteria: TrackingSearchCriteria | null;
  items: CallSearchResult[];
  total: number;
}

interface TrackingSearchStore {
  hasSnapshot: boolean;
  rawQuery: string;
  activePreset: DateRangePreset;
  customRange: CustomRangeIso | null;
  mode: TrackingMode;
  criteria: TrackingSearchCriteria | null;
  items: CallSearchResult[];
  total: number;
  saveSnapshot: (payload: SnapshotPayload) => void;
  clearSnapshot: () => void;
}

const initial = {
  hasSnapshot: false,
  rawQuery: '',
  activePreset: 'LAST_1H' as DateRangePreset,
  customRange: null as CustomRangeIso | null,
  mode: 'PBX' as TrackingMode,
  criteria: null as TrackingSearchCriteria | null,
  items: [] as CallSearchResult[],
  total: 0,
};

export const useTrackingSearchStore = create<TrackingSearchStore>((set) => ({
  ...initial,
  saveSnapshot: (payload) =>
    set({
      hasSnapshot: true,
      rawQuery: payload.rawQuery,
      activePreset: payload.activePreset,
      customRange: payload.customRange,
      mode: payload.mode,
      criteria: payload.criteria,
      items: payload.items,
      total: payload.total,
    }),
  clearSnapshot: () => set(initial),
}));
