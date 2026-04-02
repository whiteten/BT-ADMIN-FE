import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Drawer, Input, type InputRef } from 'antd';
import dayjs from 'dayjs';
import { RotateCcw } from 'lucide-react';
import { Log } from '@/log';
import { useRefreshAgent, useTestAgent } from '../hooks/useAgentQueries';
import type { ChatMessage } from '../types';
import { IconSend } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';

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
        addMessage({ id: Date.now(), type: 'response', content: data as object, timestamp: dayjs().format('HH:mm') });
        inputRef.current?.focus();
      },
      onError: (error) => {
        Log.warn('testAgent error', error);
        addMessage({ id: Date.now(), type: 'response', content: { error: '오류가 발생했습니다.' }, timestamp: dayjs().format('HH:mm') });
        inputRef.current?.focus();
      },
    },
  });

  const { mutate: refreshAgent, isPending: isRefreshing } = useRefreshAgent({
    mutationOptions: {
      onSuccess: () => {
        setMessages([]);
        inputRef.current?.focus();
      },
      onError: (error) => {
        Log.warn('refreshAgent error', error);
      },
    },
  });

  useImperativeHandle(ref, () => ({
    open: ({ agentId, agentName }) => {
      const uuid = crypto.randomUUID();
      setServiceId(`test_${uuid}`);
      setThreadId(`${agentId}_${uuid}`);
      setMessages([]);
      setInputValue('');
      setState({ open: true, agentId, agentName });
    },
    close: () => setState((prev) => ({ ...prev, open: false })),
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
    if (!trimmed || isTesting) return;

    addMessage({ id: Date.now(), type: 'request', content: trimmed, timestamp: dayjs().format('HH:mm') });
    setInputValue('');
    testAgent({ agentId: state.agentId, body: { firstYn: 'N', serviceId, threadId, userInput: trimmed } });
  };

  const handleRefresh = () => {
    const uuid = crypto.randomUUID();
    const newServiceId = `test_${uuid}`;
    const newThreadId = `${state.agentId}_${uuid}`;
    setServiceId(newServiceId);
    setThreadId(newThreadId);
    refreshAgent({ agentId: state.agentId, body: { firstYn: 'Y', serviceId: newServiceId, threadId: newThreadId, userInput: '' } });
  };

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between pr-2">
          <span>Playground · {state.agentName}</span>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="text-gray-500 hover:text-gray-700 gap-1">
            <RotateCcw className="size-4" />
            초기화
          </Button>
        </div>
      }
      open={state.open}
      onClose={handleClose}
      width={drawerWidth}
      styles={{ body: { display: 'flex', flexDirection: 'column', padding: 0, height: '100%', position: 'relative' } }}
      closable
    >
      {/* 리사이즈 핸들 */}
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 group" onMouseDown={handleResizeStart}>
        <div className="absolute left-[3px] top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[#405189] transition-colors duration-150" />
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && <div className="flex items-center justify-center h-full text-gray-400 text-sm">메시지를 입력해 대화를 시작하세요.</div>}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'request' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
            <div
              className={`max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                msg.type === 'request' ? 'bg-[#405189] text-white rounded-[12px] rounded-br-[2px]' : 'bg-gray-100 text-gray-800 rounded-[12px] rounded-bl-[2px]'
              }`}
            >
              {msg.type === 'request'
                ? (msg.content as string)
                : typeof msg.content === 'string'
                  ? msg.content
                  : ((msg.content as { result?: string })?.result ?? JSON.stringify(msg.content))}
            </div>
            <span className="text-[10px] text-gray-400 shrink-0">{msg.timestamp}</span>
          </div>
        ))}
        {isTesting && (
          <div className="flex items-end gap-2">
            <div className="bg-gray-100 text-gray-400 text-sm px-3 py-2 rounded-[12px] rounded-bl-[2px]">...</div>
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
          disabled={isTesting}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSend} disabled={isTesting || !inputValue.trim()} className="shrink-0">
          <IconSend />
        </Button>
      </div>
    </Drawer>
  );
});

AgentPlaygroundDrawer.displayName = 'AgentPlaygroundDrawer';
export default AgentPlaygroundDrawer;
