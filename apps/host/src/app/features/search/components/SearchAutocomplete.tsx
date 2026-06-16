import { Search } from 'lucide-react';
import { Highlight } from '@/components/custom/Highlight';
import { CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

interface SearchAutocompleteProps {
  query: string;
  suggestions: string[];
  onSelect: (label: string) => void;
}

/** 자동완성 — 메뉴명 제안(라벨만). 클릭 시 검색 실행. 제안 없으면 입력어 그대로 검색하는 항목 노출 */
export default function SearchAutocomplete({ query, suggestions, onSelect }: SearchAutocompleteProps) {
  return (
    <CommandList className="max-h-[440px] overflow-y-auto py-1.5">
      <div className="px-4 pb-1.5 pt-1 text-[12px] font-semibold text-[#868e96]">자동완성 검색어</div>
      <CommandGroup className="px-2">
        {suggestions.length > 0 ? (
          suggestions.map((label) => (
            <CommandItem
              key={label}
              value={`sg:${label}`}
              onSelect={() => onSelect(label)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 cursor-pointer data-[selected=true]:bg-[var(--color-bt-primary)]/[0.06]"
            >
              <Search className="size-4 shrink-0 text-[#adb5bd]" />
              <span className="flex-1 truncate text-[14px] text-[#343a40]">
                <Highlight text={label} query={query} />
              </span>
            </CommandItem>
          ))
        ) : (
          <CommandItem
            value={`sg:__raw__`}
            onSelect={() => onSelect(query)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 cursor-pointer data-[selected=true]:bg-[var(--color-bt-primary)]/[0.06]"
          >
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
