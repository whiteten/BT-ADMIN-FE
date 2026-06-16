import { Clock, X } from 'lucide-react';
import { CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

interface SearchRecentListProps {
  recents: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
}

/** 최근 검색어 목록 — 클릭 시 검색 실행, hover 시 우측 X로 개별 삭제. ↑↓ 키 이동(cmdk) */
export default function SearchRecentList({ recents, onSelect, onRemove }: SearchRecentListProps) {
  return (
    <CommandList className="max-h-[440px] overflow-y-auto py-1.5">
      <div className="px-4 pb-1.5 pt-1 text-[12px] font-semibold text-[#868e96]">최근 검색어</div>
      <CommandGroup className="px-2">
        {recents.map((term) => (
          <CommandItem
            key={term}
            value={`recent:${term}`}
            onSelect={() => onSelect(term)}
            className="group flex items-center gap-2.5 rounded-lg px-2 py-2 cursor-pointer data-[selected=true]:bg-[var(--color-bt-primary)]/[0.06]"
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
              className="flex size-5 shrink-0 items-center justify-center rounded text-[#adb5bd] opacity-0 transition hover:bg-[#e9ecef] hover:text-[#495057] group-hover:opacity-100 group-data-[selected=true]:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  );
}
