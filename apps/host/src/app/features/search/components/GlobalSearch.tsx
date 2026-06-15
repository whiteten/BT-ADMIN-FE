import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command as CommandPrimitive } from 'cmdk';
import { debounce } from 'lodash';
import { BookOpen, ChevronRight, Clock, Loader2, Search, X } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { fuzzyFilter, fuzzyScore } from '@/shared-util';
import { type PrevSearch, useSearchHistoryStore } from '../hooks/useSearchHistoryStore';
import { useSearchDocs } from '../hooks/useSearchQueries';
import type { DocSearchResult, MenuSearchResult } from '../types/search';
import { Highlight } from '@/components/custom/Highlight';
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

/** fuzzy 매칭 대상 — menuConfigs(=권한 스코프된 navi)에서 추출한 leaf(페이지) 메뉴 */
interface MenuLeaf {
  label: string;
  appId: string;
  menuKey: string;
  breadcrumb: string[];
}

/**
 * menuConfigs 트리를 leaf(페이지) 목록으로 평탄화한다.
 * - hide 메뉴 제외, path 있는 항목(페이지)만 결과에 포함 (폴더 제외)
 * - breadcrumb = [앱명, ...상위 폴더 label] (자기 자신 제외) — 백엔드 결과와 동일 형식
 */
