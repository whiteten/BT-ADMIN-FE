import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface SearchSectionProps {
  title: string;
  count: number;
  /** "더보기" 노출 여부 (전체 탭에서 미리보기 초과 시) */
  showMore?: boolean;
  onMore?: () => void;
  children: ReactNode;
}

/** 전체 탭의 섹션 래퍼 — 섹션 헤더(제목 + 건수 + 더보기) + 결과 행들 */
export default function SearchSection({ title, count, showMore = false, onMore, children }: SearchSectionProps) {
  return (
    <section className="px-1.5 py-1">
      <header className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-[#343a40]">{title}</span>
          <span className="text-[13px] font-semibold text-[var(--color-bt-primary)] tabular-nums">{count.toLocaleString()}건</span>
        </div>
        {showMore && (
          <button type="button" onClick={onMore} className="flex items-center gap-0.5 text-[12px] text-[#868e96] hover:text-[#343a40] transition-colors cursor-pointer">
            더보기
            <ChevronRight className="size-3.5" />
          </button>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}
