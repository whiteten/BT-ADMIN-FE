import { useNavigate } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { useAgentChatStore, useLayoutStore, useOperatorScopeStore } from '@/shared-store';
import { useCanUseAgentChat } from './hooks/useCanUseAgentChat';
import TenantChip from '../../components/TenantChip';
import UserMenuSelector from '../../components/UserMenuSelector';
import GlobalSearch from '../search/components/GlobalSearch';
import { IconRemoteAoe } from '@/components/custom/Icons';
import { cn } from '@/lib/utils';

export const TOP_HEADER_HEIGHT = 56;

export default function TopHeader() {
  const navigate = useNavigate();
  const toggleChrome = useLayoutStore((s) => s.toggleChrome);
  // 패널 본체는 host Layout 이 chrome 바깥 오버레이로 렌더하고, 여기서는 트리거(버튼)만 소유한다.
  // open 상태는 스토어에 두어 헤더 접힘으로 TopHeader 가 unmount 돼도 패널·대화가 보존된다.
  const chatOpen = useAgentChatStore((s) => s.open);
  const toggleChat = useAgentChatStore((s) => s.toggle);

  const canUseAgentChat = useCanUseAgentChat();
  // 운영자 모드(통합운영) 활성 시 헤더 바를 앰버로 강조 — "지금 전체 테넌트 스코프"를 상시 인지.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);

  return (
    <div
      style={{ height: TOP_HEADER_HEIGHT }}
      className={cn('relative shrink-0 text-white border-b', operatorMode ? 'bg-[#1E293B] border-amber-300/40' : 'bg-[var(--color-bt-header)] border-white/10')}
    >
      {/* 좌측: 로고 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
        <img src="/assets/images/ci-white.svg" alt="CI" className="h-8 w-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
      </div>

      {/* 정중앙: 통합 검색 — 640px 미만(sm 이하)에서는 좁아 충돌하므로 숨김 */}
      <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(400px,calc(100%-440px))]">
        <GlobalSearch />
      </div>

      {/* 우측: 에이전트 대화 + 유저 메뉴 + 헤더 접기 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {canUseAgentChat && (
          // 그라데이션(청록→파랑→보라) 테두리 알약 + 밝은 내부 + 회색 sparkles 아이콘·AI 텍스트
          <>
            <button
              type="button"
              onClick={toggleChat}
              className="group inline-flex items-center rounded-full p-[3px] shadow-sm cursor-pointer bg-[length:200%_auto] bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#a855f7,#ec4899,#a855f7,#3b82f6,#22d3ee)] hover:animate-ai-border-flow"
              aria-label={chatOpen ? 'AI 대화 닫기' : 'AI 대화 열기'}
              title="AI"
            >
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-semibold leading-none bg-gradient-to-b from-white to-gray-100 transition-colors',
                  chatOpen ? 'text-gray-900' : 'text-gray-700',
                )}
              >
                <IconRemoteAoe className="size-5" />
                AI
              </span>
            </button>
            <span aria-hidden className="h-5 w-px bg-white/20 ml-1.5" />
          </>
        )}
        <TenantChip />
        <UserMenuSelector />
        <span aria-hidden className="h-5 w-px bg-white/20" />
        <button
          type="button"
          onClick={toggleChrome}
          className="inline-flex items-center justify-center size-8 rounded-md text-white/85 hover:bg-white/15 hover:text-white cursor-pointer transition-colors"
          aria-label="헤더 접기"
          title="헤더 접기"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
