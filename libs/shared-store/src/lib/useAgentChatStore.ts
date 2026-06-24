import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AgentChatStore {
  /** 패널 표시 여부 — 트리거 버튼(TopHeader)이 토글한다. */
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /**
   * 첫 열림 시 1회 true 로 올린 뒤 계속 유지된다. 닫아도 unmount 하지 않아 대화 내용이 보존된다.
   * 패널을 Layout 레벨에서 렌더하므로 헤더 접기·remote 전환과 무관하게 마운트가 유지된다.
   */
  mounted: boolean;
}

/**
 * AI 에이전트 채팅 패널의 open 상태 스토어.
 *
 * 트리거 버튼은 TopHeader 가 소유하지만 패널 본체는 host Layout 이 chrome(헤더) 바깥 오버레이로 렌더한다.
 * open 상태를 컴포넌트 로컬이 아닌 스토어에 두어, 헤더 접힘(chromeCollapsed)으로 TopHeader 가 unmount 돼도
 * 패널·대화 상태가 날아가지 않도록 한다. UI 일시 상태이므로 persist 하지 않는다.
 */
export const useAgentChatStore = create<AgentChatStore>()(
  devtools(
    (set) => ({
      open: false,
      mounted: false,
      setOpen: (open) => set((s) => ({ open, mounted: s.mounted || open }), false, 'setOpen'),
      toggle: () =>
        set(
          (s) => {
            const open = !s.open;
            return { open, mounted: s.mounted || open };
          },
          false,
          'toggle',
        ),
    }),
    { name: 'agent-chat-store' },
  ),
);
