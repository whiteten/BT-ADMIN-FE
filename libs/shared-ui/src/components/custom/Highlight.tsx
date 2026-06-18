import type { ReactNode } from 'react';
import { fuzzyMatchIndices } from '@/shared-util';

/**
 * Highlight — 텍스트에서 검색어와 매치되는 글자들을 <mark>로 강조.
 *
 * 퍼지 매칭(서브시퀀스 + 한글 초성·자모)을 사용하므로 흩어진 글자도 강조한다.
 * - 연속 입력(부분문자열): 해당 구간을 통째로 강조 (기존 동작과 동일)
 * - 초성/자모 매치: 매치된 음절을 각각 강조 (예: "ㄷㅅ"→ 대·시 강조)
 *
 * 메뉴 크게보기(PanelMega) 검색 하이라이트와 동일 스펙(amber). 트리·목록 등에서 공통 재사용.
 * query 가 비었거나 매칭이 없으면 원본 텍스트를 그대로 반환한다(대소문자 무시).
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return text;

  const indices = fuzzyMatchIndices(query, text);
  if (!indices || indices.length === 0) return text;

  const hit = new Set(indices);
  const nodes: ReactNode[] = [];

  // 연속된 매치/비매치 구간을 묶어 렌더 — 부분문자열 매치는 단일 <mark>로 합쳐진다.
  let i = 0;
  while (i < text.length) {
    const marked = hit.has(i);
    let j = i;
    while (j < text.length && hit.has(j) === marked) j++;
    const segment = text.slice(i, j);
    nodes.push(
      marked ? (
        <mark key={i} className="bg-amber-200/70 text-inherit rounded-sm px-px">
          {segment}
        </mark>
      ) : (
        <span key={i}>{segment}</span>
      ),
    );
    i = j;
  }

  return <>{nodes}</>;
}

export default Highlight;
