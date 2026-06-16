import { Search } from 'lucide-react';
import { Highlight } from '@/components/custom/Highlight';
import { CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface SearchAutocompleteProps {
  query: string;
  suggestions: string[];
  /** ↑↓ 키보드 탐색을 시작했는지 여부. false면 cmdk 자동 첫 하이라이트(data-selected)를 시각적으로 숨김 */
  navigated: boolean;
  onSelect: (label: string) => void;
}

// cmdk는 첫 항목을 항상 내부 선택(data-selected)해 둔다. ↑↓ 탐색 시작(navigated) 전에는
// shadcn 기본 회색 선택 배경을 transparent로 무력화하고, 마우스 hover한 항목만 하늘색으로 표시한다.
// navigated 후에는 선택 항목을 하늘색으로 표시.
const itemClass = (navigated: boolean) =>
  cn(
    'flex items-center gap-2.5 rounded-lg px-2 py-2 cursor-pointer',
    navigated ? 'data-[selected=true]:bg-[var(--color-bt-primary)]/[0.06]' : 'data-[selected=true]:bg-transparent data-[selected=true]:hover:bg-[var(--color-bt-primary)]/[0.06]',
  );

/** 자동완성 — 메뉴명 제안(라벨만). 클릭 시 검색 실행. 제안 없으면 입력어 그대로 검색하는 항목 노출 */
export default function SearchAutocomplete({ query, suggestions, navigated, onSelect }: SearchAutocompleteProps) {
  return (
    <CommandList className="max-h-[440px] overflow-y-auto py-1.5">
      <div className="px-4 pb-1.5 pt-1 text-[12px] font-semibold text-[#868e96]">자동완성 검색어</div>
      <CommandGroup className="px-2">
        {suggestions.length > 0 ? (
          suggestions.map((label) => (
            <CommandItem key={label} value={`sg:${label}`} onSelect={() => onSelect(label)} className={itemClass(navigated)}>
              <Search className="size-4 shrink-0 text-[#adb5bd]" />
              <span className="flex-1 truncate text-[14px] text-[#343a40]">
                <Highlight text={label} query={query} />
              </span>
            </CommandItem>
          ))
        ) : (
          <CommandItem value={`sg:__raw__`} onSelect={() => onSelect(query)} className={itemClass(navigated)}>
            <Search className="size-4 shrink-0 text-[#adb5bd]" />
            <span className="flex-1 truncate text-[14px] text-[#343a40]">
              <span className="font-semibold text-[#343a40]">&apos;{query}&apos;</span> 검색
            </span>
          </CommandItem>
        )}
      </CommandGroup>
    </CommandList>
  );
}
