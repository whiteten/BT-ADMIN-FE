import { ChevronRight } from 'lucide-react';
import { FavoriteButton } from '../../layout/components/FavoriteButton';
import type { MenuSearchResult } from '../types/search';
import { Highlight } from '@/components/custom/Highlight';
import { cn } from '@/lib/utils';

interface MenuResultRowProps {
  result: MenuSearchResult;
  query: string;
  onSelect: (result: MenuSearchResult) => void;
}

/** 메뉴 검색 결과 행 — 별표(즐겨찾기) + 아이콘 + 라벨(하이라이트) + breadcrumb. 행 클릭 시 해당 메뉴로 이동 */
export default function MenuResultRow({ result, query, onSelect }: MenuResultRowProps) {
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
      {/* 별표 — 행 클릭 전파 차단 */}
      {result.path && (
        <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton menuKey={result.menuKey} label={result.label} path={result.path} appId={result.appId} />
        </span>
      )}

      {/* 라벨 + breadcrumb */}
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

      <ChevronRight className={cn('size-4 shrink-0 text-[#ced4da] opacity-0 transition-opacity group-hover:opacity-100')} />
    </div>
  );
}
