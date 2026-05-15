import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command as CommandPrimitive } from 'cmdk';
import { debounce } from 'lodash';
import { BookOpen, ChevronRight, Loader2, Search } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { useSearchMenus } from '../hooks/useSearchQueries';
import type { DocSearchResult, MenuSearchResult } from '../types/search';
import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

const findPathByMenuKey = (menuConfigs: MenuConfig[], appId: string, menuKey: string): string | undefined => {
  const config = menuConfigs.find((c) => c.appId === appId);
  if (!config) return undefined;
  const search = (items: MenuItem[]): string | undefined => {
    for (const item of items) {
      if (item.menuKey === menuKey) return item.path;
      if (item.children) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return undefined;
  };
  return search(config.menus);
};

const RESULT_TYPE_LABEL: Record<string, string> = {
  MENU: '메뉴',
  DOC: '문서',
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debouncedSetQuery] = useState(() => debounce((value: string) => setDebouncedQuery(value), 300));
  const anchorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { menuConfigs } = useMenuStore();

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      debouncedSetQuery.cancel();
      setDebouncedQuery('');
      return;
    }
    debouncedSetQuery(trimmed);
  };

  useEffect(() => {
    return () => debouncedSetQuery.cancel();
  }, [debouncedSetQuery]);

  const { data, isFetching } = useSearchMenus({
    params: { q: debouncedQuery, limit: 20 },
    queryOptions: {
      enabled: debouncedQuery.length > 0,
      placeholderData: (prev) => prev,
    },
  });

  const menus = data?.menus ?? [];
  const docs = data?.docs ?? [];
  const hasResults = menus.length > 0 || docs.length > 0;
  const isLoading = isFetching || query.trim() !== debouncedQuery;
  const showEmpty = debouncedQuery.length > 0 && !isLoading && !hasResults;

  const handleSelectMenu = (result: MenuSearchResult) => {
    const menuKey = result.id.split(':')[1];
    const path = findPathByMenuKey(menuConfigs, result.appId, menuKey);
    if (path) navigate(`/${result.appId}/${path}`);
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  };

  const handleSelectDoc = (result: DocSearchResult) => {
    window.open(result.url, '_blank', 'noopener,noreferrer');
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Command shouldFilter={false} className="bg-transparent overflow-visible">
        <PopoverAnchor asChild>
          <div
            ref={anchorRef}
            className="relative h-10 w-full flex items-center gap-3 rounded-full pl-5 pr-3 border border-white/20 bg-white/15 hover:bg-white/25 hover:border-white/40 focus-within:bg-white/25 focus-within:border-white/40 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 group"
          >
            <Search className="h-4 w-4 shrink-0 text-white/70 group-hover:text-white group-focus-within:text-white transition-colors" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={handleQueryChange}
              onFocus={() => setOpen(true)}
              placeholder="통합 검색"
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/60"
            />
            {isLoading && debouncedQuery.length > 0 && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/70" />}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[560px] p-0 overflow-hidden rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] border border-border/40"
          align="center"
          sideOffset={10}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          <CommandList className="max-h-[520px] overflow-y-auto">
            {debouncedQuery.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60">
                  <Search className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground/60">검색어를 입력하세요</p>
              </div>
            )}
            {debouncedQuery.length > 0 && isLoading && !hasResults && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60">
                  <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground/60">검색중</p>
              </div>
            )}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60">
                  <Search className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground/60">
                  <span className="font-medium text-foreground/70">{`"${debouncedQuery}"`}</span>에 대한 결과가 없습니다
                </p>
              </div>
            )}

            {menus.length > 0 && (
              <CommandGroup
                className="px-3 pt-3 pb-2"
                heading={
                  <div className="flex items-center justify-between px-1 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest">메뉴</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/50 tabular-nums">{menus.length}건</span>
                  </div>
                }
              >
                {menus.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleSelectMenu(result)}
                    className="flex items-center gap-3.5 px-3 py-3.5 rounded-xl cursor-pointer data-[selected=true]:bg-primary/8 group/item mb-0.5 last:mb-0"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0 group-data-[selected=true]/item:bg-primary/15 transition-colors">
                      <Search className="h-4 w-4 text-primary/70" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground/90 truncate">{result.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0 rounded-full bg-primary/8 text-primary/70 border-0 font-medium">
                          {RESULT_TYPE_LABEL[result.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 truncate">
                        {result.breadcrumb.map((crumb, idx) => (
                          <span key={idx} className="flex items-center gap-1 shrink-0">
                            {idx > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40" />}
                            {crumb}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 opacity-0 group-data-[selected=true]/item:opacity-100 transition-opacity" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {menus.length > 0 && docs.length > 0 && <CommandSeparator className="mx-3 my-1 bg-border/30" />}

            {docs.length > 0 && (
              <CommandGroup
                className="px-3 pt-3 pb-2"
                heading={
                  <div className="flex items-center justify-between px-1 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60" />
                      <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest">문서</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/50 tabular-nums">{docs.length}건</span>
                  </div>
                }
              >
                {docs.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleSelectDoc(result)}
                    className="flex items-center gap-3.5 px-3 py-3.5 rounded-xl cursor-pointer data-[selected=true]:bg-blue-500/8 group/item mb-0.5 last:mb-0"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 shrink-0 group-data-[selected=true]/item:bg-blue-500/15 transition-colors">
                      <BookOpen className="h-4 w-4 text-blue-500/70" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground/90 truncate">{result.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0 rounded-full bg-blue-500/8 text-blue-600/70 border-0 font-medium">
                          {RESULT_TYPE_LABEL[result.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 truncate">
                        {result.breadcrumb.map((crumb, idx) => (
                          <span key={idx} className="flex items-center gap-1 shrink-0">
                            {idx > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40" />}
                            {crumb}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 opacity-0 group-data-[selected=true]/item:opacity-100 transition-opacity" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          <div className="border-t border-border/30 px-5 py-3 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground/50">
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center rounded border border-border/60 bg-background px-1.5 py-px font-mono text-[10px] shadow-sm leading-none h-4">
                  ↑↓
                </kbd>
                <span>이동</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center rounded border border-border/60 bg-background px-1.5 py-px font-mono text-[10px] shadow-sm leading-none h-4">
                  ↵
                </kbd>
                <span>선택</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center rounded border border-border/60 bg-background px-1.5 py-px font-mono text-[10px] shadow-sm leading-none h-4">
                  Esc
                </kbd>
                <span>닫기</span>
              </span>
            </div>
            {hasResults && <span className="text-[11px] text-muted-foreground/40 tabular-nums">총 {menus.length + docs.length}건</span>}
          </div>
        </PopoverContent>
      </Command>
    </Popover>
  );
}
