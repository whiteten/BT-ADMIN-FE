import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Drawer, type InputRef } from 'antd';
import { RotateCcw } from 'lucide-react';
import AgentChatConversation from './AgentChatConversation';
import { useAgentChat } from '../hooks/useAgentChat';
import { Button } from '@/components/ui/button';

export interface AgentPlaygroundDrawerRef {
  open: (params: { agentId: string; agentName: string }) => void;
  close: () => void;
}

interface AgentPlaygroundDrawerProps {
  /** 드로어 열림/닫힘 변화 통지 — 부모가 캔버스 단축키 비활성 등에 활용 */
  onOpenChange?: (open: boolean) => void;
}

interface DrawerState {
  open: boolean;
  agentId: string;
  agentName: string;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;

const AgentPlaygroundDrawer = forwardRef<AgentPlaygroundDrawerRef, AgentPlaygroundDrawerProps>(({ onOpenChange }, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false, agentId: '', agentName: '' });
  const [inputValue, setInputValue] = useState('');
  const [drawerWidth, setDrawerWidth] = useState(600);
  const inputRef = useRef<InputRef>(null);

  const chat = useAgentChat(() => requestAnimationFrame(() => inputRef.current?.focus()));

  const closeDrawer = () => {
    setState((prev) => ({ ...prev, open: false }));
    onOpenChange?.(false);
    if (chat.messages.length > 0) {
      chat.reset();
      setInputValue('');
    }
  };

  useImperativeHandle(ref, () => ({
    open: ({ agentId, agentName }) => {
      setInputValue('');
      setState({ open: true, agentId, agentName });
      onOpenChange?.(true);
      chat.start(agentId);
    },
    close: closeDrawer,
  }));

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = drawerWidth;

    // 드로어 content wrapper DOM 직접 갱신: state 리렌더 + antd 폭 transition을 우회해 드래그를 즉각 반영
    const wrapperEl = (e.currentTarget as HTMLElement).closest('.ant-drawer-content-wrapper') as HTMLElement | null;
    const prevTransition = wrapperEl?.style.transition ?? '';
    if (wrapperEl) wrapperEl.style.transition = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    let latestWidth = startWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      latestWidth = Math.min(Math.max(startWidth + delta, MIN_WIDTH), MAX_WIDTH);
      if (wrapperEl) wrapperEl.style.width = `${latestWidth}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (wrapperEl) wrapperEl.style.transition = prevTransition;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // 최종 폭만 state에 1회 커밋 (DOM 폭과 동일하므로 점프·애니메이션 없음)
      setDrawerWidth(latestWidth);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSend = () => {
    chat.send(state.agentId, inputValue);
    setInputValue('');
  };

  const handleRefresh = () => chat.refresh(state.agentId);

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between pr-2">
          <span className="text-white font-medium">Playground · {state.agentName}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={chat.isBusy}
            className="gap-1.5 border-white/40 text-white bg-transparent hover:bg-white/15 hover:text-white hover:border-white/60 disabled:opacity-40"
          >
            <RotateCcw className={`size-3.5 ${chat.isBusy ? 'animate-spin' : ''}`} />
            초기화
          </Button>
        </div>
      }
      open={state.open}
      onClose={closeDrawer}
      mask={{ closable: true }}
      afterOpenChange={(open) => {
        if (open) inputRef.current?.focus();
      }}
      styles={{
        // antd v6 — Drawer `width` prop 이 deprecated. 동적 리사이즈는 styles.wrapper 의 width 로 처리
        wrapper: { width: drawerWidth },
        body: { display: 'flex', flexDirection: 'column', padding: 0, height: '100%', position: 'relative' },
        mask: { backgroundColor: 'rgba(0, 0, 0, 0.18)' },
      }}
      closable={{ placement: 'end' }}
    >
      {/* 리사이즈 핸들 */}
      <div className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-10 group" onMouseDown={handleResizeStart}>
        {/* 세로 중앙 그립 — 평소엔 옅게, hover 시 브랜드색으로 커짐 (전체 높이 선 없음) */}
        <div className="absolute left-1/2 top-1/2 h-9 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300/70 transition-all duration-150 group-hover:h-14 group-hover:bg-[var(--color-bt-primary)]" />
      </div>

      <AgentChatConversation
        messages={chat.messages}
        isBusy={chat.isBusy}
        isWelcomePending={chat.isWelcomePending}
        agentName={state.agentName}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        inputRef={inputRef}
      />
    </Drawer>
  );
});

AgentPlaygroundDrawer.displayName = 'AgentPlaygroundDrawer';
export default AgentPlaygroundDrawer;
