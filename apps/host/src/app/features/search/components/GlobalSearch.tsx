import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Loader2, Search } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { useSearchMenus } from '../hooks/useSearchQueries';
import type { DocSearchResult, MenuSearchResult } from '../types/search';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

// 원본(필터링 전) 메뉴 경로 캐시: appId → { menuKey → path }
const rawMenuPathCache: Record<string, Record<string, string>> = {};

const collectMenuPaths = (items: MenuItem[], map: Record<string, string>) => {
  for (const item of items) {
    if (item.path) map[item.menuKey] = item.path;
    if (item.children) collectMenuPaths(item.children, map);
  }
};

const loadRawMenuPaths = async () => {
  const loaders: Array<{ appId: string; load: () => Promise<unknown> }> = [
    { appId: 'manager', load: () => import('manager/MenuConfig') },
    { appId: 'fca', load: () => import('fca/MenuConfig') },
  ];

  for (const { appId, load } of loaders) {
    if (rawMenuPathCache[appId]) continue;
    try {
      const mod = await load();
      const config = (mod as { default: MenuConfig }).default;
      const map: Record<string, string> = {};
      if (config?.menus) collectMenuPaths(config.menus, map);
      rawMenuPathCache[appId] = map;
    } catch {
      rawMenuPathCache[appId] = {};
    }
  }
};

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
  const navigate = useNavigate();
  const { menuConfigs } = useMenuStore();

  useEffect(() => {
    loadRawMenuPaths();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

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
    const path = rawMenuPathCache[result.appId]?.[menuKey] ?? findPathByMenuKey(menuConfigs, result.appId, menuKey);
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
      <PopoverAnchor asChild>
        <Button
          variant="outline"
          className="relative h-10 w-[480px] justify-start gap-3 rounded-full text-sm text-muted-foreground font-normal pl-5 pr-3 border-border/50 bg-background/80 hover:bg-muted/50 hover:border-border hover:cursor-pointer shadow-sm transition-all duration-200 group"
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
          <span className="flex-1 text-left">통합 검색</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60 shadow-none">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </Button>
      </PopoverAnchor>
      <PopoverContent
        className="w-[560px] p-0 overflow-hidden rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] border border-border/40"
        align="center"
        sideOffset={10}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>('[data-slot="command-input"]')?.focus();
        }}
      >
        <Command shouldFilter={false} className="rounded-2xl">
          <div className="relative border-b border-border/40">
            <CommandInput placeholder="메뉴, 기능, 문서 검색..." value={query} onValueChange={setQuery} className="h-14 text-base px-5 placeholder:text-muted-foreground/50" />
            {isLoading && debouncedQuery.length > 0 && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground/60" />}
          </div>

          <CommandList className="max-h-[520px] overflow-y-auto">
            {debouncedQuery.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60">
                  <Search className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground/60">검색어를 입력하세요</p>
              </div>
            )}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60">
                  <Search className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground/60">
                  <span className="font-medium text-foreground/70">"{debouncedQuery}"</span>에 대한 결과가 없습니다
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}
