import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { useLayoutStore } from '@/shared-store';
import UserMenuSelector from '../../components/UserMenuSelector';
import GlobalSearch from '../search/components/GlobalSearch';
import { IconRemoteAoe } from '@/components/custom/Icons';
import { cn } from '@/lib/utils';

export const TOP_HEADER_HEIGHT = 56;

// aoe remote 의 에이전트 채팅 패널 — 트리거·open 상태는 host(여기)가 소유, 패널은 open 일 때만 마운트.
// 로드 실패 시 화면에 영향 없도록 null fallback.
const AgentChatPanel = React.lazy(() => import('aoe/AgentChatPanel').catch(() => ({ default: () => null })));

export default function TopHeader() {
  const navigate = useNavigate();
  const toggleChrome = useLayoutStore((s) => s.toggleChrome);
  const [chatOpen, setChatOpen] = React.useState(false);
  // 슬라이드 아웃 애니메이션 동안 패널을 잠깐 유지하기 위한 마운트 상태.
  // 열림 → 즉시 mount, 닫힘 → 슬라이드 아웃 끝(onExited)에 unmount(=대화 상태 정리).
  const [chatMounted, setChatMounted] = React.useState(false);
  React.useEffect(() => {
    if (chatOpen) setChatMounted(true);
  }, [chatOpen]);

  // aoe 에이전트 조회 권한이 있을 때만 채팅 버튼 노출
  // TODO: 추후 권한 체크 로직으로 변경
  const canUseAgentChat = true;
  // const canUseAgentChat = useNavigationStore((s) => s.permissions.includes('aoe:agent:read'));

  return (
    <div style={{ height: TOP_HEADER_HEIGHT }} className="relative shrink-0 bg-[var(--color-bt-header)] text-white border-b border-white/10">
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
          // ai.png 규격: 그라데이션(청록→파랑→보라) 테두리 알약 + 밝은 내부 + 회색 sparkles 아이콘·AI 텍스트
          <>
            <button
              type="button"
              onClick={() => setChatOpen((prev) => !prev)}
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

      {/* 슬라이드 인/아웃: open=false 로 내려 슬라이드 아웃 → onExited 에서 unmount(대화 상태 정리) */}
      {canUseAgentChat && chatMounted && (
        <React.Suspense fallback={null}>
          <AgentChatPanel open={chatOpen} placement="top-right" onClose={() => setChatOpen(false)} onExited={() => setChatMounted(false)} />
        </React.Suspense>
      )}
    </div>
  );
}
