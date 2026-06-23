import { useEffect, useRef, useState } from 'react';
import { Input, type InputRef } from 'antd';
import { Bot, User } from 'lucide-react';
import MessageCopyButton from '../../shared/components/MessageCopyButton';
import type { ChatMessage } from '../types';
import { IconSend } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** 메시지 본문 텍스트 추출 — 렌더·타이핑 길이 계산에서 공통 사용 */
const getMessageText = (msg: ChatMessage): string => {
  if (msg.type === 'request') return msg.content as string;
  if (typeof msg.content === 'string') return msg.content;
  return (msg.content as { result?: string })?.result ?? JSON.stringify(msg.content);
};

interface AgentChatConversationProps {
  messages: ChatMessage[];
  isBusy: boolean;
  isWelcomePending: boolean;
  agentName: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  /** 입력창 포커스 제어용 (선택) */
  inputRef?: React.RefObject<InputRef | null>;
  /** 봇 응답을 글자 단위로 타이핑하듯 노출 (기본 false — 패널에서만 사용) */
  typingEffect?: boolean;
}

/**
 * 에이전트 Playground 대화 표현 컴포넌트 — 메시지 목록 + 입력창.
 * 드로어(AgentPlaygroundDrawer)와 채팅 패널(AgentChatPanel)이 공유한다.
 */
export default function AgentChatConversation({
  messages,
  isBusy,
  isWelcomePending,
  agentName,
  inputValue,
  onInputChange,
  onSend,
  inputRef,
  typingEffect = false,
}: AgentChatConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 타이핑 효과: 마지막 봇(response) 메시지만 글자 단위로 노출. 이미 끝난 메시지는 즉시 전체 표시.
  const [typingId, setTypingId] = useState<ChatMessage['id'] | null>(null);
  const [revealLen, setRevealLen] = useState(0);
  const revealedRef = useRef<Set<ChatMessage['id']>>(new Set());

  useEffect(() => {
    if (!typingEffect) return;
    const last = messages[messages.length - 1];
    if (!last || last.type === 'request') return; // 봇 응답만 대상
    if (revealedRef.current.has(last.id)) return; // 이미 노출 끝난 메시지 제외
    const full = getMessageText(last);
    if (!full) {
      revealedRef.current.add(last.id);
      return;
    }
    setTypingId(last.id);
    setRevealLen(0);
    let i = 0;
    const step = Math.max(1, Math.round(full.length / 120)); // 긴 답변은 한 틱에 여러 글자
    const timer = window.setInterval(() => {
      i += step;
      if (i >= full.length) {
        setRevealLen(full.length);
        window.clearInterval(timer);
        revealedRef.current.add(last.id);
        setTypingId(null);
      } else {
        setRevealLen(i);
      }
    }, 18);
    return () => window.clearInterval(timer);
  }, [messages, typingEffect]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages, revealLen]);

  return (
    <>
      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && !isBusy && <div className="flex items-center justify-center h-full text-gray-400 text-sm">메시지를 입력해 대화를 시작하세요.</div>}
        {messages.map((msg) => {
          const isUser = msg.type === 'request';
          const fullText = getMessageText(msg);
          const isTyping = typingEffect && msg.id === typingId;
          const text = isTyping ? fullText.slice(0, revealLen) : fullText;

          return (
            <div key={msg.id} className={cn('flex items-start gap-2.5 max-w-[80%]', isUser && 'ml-auto flex-row-reverse')}>
              <div className={cn('shrink-0 w-7 h-7 rounded-full flex items-center justify-center', isUser ? 'bg-emerald-500/10' : 'bg-blue-500/10')}>
                {isUser ? <User size={14} className="text-emerald-600" /> : <Bot size={14} className="text-blue-600" />}
              </div>
              <div className={cn('group flex flex-col gap-0.5', isUser && 'items-end')}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  {isUser ? (
                    <>
                      <span className="text-[10px] text-slate-500 tabular-nums">{msg.timestamp}</span>
                      <span className="text-[10px] font-medium text-emerald-600/70">나</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-medium text-blue-600/70">{agentName || '봇'}</span>
                      <span className="text-[10px] text-slate-500 tabular-nums">{msg.timestamp}</span>
                    </>
                  )}
                </div>
                <div
                  className={cn('border rounded-2xl px-3.5 py-2 shadow-sm', isUser ? 'rounded-br-md bg-emerald-50 border-emerald-100' : 'rounded-bl-md bg-blue-50 border-blue-100')}
                >
                  <p className="text-[13px] text-slate-700 leading-relaxed break-all whitespace-pre-wrap">
                    {text}
                    {isTyping && <span className="ml-0.5 inline-block w-1 animate-pulse">▍</span>}
                  </p>
                </div>
                <div className={cn('mt-0.5 opacity-0 transition-opacity group-hover:opacity-100', isUser && 'self-end')}>
                  <MessageCopyButton text={fullText} />
                </div>
              </div>
            </div>
          );
        })}
        {isBusy && !isWelcomePending && (
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
          onChange={(e) => onInputChange(e.target.value)}
          onPressEnter={onSend}
          placeholder="메시지를 입력하세요..."
          disabled={isBusy}
          className="flex-1"
        />
        <Button size="sm" onClick={onSend} disabled={isBusy || !inputValue.trim()} className="shrink-0">
          <IconSend />
        </Button>
      </div>
    </>
  );
}
