/**
 * 목록 표기 방식(카드형 / 리스트형) 저장소.
 *
 * 화면마다 "카드로 볼지 리스트로 볼지"를 사용자가 고르고, 그 선택이 다음 방문에도 유지되어야 한다.
 * 화면별로 각자 localStorage 키를 만들면 키가 흩어지고 형식이 제각각이 되므로,
 * 이 스토어 하나가 `{ 화면키: 표기방식 }` 맵으로 모아서 관리한다.
 *
 * 사용:
 *   const [viewMode, setViewMode] = useViewMode('ipron-endpoint');
 *   ...
 *   {viewMode === 'card' ? <카드슬라이더 /> : <리스트 />}
 *
 * 화면키는 화면마다 고유하게(권장: `{appId}-{feature}`). 한번 정하면 바꾸지 말 것 —
 * 키를 바꾸면 사용자가 저장해 둔 선택이 초기화된다.
 */
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

export const VIEW_MODE = {
  CARD: 'card',
  LIST: 'list',
} as const;

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

interface ViewModeState {
  /** 화면키 → 표기방식 */
  modes: Record<string, ViewMode>;
  setMode: (key: string, mode: ViewMode) => void;
}

export const useViewModeStore = create<ViewModeState>()(
  devtools(
    persist(
      (set) => ({
        modes: {},
        setMode: (key, mode) => set((state) => ({ modes: { ...state.modes, [key]: mode } }), false, 'setMode'),
      }),
      {
        name: 'bt-view-mode',
        storage: createJSONStorage(() => localStorage),
      },
    ),
    { name: 'ViewModeStore' },
  ),
);

/**
 * 화면의 표기방식을 읽고 쓰는 훅. useState 와 같은 모양으로 쓴다.
 *
 * @param key 화면키 (예: 'ipron-endpoint'). 화면마다 고유해야 하며 이후 변경 금지.
 * @param defaultMode 저장된 선택이 없을 때의 기본값 (기본: 카드형)
 */
export function useViewMode(key: string, defaultMode: ViewMode = VIEW_MODE.CARD): [ViewMode, (mode: ViewMode) => void] {
  const mode = useViewModeStore((s) => s.modes[key]) ?? defaultMode;
  const setMode = useViewModeStore((s) => s.setMode);
  return [mode, (next: ViewMode) => setMode(key, next)];
}
