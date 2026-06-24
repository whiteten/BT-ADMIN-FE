import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableChunkTextProps {
  text: string;
  /** 접힌 상태에서 보여줄 최대 줄 수 (기본 4) */
  collapsedLines?: number;
}

/**
 * 청크 본문처럼 길이가 들쭉날쭉한 텍스트를 접었다 펼치는 컴포넌트.
 * 줄바꿈(\n) 유무와 무관하게 "렌더된 줄 수" 기준으로 자르고(line-clamp),
 * 실제로 넘칠 때만 더보기 버튼을 노출한다.
 */
export default function ExpandableChunkText({ text, collapsedLines = 4 }: ExpandableChunkTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // 접힌 상태(line-clamp 적용)에서만 실제 넘침 여부를 측정한다.
  // 펼친 동안에는 측정을 건너뛰어 isClamped 값을 유지 → 접기 버튼이 사라지지 않음.
  useEffect(() => {
    const el = ref.current;
    if (el && !expanded) setIsClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <>
      <p
        ref={ref}
        className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
        style={expanded ? undefined : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: collapsedLines, overflow: 'hidden' }}
      >
        {text}
      </p>
      {isClamped && (
        <button type="button" onClick={() => setExpanded((prev) => !prev)} className="mt-2 flex items-center gap-1 text-xs text-[var(--color-bt-primary)] hover:underline">
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {expanded ? '접기' : '더 보기'}
        </button>
      )}
    </>
  );
}
