import { CHAT_VIEW_TYPE, type ChatResponseBlock, type ChatViewType } from '../types';

const VIEW_TYPES = Object.values(CHAT_VIEW_TYPE);

const isValidBlock = (block: unknown): block is ChatResponseBlock => {
  if (!block || typeof block !== 'object') return false;
  const candidate = block as Partial<ChatResponseBlock>;
  return typeof candidate.answer === 'string' && VIEW_TYPES.includes(candidate.viewType as ChatViewType);
};

/** 저장된 responseJson(v2 — 블록 배열)을 파싱. 구조가 깨졌으면 null (렌더 측에서 fallback 처리) */
export const parseChatResponse = (responseJson: string): ChatResponseBlock[] | null => {
  try {
    const parsed: unknown = JSON.parse(responseJson);
    if (!Array.isArray(parsed)) return null;
    const blocks = parsed.filter(isValidBlock);
    return blocks.length ? blocks : null;
  } catch {
    return null;
  }
};
