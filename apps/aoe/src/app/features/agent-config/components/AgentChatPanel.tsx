import { useRef, useState } from 'react';
import { type InputRef, Select } from 'antd';
import { Bot, RotateCcw, X } from 'lucide-react';
import AgentChatConversation from './AgentChatConversation';
import { useAgentChat } from '../hooks/useAgentChat';
import { useGetAgents } from '../hooks/useAgentQueries';
import { cn } from '@/lib/utils';

interface AgentChatPanelProps {
  onClose: () => void;
}

/**
 * 채팅 카드 패널 본체 — 셀렉트·대화 상태(useAgentChat)를 모두 보유.
 * AgentChatFab 이 open 일 때만 마운트하므로, 닫기(X)·toggle 닫힘 시 통째로 unmount 되어 상태가 정리된다.
 */
export default function AgentChatPanel({ onClose }: AgentChatPanelProps) {
  const [agentId, setAgentId] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<InputRef>(null);

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
    <div className="fixed right-[30px] bottom-[90px] z-[950] flex h-[600px] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
      {/* 헤더 */}
      <header className="flex items-center justify-between bg-[var(--color-bt-primary)] px-4 py-3 text-white">
        <span className="flex items-center gap-2 font-medium">
          <Bot size={18} />
          에이전트 대화
        </span>
        <div className="flex items-center gap-1">
          {agentId && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={chat.isBusy}
              className="inline-flex size-7 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/15 disabled:opacity-40"
              aria-label="대화 초기화"
              title="대화 초기화"
            >
              <RotateCcw className={cn('size-4', chat.isBusy && 'animate-spin')} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-7 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/15"
            aria-label="닫기"
            title="닫기"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* 에이전트 선택 */}
      <div className="border-b p-3">
        <Select
          showSearch
          value={agentId}
          onChange={handleSelectAgent}
          loading={isLoading}
          placeholder="대화할 에이전트를 선택하세요"
          optionFilterProp="label"
          className="w-full"
          options={deployedAgents.map((a) => ({ value: a.agentId, label: a.agentName }))}
          notFoundContent={isLoading ? '불러오는 중...' : '배포된 에이전트가 없습니다.'}
        />
      </div>

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
        />
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-400">에이전트를 선택하면 대화를 시작합니다.</div>
      )}
    </div>
  );
}
