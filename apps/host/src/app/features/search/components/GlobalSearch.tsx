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

// 원본(필터링 전) 메뉴 경로 캐시: appId → { menuId → path }
const rawMenuPathCache: Record<string, Record<number, string>> = {};

const collectMenuPaths = (items: MenuItem[], map: Record<number, string>) => {
  for (const item of items) {
    if (item.path) map[item.menuId] = item.path;
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
      const map: Record<number, string> = {};
      if (config?.menus) collectMenuPaths(config.menus, map);
      rawMenuPathCache[appId] = map;
    } catch {
      rawMenuPathCache[appId] = {};
    }
  }
};

const findPathByMenuId = (menuConfigs: MenuConfig[], appId: string, menuId: number): string | undefined => {
  const config = menuConfigs.find((c) => c.appId === appId);
  if (!config) return undefined;
  const search = (items: MenuItem[]): string | undefined => {
    for (const item of items) {
      if (item.menuId === menuId) return item.path;
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
    const menuId = Number(result.id.split(':')[1]);
    const path = rawMenuPathCache[result.appId]?.[menuId] ?? findPathByMenuId(menuConfigs, result.appId, menuId);
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
          className="relative h-9 w-80 justify-start gap-2 rounded-full text-sm text-muted-foreground font-normal px-4 border-border/60 bg-muted/40 hover:bg-muted/70 hover:border-border hover:cursor-pointer shadow-none transition-colors"
          onClick={() => setOpen(true)}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span>통합 검색</span>
        </Button>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-anchor-width)] min-w-80 p-0 overflow-hidden rounded-2xl shadow-2xl border-border/50"
        align="center"
        sideOffset={8}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>('[data-slot="command-input"]')?.focus();
        }}
      >
        <Command shouldFilter={false} className="rounded-2xl">
          <div className="relative">
            <CommandInput placeholder="메뉴, 기능 검색..." value={query} onValueChange={setQuery} className="h-12 text-sm" />
            {isLoading && debouncedQuery.length > 0 && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <CommandList className="max-h-[400px]">
            {debouncedQuery.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">검색어를 입력하세요.</div>}
            {showEmpty && <div className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</div>}
            {menus.length > 0 && (
              <CommandGroup
                className="px-2 pb-2"
                heading={
                  <span className="flex items-center justify-between px-1 pt-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">메뉴</span>
                    <span className="text-xs text-muted-foreground">{menus.length}건</span>
                  </span>
                }
              >
                {menus.map((result) => (
                  <CommandItem key={result.id} value={result.id} onSelect={() => handleSelectMenu(result)} className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                      <Search className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{result.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0 rounded-full">
                          {RESULT_TYPE_LABEL[result.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {result.breadcrumb.map((crumb, idx) => (
                          <span key={idx} className="flex items-center gap-1">
                            {idx > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0" />}
                            {crumb}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {menus.length > 0 && docs.length > 0 && <CommandSeparator />}
            {docs.length > 0 && (
              <CommandGroup
                className="px-2 pb-2"
                heading={
                  <span className="flex items-center justify-between px-1 pt-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">문서</span>
                    <span className="text-xs text-muted-foreground">{docs.length}건</span>
                  </span>
                }
              >
                {docs.map((result) => (
                  <CommandItem key={result.id} value={result.id} onSelect={() => handleSelectDoc(result)} className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 shrink-0">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{result.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0 rounded-full">
                          {RESULT_TYPE_LABEL[result.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {result.breadcrumb.map((crumb, idx) => (
                          <span key={idx} className="flex items-center gap-1">
                            {idx > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0" />}
                            {crumb}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {hasResults && (
            <div className="border-t border-border/50 px-4 py-2.5 flex items-center gap-4 text-[11px] text-muted-foreground/70 bg-muted/20">
              <span>
                <kbd className="rounded-md border bg-background px-1.5 py-0.5 font-mono shadow-sm">↑↓</kbd> 이동
              </span>
              <span>
                <kbd className="rounded-md border bg-background px-1.5 py-0.5 font-mono shadow-sm">Enter</kbd> 이동
              </span>
              <span>
                <kbd className="rounded-md border bg-background px-1.5 py-0.5 font-mono shadow-sm">Esc</kbd> 닫기
              </span>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
