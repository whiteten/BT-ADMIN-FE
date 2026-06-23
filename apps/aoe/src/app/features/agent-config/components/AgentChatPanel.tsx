import { useEffect, useRef, useState } from 'react';
import { type InputRef, Select } from 'antd';
import { BotMessageSquare, RotateCcw, X } from 'lucide-react';
import AgentChatConversation from './AgentChatConversation';
import { useAgentChat } from '../hooks/useAgentChat';
import { useGetAgents } from '../hooks/useAgentQueries';
import { IconRemoteAoe } from '@/components/custom/Icons';
import { cn } from '@/lib/utils';

// TopHeader AI 버튼과 동일한 그라데이션(시리 느낌). 흐름 애니메이션은 응답 대기(isBusy) 중에만 부여.
const AI_GRADIENT = 'bg-[length:200%_auto] bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#a855f7,#ec4899,#a855f7,#3b82f6,#22d3ee)]';

// 패널 고정 위치 — 호출하는 트리거 위치에 맞춰 소비자가 선택. 위치 외 규격(크기·스타일)은 동일.
const PANEL_PLACEMENT = {
  'bottom-right': 'right-[30px] bottom-[90px]', // 우하단 (FloatButton 등 우하단 트리거용)
  'top-right': 'right-4 top-1/2 -translate-y-1/2', // 우측 세로 중앙 (TopHeader 버튼 등 상단 트리거용 — 좌우는 우측, 높이는 화면 중앙)
} as const;
type AgentChatPanelPlacement = keyof typeof PANEL_PLACEMENT;

interface AgentChatPanelProps {
  /** 표시 여부(슬라이드 인/아웃 트리거). false 로 내리면 슬라이드 아웃 후 onExited 호출. */
  open: boolean;
  /** 닫기 의도(X 클릭 등) — 소비자가 open 을 false 로 내림. */
  onClose: () => void;
  /** 슬라이드 아웃 애니메이션 완료 — 소비자가 이때 unmount(=대화 상태 정리). */
  onExited?: () => void;
  placement?: AgentChatPanelPlacement;
}

/**
 * 채팅 카드 패널 본체 — 셀렉트·대화 상태(useAgentChat)를 모두 보유.
 * 우측에서 슬라이드 인, 닫힘 시 우측으로 슬라이드 아웃 후 onExited 에서 unmount 되어 대화 상태가 정리된다(생명주기 계약).
 * 트리거(버튼)·open 상태는 소비자가 소유하고, 패널 위치는 placement prop 으로 지정한다.
 */
export default function AgentChatPanel({ open, onClose, onExited, placement = 'bottom-right' }: AgentChatPanelProps) {
  const [agentId, setAgentId] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<InputRef>(null);

  // 마운트 직후 1프레임 뒤 entered=true 로 전환해 슬라이드 인 트랜지션을 태운다.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const isVisible = entered && open;

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // 루트 자신의 위치(translate) 트랜지션만 처리(자식 호버 트랜지션 버블링·opacity 무시)
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'translate' && e.propertyName !== 'transform') return;
    if (!open) onExited?.();
  };

  const chat = useAgentChat(() => requestAnimationFrame(() => inputRef.current?.focus()));

  // 마운트 시(=패널 오픈) 목록 조회. 배포 완료(aoeDeployFlag===1)된 에이전트만 테스트 가능.
  const { data: agents = [], isLoading } = useGetAgents();
  const deployedAgents = agents.filter((a) => a.aoeDeployFlag === 1);
  const agentName = deployedAgents.find((a) => a.agentId === agentId)?.agentName ?? '';

  const handleSelectAgent = (nextAgentId: string) => {
    setAgentId(nextAgentId);
    setInputValue('');
    chat.reset();
    chat.start(nextAgentId);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSend = () => {
    if (!agentId) return;
    chat.send(agentId, inputValue);
    setInputValue('');
  };

  const handleRefresh = () => {
    if (!agentId) return;
    chat.refresh(agentId);
  };

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      className={cn(
        'fixed z-[950] flex h-[760px] max-h-[calc(100vh-4rem)] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5',
        'transition-[translate,opacity] duration-300 ease-out will-change-transform',
        PANEL_PLACEMENT[placement],
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+2rem)] opacity-0',
      )}
    >
      {/* 헤더 — 한 줄 통합(F안): 옅은 파랑 틴트 + 단색 파랑 sparkles 아바타 + 에이전트 셀렉트(주인공) + 액션 아이콘 */}
      <header className="flex items-center gap-2 border-b border-blue-100/60 bg-gradient-to-b from-blue-50 to-white px-3 py-2.5">
        {/* 테두리만 흐르는 그라데이션(TopHeader 버튼과 동일 규격) + 내부 흰색 */}
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg p-[3px] shadow-sm', AI_GRADIENT, chat.isBusy && 'animate-ai-border-flow')}>
          <span className="flex size-full items-center justify-center rounded-[6px] bg-white">
            <IconRemoteAoe className="size-5 text-blue-600" />
          </span>
        </span>
        <Select
          showSearch
          variant="borderless"
          value={agentId}
          onChange={handleSelectAgent}
          loading={isLoading}
          placeholder="대화할 에이전트를 선택하세요"
          optionFilterProp="label"
          className="min-w-0 flex-1"
          options={deployedAgents.map((a) => ({ value: a.agentId, label: a.agentName }))}
          notFoundContent={isLoading ? '불러오는 중...' : '배포된 에이전트가 없습니다.'}
        />
        <span aria-hidden className="h-4 w-px shrink-0 bg-slate-200" />
        {agentId && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={chat.isBusy}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-100/70 hover:text-slate-600 disabled:opacity-40"
            aria-label="대화 초기화"
            title="대화 초기화"
          >
            <RotateCcw className={cn('size-4', chat.isBusy && 'animate-spin')} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-100/70 hover:text-slate-600"
          aria-label="닫기"
          title="닫기"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* 대화 영역 */}
      {agentId ? (
        <AgentChatConversation
          messages={chat.messages}
          isBusy={chat.isBusy}
          isWelcomePending={chat.isWelcomePending}
          agentName={agentName}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          inputRef={inputRef}
          typingEffect
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
            <BotMessageSquare className="size-7" />
          </span>
          <p className="text-sm text-gray-400">에이전트를 선택하면 대화를 시작합니다.</p>
        </div>
      )}
    </div>
  );
}
