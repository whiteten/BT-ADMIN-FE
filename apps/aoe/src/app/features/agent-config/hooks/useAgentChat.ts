import { useState } from 'react';
import dayjs from 'dayjs';
import { Log } from '@/log';
import { createUUID } from '@/shared-util';
import type { ChatMessage } from '../types';
import { useRefreshAgent, useTestAgent } from './useAgentQueries';

/**
 * BE testAgent/refreshAgent 응답에서 사용자에게 보여줄 답변 텍스트 추출.
 * 새 포맷: `{ run: {result}, execute: {result}, ... }` — run 우선, 없으면 execute, 그 외엔 객체 마지막 키의 result.
 * 옛 포맷: `{ result: "..." }` 도 호환.
 */
export const pickAnswerText = (data: unknown): string | null => {
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

/**
 * 에이전트 Playground 대화 로직 캡슐화 훅.
 * - 세션(serviceId/threadId) 생성·관리, welcome(firstYn:'Y') 수신, 사용자 메시지 송수신, 초기화 시퀀스.
 * - 표현(드로어/floating 위젯)에 무관하게 동일 동작을 공유한다.
 */
export const useAgentChat = (onAfterResponse?: () => void) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState('');
  const [serviceId, setServiceId] = useState('');
  // welcomeMessage(firstYn:'Y') 로드는 메시지가 없을 수도 있으므로 타이핑 인디케이터를 띄우지 않음.
  // (있으면 메시지가 그대로 뜨고, 없으면 조용히 빈 상태 유지 — 사용자 메시지 응답에만 '...' 노출)
  const [isWelcomePending, setIsWelcomePending] = useState(false);

  const addMessage = (message: ChatMessage) => setMessages((prev) => [...prev, message]);

  const { mutate: testAgent, isPending: isTesting } = useTestAgent({
    mutationOptions: {
      onSuccess: (data) => {
        // BE 응답: data 가 단계별 결과 객체 (`{ execute: {result}, run: {result}, ... }`). 옛 단일 result 도 호환.
        // 우선순위: run > execute > 객체 마지막 키 > 최상위 result
        setIsWelcomePending(false);
        const text = pickAnswerText(data);
        if (text != null && text.trim() !== '') {
          addMessage({ id: Date.now(), type: 'response', content: { result: text }, timestamp: dayjs().format('HH:mm') });
        }
        onAfterResponse?.();
      },
      onError: (error) => {
        Log.warn('testAgent error', error);
        setIsWelcomePending(false);
        addMessage({ id: Date.now(), type: 'response', content: { error: '오류가 발생했습니다.' }, timestamp: dayjs().format('HH:mm') });
        onAfterResponse?.();
      },
    },
  });

  const { mutate: refreshAgent, isPending: isRefreshing } = useRefreshAgent({
    mutationOptions: {
      onError: (error) => {
        Log.warn('refreshAgent error', error);
        setIsWelcomePending(false);
      },
    },
  });

  /** 새 세션으로 대화 시작 — uuid 재생성 + welcome(firstYn:'Y') 수신 */
  const start = (agentId: string) => {
    const uuid = createUUID();
    const newServiceId = `test_${uuid}`;
    const newThreadId = `${agentId}_${uuid}`;
    setServiceId(newServiceId);
    setThreadId(newThreadId);
    setMessages([]);
    setIsWelcomePending(true);
    testAgent({ agentId, body: { firstYn: 'Y', serviceId: newServiceId, threadId: newThreadId, userInput: '' } });
  };

  /** 사용자 메시지 전송 (firstYn:'N') */
  const send = (agentId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTesting || isRefreshing) return;
    addMessage({ id: Date.now(), type: 'request', content: trimmed, timestamp: dayjs().format('HH:mm') });
    testAgent({ agentId, body: { firstYn: 'N', serviceId, threadId, userInput: trimmed } });
  };

  /** 세션 초기화 — refresh(세션 초기화) → test(firstYn:'Y') 로 welcomeMessage 재수신 */
  const refresh = (agentId: string) => {
    const uuid = createUUID();
    const newServiceId = `test_${uuid}`;
    const newThreadId = `${agentId}_${uuid}`;
    setServiceId(newServiceId);
    setThreadId(newThreadId);
    setMessages([]);
    setIsWelcomePending(true);
    refreshAgent(
      { agentId, body: { firstYn: 'Y', serviceId: newServiceId, threadId: newThreadId, userInput: '' } },
      { onSuccess: () => testAgent({ agentId, body: { firstYn: 'Y', serviceId: newServiceId, threadId: newThreadId, userInput: '' } }) },
    );
  };

  /** 대화·세션 비우기 (닫기/에이전트 변경 직전) */
  const reset = () => {
    setMessages([]);
    setThreadId('');
    setServiceId('');
    setIsWelcomePending(false);
  };

  return {
    messages,
    isBusy: isTesting || isRefreshing,
    isWelcomePending,
    start,
    send,
    refresh,
    reset,
  };
};