const collectMenuLeaves = (configs: MenuConfig[]): MenuLeaf[] => {
  const out: MenuLeaf[] = [];
  for (const config of configs) {
    const walk = (items: MenuItem[], trail: string[]) => {
      for (const item of items) {
        if (item.hide) continue;
        if (item.path) {
          out.push({ label: item.label, appId: config.appId, menuKey: item.menuKey, breadcrumb: [config.appName, ...trail] });
        }
        if (item.children) walk(item.children, [...trail, item.label]);
      }
    };
    walk(config.menus, []);
  }
  return out;
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

  const prevSearch = useSearchHistoryStore((s) => s.prev);
  const setPrevSearch = useSearchHistoryStore((s) => s.setPrev);
  const clearPrevSearch = useSearchHistoryStore((s) => s.clearPrev);

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

  const { data, isFetching } = useSearchDocs({
    params: { q: debouncedQuery, limit: 20 },
    queryOptions: {
      enabled: debouncedQuery.length > 0,
      placeholderData: (prev) => prev,
    },
  });

  // 메뉴: 백엔드 결과 대신 menuConfigs(권한 스코프됨)를 FE fuzzy로 검색 — 메뉴 크게보기 검색과 동일 동작
  const menuLeaves = useMemo(() => collectMenuLeaves(menuConfigs), [menuConfigs]);
  const menus: MenuSearchResult[] = useMemo(() => {
    if (debouncedQuery.length === 0) return [];
    return fuzzyFilter(debouncedQuery, menuLeaves, (m) => m.label)
      .slice(0, 20)
      .map((m) => ({
        id: `menu:${m.menuKey}`,
        type: 'MENU' as const,
        label: m.label,
        breadcrumb: m.breadcrumb,
        appId: m.appId,
        menuKey: m.menuKey,
        score: fuzzyScore(debouncedQuery, m.label),
      }));
  }, [debouncedQuery, menuLeaves]);

  // 문서: 현행 유지 — 백엔드 검색 결과 그대로 사용
  const docs = data?.docs ?? [];
  const hasResults = menus.length > 0 || docs.length > 0;
  const isLoading = isFetching || query.trim() !== debouncedQuery;

  // 직전 검색 보관 — 현재 검색이 안정되고 결과가 있을 때만 스냅샷을 ref에 갱신
  const snapshotRef = useRef<PrevSearch | null>(null);
  useEffect(() => {
    if (debouncedQuery.length === 0 || isLoading) return;
    if (menus.length === 0 && docs.length === 0) return; // 빈 결과는 직전검색으로 저장하지 않음
    snapshotRef.current = { query: debouncedQuery, menus, docs };
  }, [debouncedQuery, isLoading, menus, docs]);

  // 검색어가 바뀌거나 비워지면 직전 스냅샷을 store.prev로 커밋 (현재 검색어와 다를 때만)
  // - 빈 문자열로 지운 경우/검색창 닫은 경우에도 직전 검색을 남겨 자연스럽게 표기
  useEffect(() => {
    const snap = snapshotRef.current;
    if (snap && snap.query !== debouncedQuery) setPrevSearch(snap);
  }, [debouncedQuery, setPrevSearch]);

  // 직전 영역 표시 조건 — 현재 검색어와 다르고 결과가 있는 직전 스냅샷이 있을 때
  const showPrev = !!prevSearch && prevSearch.query !== debouncedQuery && (prevSearch.menus.length > 0 || prevSearch.docs.length > 0);
  const showEmpty = debouncedQuery.length > 0 && !isLoading && !hasResults;

  // 검색 상태 초기화 — pending debounce까지 취소해야 뒤늦은 setDebouncedQuery로 로딩이 멈추지 않는 문제를 방지
  const resetSearch = () => {
    debouncedSetQuery.cancel();
    setQuery('');
    setDebouncedQuery('');
  };

  const handleSelectMenu = (result: MenuSearchResult) => {
    const menuKey = result.id.split(':')[1];
    const path = findPathByMenuKey(menuConfigs, result.appId, menuKey);
    if (path) navigate(`/${result.appId}/${path}`);
    setOpen(false);
    resetSearch();
  };

  const handleSelectDoc = (result: DocSearchResult) => {
    window.open(result.url, '_blank', 'noopener,noreferrer');
    setOpen(false);
    resetSearch();
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetSearch();
    }
  };

  // 이전 검색 비우기 — store.prev + ref 스냅샷 동시 제거(지운 검색 재커밋 방지)
  const handleClearPrev = () => {
    snapshotRef.current = null;
    clearPrevSearch();
  };

  // 메뉴·문서 결과 그룹 렌더 (현재 결과 영역과 직전 결과 영역에서 공통 사용)
  const renderResultGroups = (menuItems: MenuSearchResult[], docItems: DocSearchResult[], highlightQuery: string, keyPrefix: string) => (
    <>
      {menuItems.length > 0 && (
        <CommandGroup
          className="px-3 pt-3 pb-2"
          heading={
            <div className="flex items-center justify-between px-1 pb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest">메뉴</span>
              </div>
              <span className="text-[11px] text-muted-foreground/50 tabular-nums">{menuItems.length}건</span>
            </div>
          }
        >
          {menuItems.map((result) => (
            <CommandItem
              key={`${keyPrefix}:${result.id}`}
              value={`${keyPrefix}:${result.id}`}
              onSelect={() => handleSelectMenu(result)}
              className="flex items-center gap-3.5 px-3 py-3.5 rounded-xl cursor-pointer data-[selected=true]:bg-primary/8 group/item mb-0.5 last:mb-0"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0 group-data-[selected=true]/item:bg-primary/15 transition-colors">
                <Search className="h-4 w-4 text-primary/70" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground/90 truncate">
                    <Highlight text={result.label} query={highlightQuery} />
                  </span>
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

      {menuItems.length > 0 && docItems.length > 0 && <CommandSeparator className="mx-3 my-1 bg-border/30" />}

      {docItems.length > 0 && (
        <CommandGroup
          className="px-3 pt-3 pb-2"
          heading={
            <div className="flex items-center justify-between px-1 pb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60" />
                <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest">문서</span>
              </div>
              <span className="text-[11px] text-muted-foreground/50 tabular-nums">{docItems.length}건</span>
            </div>
          }
        >
          {docItems.map((result) => (
            <CommandItem
              key={`${keyPrefix}:${result.id}`}
              value={`${keyPrefix}:${result.id}`}
              onSelect={() => handleSelectDoc(result)}
              className="flex items-center gap-3.5 px-3 py-3.5 rounded-xl cursor-pointer data-[selected=true]:bg-blue-500/8 group/item mb-0.5 last:mb-0"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 shrink-0 group-data-[selected=true]/item:bg-blue-500/15 transition-colors">
                <BookOpen className="h-4 w-4 text-blue-500/70" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground/90 truncate">
                    <Highlight text={result.label} query={highlightQuery} />
                  </span>
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
    </>
  );

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
          {/* 각 영역 독립 max-height + 초과 시 자체 스크롤 (전체 flex 분배 안 함) */}
          <CommandList className="max-h-[640px] overflow-hidden">
            {/* 검색어 없음 placeholder — 지금검색과 배타적, 고정 높이 안에서 중앙 */}
            {debouncedQuery.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 h-[400px]">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60">
                  <Search className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground/60">검색어를 입력하세요</p>
              </div>
            )}
            {debouncedQuery.length > 0 && isLoading && !hasResults && (
              <div className="flex flex-col items-center justify-center gap-3 h-[400px]">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60">
                  <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground/60">검색중</p>
              </div>
            )}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center gap-3 h-[400px]">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60">
                  <Search className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground/60">
                  <span className="font-medium text-foreground/70">{`"${debouncedQuery}"`}</span>에 대한 결과가 없습니다
                </p>
              </div>
            )}

            {/* 지금 검색 결과 영역 — max-h(400) 초과 시 자체 스크롤 */}
            {hasResults && <div className="max-h-[400px] overflow-y-auto">{renderResultGroups(menus, docs, debouncedQuery, 'cur')}</div>}

            {/* 이전 검색 영역 — 현재 결과 아래에 구분해 표기, 자체 내부 스크롤 */}
            {showPrev && (
              <div>
                <CommandSeparator className="mx-3 my-1.5 bg-border/40" />
                <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                    <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest shrink-0">이전 검색</span>
                    <span className="text-[11px] text-muted-foreground/50 truncate">· {prevSearch.query}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPrev}
                    aria-label="이전 검색 비우기"
                    className="flex items-center justify-center shrink-0 w-5 h-5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {/* 이전 결과 — 자기 콘텐츠 높이만큼 그리되, max-h(200) 초과 시 내부 스크롤 */}
                <div className="max-h-[200px] overflow-y-auto">{renderResultGroups(prevSearch.menus, prevSearch.docs, prevSearch.query, 'prev')}</div>
              </div>
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
