import { useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Bot, ChartColumnBig, MessageSquareText, User } from 'lucide-react';
import { EXAMPLE_QUERIES } from '../constants/chatConstants';
import type { ChatMessageItem } from '../types';
import ChatResponseContent from './ChatResponseContent';
import { parseChatResponse } from '../utils/parseChatResponse';
import { cn } from '@/lib/utils';

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  /** 전송 중인 질문 — 응답 수신/저장 전까지 로딩 말풍선으로 노출 */
  pendingQuery: string | null;
  isFetching: boolean;
  onExampleClick: (query: string) => void;
}

const formatTime = (workTime?: string) => (workTime ? dayjs(workTime).format('YYYY-MM-DD HH:mm') : dayjs().format('YYYY-MM-DD HH:mm'));

function UserBubble({ text, workTime }: { text: string; workTime?: string }) {
  return (
    <div className="ml-auto flex max-w-[75%] flex-row-reverse items-start gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bt-primary)]/10">
        <User size={16} className="text-[var(--color-bt-primary)]" />
      </div>
      <div className="flex min-w-0 flex-col items-end gap-1">
        <div className="rounded-2xl rounded-tr-sm bg-[var(--color-bt-primary)] px-4 py-2.5 shadow-sm">
          <p className="text-[13px] leading-relaxed text-white whitespace-pre-wrap break-all">{text}</p>
        </div>
        <span className="pr-1 text-[10px] tabular-nums text-[#A5AAB5]">{formatTime(workTime)}</span>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-bt-primary)]/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-bt-primary)]/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-bt-primary)]/60" />
    </div>
  );
}

function BotBubble({ children, workTime }: { children: React.ReactNode; workTime?: string }) {
  return (
    <div className="flex max-w-[85%] items-start gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#E9EDF2] bg-white shadow-sm">
        <Bot size={16} className="text-[var(--color-bt-primary)]" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="max-w-full rounded-2xl rounded-tl-sm border border-[#E9EDF2] bg-white px-4 py-3 shadow-sm">{children}</div>
        {workTime && <span className="pl-1 text-[10px] tabular-nums text-[#A5AAB5]">{formatTime(workTime)}</span>}
      </div>
    </div>
  );
}

export default function ChatMessageList({ messages, pendingQuery, isFetching, onExampleClick }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages, pendingQuery]);

  // 메시지 로딩 중에는 전체 스피너 대신 봇 말풍선의 ... 인디케이터만 노출 (채팅 UI 관례)
  const isLoadingChat = isFetching && !messages.length;
  const isEmpty = !messages.length && !pendingQuery && !isLoadingChat;

  return (
    <div ref={scrollRef} className={cn('flex flex-1 flex-col gap-5 overflow-y-auto bg-[#F8F9FB] p-6', isEmpty && 'justify-center')}>
      {isEmpty ? (
        <div className="flex flex-col items-center gap-5 px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--color-bt-primary)] shadow-lg shadow-[var(--color-bt-primary)]/25">
            <ChartColumnBig className="size-7 text-white" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-lg font-semibold text-[#343A40]">AOE 대화형 분석</p>
            <p className="text-[13px] text-[#888B9A]">자연어로 질문하면 AOE 에이전트가 통계를 차트와 표로 분석해 드립니다.</p>
          </div>
          <div className="grid w-full max-w-[640px] grid-cols-1 gap-2 sm:grid-cols-2">
            {EXAMPLE_QUERIES.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => onExampleClick(query)}
                className="group flex items-center gap-2.5 rounded-xl border border-[#E9EDF2] bg-white px-4 py-3 text-left text-[13px] text-[#495057] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)] hover:shadow-md hover:cursor-pointer"
              >
                <MessageSquareText className="size-4 shrink-0 text-[#A5AAB5] transition-colors group-hover:text-[var(--color-bt-primary)]" />
                {query}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => {
            // 응답 블록(차트·멘트)마다 별도 말풍선으로 분할, workTime 은 마지막 말풍선에만 표시
            const blocks = parseChatResponse(message.responseJson);
            return (
              <div key={message.seq} className="flex flex-col gap-5">
                <UserBubble text={message.userQuery} workTime={message.workTime} />
                {blocks ? (
                  <div className="flex flex-col gap-2.5">
                    {blocks.map((block, index) => (
                      <BotBubble key={index} workTime={index === blocks.length - 1 ? message.workTime : undefined}>
                        <ChatResponseContent block={block} />
                      </BotBubble>
                    ))}
                  </div>
                ) : (
                  <BotBubble workTime={message.workTime}>
                    <p className="text-[13px] text-slate-500 leading-relaxed">응답을 표시할 수 없습니다.</p>
                  </BotBubble>
                )}
              </div>
            );
          })}
          {pendingQuery && (
            <div className="flex flex-col gap-5">
              <UserBubble text={pendingQuery} />
              <BotBubble>
                <LoadingDots />
              </BotBubble>
            </div>
          )}
          {isLoadingChat && !pendingQuery && (
            <BotBubble>
              <LoadingDots />
            </BotBubble>
          )}
        </>
      )}
    </div>
  );
}
