import { CHAT_VIEW_TYPE, type ChatResponseBlock, type ChatViewType } from '../types';

const VIEW_TYPES = Object.values(CHAT_VIEW_TYPE);

const isValidBlock = (block: unknown): block is ChatResponseBlock => {
  if (!block || typeof block !== 'object') return false;
  const candidate = block as Partial<ChatResponseBlock>;
  return typeof candidate.answer === 'string' && VIEW_TYPES.includes(candidate.viewType as ChatViewType);
};

/**
 * LLM 이 출력 규칙을 어기고 마크다운 코드펜스(```json)나 배열 밖 텍스트를 섞은 경우 방어 —
 * 첫 '[' 부터 마지막 ']' 까지만 추출해 파싱한다.
 */
const sanitizeResponseJson = (raw: string): string => {
  const text = raw.trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return text;
  return text.slice(start, end + 1);
};

/** 저장된 responseJson(v2 — 블록 배열)을 파싱. 구조가 깨졌으면 null (렌더 측에서 fallback 처리) */
export const parseChatResponse = (responseJson: string): ChatResponseBlock[] | null => {
  try {
    const parsed: unknown = JSON.parse(sanitizeResponseJson(responseJson));
    if (!Array.isArray(parsed)) return null;
    const blocks = parsed.filter(isValidBlock);
    return blocks.length ? blocks : null;
  } catch {
    return null;
  }
};
