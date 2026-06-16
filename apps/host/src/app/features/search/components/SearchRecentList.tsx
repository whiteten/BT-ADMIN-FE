import { Clock, X } from 'lucide-react';
import { CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface SearchRecentListProps {
  recents: string[];
  /** ↑↓ 키보드 탐색을 시작했는지 여부. false면 cmdk 자동 첫 하이라이트(data-selected)를 시각적으로 숨김 */
  navigated: boolean;
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
}

/** 최근 검색어 목록 — 클릭 시 검색 실행, hover 시 우측 X로 개별 삭제. ↑↓ 키 이동(cmdk) */
export default function SearchRecentList({ recents, navigated, onSelect, onRemove }: SearchRecentListProps) {
  return (
    <CommandList className="max-h-[440px] overflow-y-auto py-1.5">
      <div className="px-4 pb-1.5 pt-1 text-[12px] font-semibold text-[#868e96]">최근 검색어</div>
      <CommandGroup className="px-2">
        {recents.map((term) => (
          <CommandItem
            key={term}
            value={`recent:${term}`}
            onSelect={() => onSelect(term)}
            className={cn(
              'group flex items-center gap-2.5 rounded-lg px-2 py-2 cursor-pointer',
              // cmdk가 첫 항목을 내부 선택해 두므로, ↑↓ 탐색 전(navigated=false)에는 shadcn 회색 선택 배경을
              // 무력화하고 마우스 hover한 항목만 하늘색으로 표시. 탐색 후에는 선택 항목을 하늘색으로 표시.
              navigated
                ? 'data-[selected=true]:bg-[var(--color-bt-primary)]/[0.06]'
                : 'data-[selected=true]:bg-transparent data-[selected=true]:hover:bg-[var(--color-bt-primary)]/[0.06]',
            )}
          >
            <Clock className="size-4 shrink-0 text-[#adb5bd]" />
            <span className="flex-1 truncate text-[14px] text-[#343a40]">{term}</span>
            <button
              type="button"
              aria-label={`${term} 삭제`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(term);
              }}
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded text-[#adb5bd] opacity-0 transition hover:bg-[#e9ecef] hover:text-[#495057] group-hover:opacity-100',
                navigated && 'group-data-[selected=true]:opacity-100',
              )}
            >
              <X className="size-3.5" />
            </button>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  );
}
