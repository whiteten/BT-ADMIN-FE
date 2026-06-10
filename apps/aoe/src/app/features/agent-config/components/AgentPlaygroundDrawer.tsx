import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Drawer, Input, type InputRef } from 'antd';
import dayjs from 'dayjs';
import { Bot, RotateCcw, User } from 'lucide-react';
import { Log } from '@/log';
import { createUUID } from '@/shared-util';
import { useRefreshAgent, useTestAgent } from '../hooks/useAgentQueries';
import type { ChatMessage } from '../types';
import { IconSend } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AgentPlaygroundDrawerRef {
  open: (params: { agentId: string; agentName: string }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  agentId: string;
  agentName: string;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;

/**
 * BE testAgent/refreshAgent 응답에서 사용자에게 보여줄 답변 텍스트 추출.
 * 새 포맷: `{ run: {result}, execute: {result}, ... }` — run 우선, 없으면 execute, 그 외엔 객체 마지막 키의 result.
 * 옛 포맷: `{ result: "..." }` 도 호환.
 */
const pickAnswerText = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  // 옛 포맷
  if (typeof obj.result === 'string') return obj.result;
  // 단계별 포맷 — run > execute > 마지막 키
  const preferred = ['run', 'execute'];
  for (const key of preferred) {
    const step = obj[key];
    if (step && typeof step === 'object') {
      const r = (step as Record<string, unknown>).result;
      if (typeof r === 'string') return r;
    }
  }
  const keys = Object.keys(obj);
  for (let i = keys.length - 1; i >= 0; i -= 1) {
    const step = obj[keys[i]];
    if (step && typeof step === 'object') {
      const r = (step as Record<string, unknown>).result;
      if (typeof r === 'string') return r;
    }
  }
  return null;
};

const AgentPlaygroundDrawer = forwardRef<AgentPlaygroundDrawerRef>((_, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false, agentId: '', agentName: '' });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [threadId, setThreadId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [drawerWidth, setDrawerWidth] = useState(600);
  const inputRef = useRef<InputRef>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addMessage = (message: ChatMessage) => setMessages((prev) => [...prev, message]);

  const { mutate: testAgent, isPending: isTesting } = useTestAgent({
    mutationOptions: {
      onSuccess: (data) => {
        // BE 응답 변경: data 가 단계별 결과 객체 (`{ execute: {result}, run: {result}, ... }`).
        // 옛 단일 result(`{ result: string }`) 도 호환. 우선순위: run > execute > 객체 마지막 키 > 최상위 result
        const text = pickAnswerText(data);
        if (text != null && text.trim() !== '') {
          addMessage({ id: Date.now(), type: 'response', content: { result: text }, timestamp: dayjs().format('HH:mm') });
        }
        requestAnimationFrame(() => inputRef.current?.focus());
      },
      onError: (error) => {
        Log.warn('testAgent error', error);
        addMessage({ id: Date.now(), type: 'response', content: { error: '오류가 발생했습니다.' }, timestamp: dayjs().format('HH:mm') });
        requestAnimationFrame(() => inputRef.current?.focus());
      },
    },
  });

  const { mutate: refreshAgent, isPending: isRefreshing } = useRefreshAgent({
    mutationOptions: {
      onError: (error) => {
        Log.warn('refreshAgent error', error);
      },
    },
  });

  useImperativeHandle(ref, () => ({
    open: ({ agentId, agentName }) => {
      const uuid = createUUID();
      const newServiceId = `test_${uuid}`;
      const newThreadId = `${agentId}_${uuid}`;
      setServiceId(newServiceId);
      setThreadId(newThreadId);
      setMessages([]);
      setInputValue('');
      setState({ open: true, agentId, agentName });
      testAgent({ agentId, body: { firstYn: 'Y', serviceId: newServiceId, threadId: newThreadId, userInput: '' } });
    },
    close: () => {
      setState((prev) => ({ ...prev, open: false }));
      if (messages.length > 0) {
        setMessages([]);
        setInputValue('');
        setThreadId('');
        setServiceId('');
      }
    },
  }));

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = drawerWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, MIN_WIDTH), MAX_WIDTH);
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isTesting || isRefreshing) return;

    addMessage({ id: Date.now(), type: 'request', content: trimmed, timestamp: dayjs().format('HH:mm') });
    setInputValue('');
    testAgent({ agentId: state.agentId, body: { firstYn: 'N', serviceId, threadId, userInput: trimmed } });
  };

  const handleRefresh = () => {
    const uuid = createUUID();
    const newServiceId = `test_${uuid}`;
    const newThreadId = `${state.agentId}_${uuid}`;
    setServiceId(newServiceId);
    setThreadId(newThreadId);
    setMessages([]);
    // AS-IS 와 동일한 시퀀스: refresh(세션 초기화) → test(firstYn='Y') 호출로 welcomeMessage 재수신
    refreshAgent(
      { agentId: state.agentId, body: { firstYn: 'Y', serviceId: newServiceId, threadId: newThreadId, userInput: '' } },
      { onSuccess: () => testAgent({ agentId: state.agentId, body: { firstYn: 'Y', serviceId: newServiceId, threadId: newThreadId, userInput: '' } }) },
    );
  };

  const handleClose = () => {
    setState((prev) => ({ ...prev, open: false }));
    if (messages.length > 0) {
      setMessages([]);
      setInputValue('');
      setThreadId('');
      setServiceId('');
    }
  };

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between pr-2">
          <span className="text-white font-medium">Playground · {state.agentName}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 border-white/40 text-white bg-transparent hover:bg-white/15 hover:text-white hover:border-white/60 disabled:opacity-40"
          >
            <RotateCcw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            초기화
          </Button>
        </div>
      }
      open={state.open}
      onClose={handleClose}
      maskClosable
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
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 group" onMouseDown={handleResizeStart}>
        <div className="absolute left-[3px] top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[#405189] transition-colors duration-150" />
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && !isTesting && <div className="flex items-center justify-center h-full text-gray-400 text-sm">메시지를 입력해 대화를 시작하세요.</div>}
        {messages.map((msg) => {
          const isUser = msg.type === 'request';
          const text = isUser
            ? (msg.content as string)
            : typeof msg.content === 'string'
              ? msg.content
              : ((msg.content as { result?: string })?.result ?? JSON.stringify(msg.content));

          return (
            <div key={msg.id} className={cn('flex items-start gap-2.5 max-w-[80%]', isUser && 'ml-auto flex-row-reverse')}>
              <div className={cn('shrink-0 w-7 h-7 rounded-full flex items-center justify-center', isUser ? 'bg-emerald-500/10' : 'bg-blue-500/10')}>
                {isUser ? <User size={14} className="text-emerald-600" /> : <Bot size={14} className="text-blue-600" />}
              </div>
              <div className={cn('flex flex-col gap-0.5', isUser && 'items-end')}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  {isUser ? (
                    <>
                      <span className="text-[10px] text-slate-500 tabular-nums">{msg.timestamp}</span>
                      <span className="text-[10px] font-medium text-emerald-600/70">나</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-medium text-blue-600/70">{state.agentName || '봇'}</span>
                      <span className="text-[10px] text-slate-500 tabular-nums">{msg.timestamp}</span>
                    </>
                  )}
                </div>
                <div
                  className={cn('border rounded-2xl px-3.5 py-2 shadow-sm', isUser ? 'rounded-br-md bg-emerald-50 border-emerald-100' : 'rounded-bl-md bg-blue-50 border-blue-100')}
                >
                  <p className="text-[13px] text-slate-700 leading-relaxed break-all whitespace-pre-wrap">{text}</p>
                </div>
              </div>
            </div>
          );
        })}
        {isTesting && (
          <div className="flex items-start gap-2.5 max-w-[80%]">
            <div className="shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Bot size={14} className="text-blue-600" />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="border-t p-3 flex gap-2 items-center">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleSend}
          placeholder="메시지를 입력하세요..."
          disabled={isTesting || isRefreshing}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSend} disabled={isTesting || isRefreshing || !inputValue.trim()} className="shrink-0">
          <IconSend />
        </Button>
      </div>
    </Drawer>
  );
});

AgentPlaygroundDrawer.displayName = 'AgentPlaygroundDrawer';
export default AgentPlaygroundDrawer;
