import { BookOpen, ChevronRight } from 'lucide-react';
import type { DocSearchResult } from '../types/search';
import { Highlight } from '@/components/custom/Highlight';

interface DocResultRowProps {
  result: DocSearchResult;
  query: string;
  onSelect: (result: DocSearchResult) => void;
}

/** 문서 검색 결과 행 — 아이콘 + 라벨(하이라이트) + breadcrumb. 행 클릭 시 새 탭으로 문서 열기 */
export default function DocResultRow({ result, query, onSelect }: DocResultRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(result)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(result);
        }
      }}
      className="group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-[#f5f6f8] transition-colors"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef0f2]">
        <BookOpen className="size-4 text-[#868e96]" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-medium text-[#212529]">
          <Highlight text={result.label} query={query} />
        </span>
        {result.breadcrumb.length > 0 && (
          <span className="flex items-center gap-1 truncate text-[12px] text-[#868e96]">
            {result.breadcrumb.map((crumb, idx) => (
              <span key={idx} className="flex shrink-0 items-center gap-1">
                {idx > 0 && <ChevronRight className="size-2.5 shrink-0 text-[#ced4da]" />}
                {crumb}
              </span>
            ))}
          </span>
        )}
      </div>

      <ChevronRight className="size-4 shrink-0 text-[#ced4da] opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
