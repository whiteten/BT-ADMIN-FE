import { useRef, useState } from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Loader2, Search, X } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import SearchAutocomplete from './SearchAutocomplete';
import SearchRecentList from './SearchRecentList';
import SearchResults from './SearchResults';
import { useOpenInNewTab } from '../../layout/hooks/useOpenInNewTab';
import { DOC_FETCH_LIMIT, type SearchTabKey } from '../constants/searchConstants';
import { useRecentSearchStore } from '../hooks/useRecentSearchStore';
import { useSearchDocs } from '../hooks/useSearchQueries';
import type { DocSearchResult, MenuSearchResult } from '../types/search';
import { buildMenuSuggestions, collectMenuLeaves, findPathByMenuKey, searchMenus } from '../utils/menuSearch';
import { Command } from '@/components/ui/command';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

type SearchMode = 'hidden' | 'recent' | 'autocomplete' | 'results';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(''); // 보이는 값(타이핑)
  const [submittedQuery, setSubmittedQuery] = useState(''); // 실행된 검색어(결과 SoT)
  // ↑↓로 항목을 탐색하기 시작했는지 여부. false면 cmdk 자동 첫 하이라이트를 시각적으로 숨기고 Enter는 입력값 검색,
  // true면 키보드 하이라이트를 표시하고 Enter를 cmdk(하이라이트 항목 선택)에 위임
  const [navigated, setNavigated] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTabKey>('all');
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openInNewTab = useOpenInNewTab();

  const { menuConfigs } = useMenuStore();
  const recents = useRecentSearchStore((s) => s.recents);
  const addRecent = useRecentSearchStore((s) => s.addRecent);
  const removeRecent = useRecentSearchStore((s) => s.removeRecent);

  // 메뉴: menuConfigs(권한 스코프됨)를 FE fuzzy로 검색 — 메뉴 크게보기 검색과 동일 동작
  const menuLeaves = collectMenuLeaves(menuConfigs);
  const suggestions = buildMenuSuggestions(inputValue.trim(), menuLeaves);
  const menus = searchMenus(submittedQuery.trim(), menuLeaves);

  // 문서: 실행된 검색어가 있을 때만 백엔드 검색
  const { data, isFetching } = useSearchDocs({
    params: { q: submittedQuery, limit: DOC_FETCH_LIMIT },
    queryOptions: { enabled: submittedQuery.trim().length > 0 },
  });
  const docs: DocSearchResult[] = data?.docs ?? [];
  const docTotal = data?.total ?? docs.length;

  const mode: SearchMode = submittedQuery.trim() ? 'results' : inputValue.trim() ? 'autocomplete' : recents.length > 0 ? 'recent' : 'hidden';

  const resetSearch = () => {
    setInputValue('');
    setSubmittedQuery('');
    setActiveTab('all');
    setNavigated(false);
  };

  // 검색 실행 — Enter / 자동완성 클릭 / 최근어 클릭 공통
  const executeSearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setInputValue(t);
    setSubmittedQuery(t);
    setActiveTab('all');
    addRecent(t);
    setOpen(true);
    setNavigated(false);
  };

  const handleQueryChange = (value: string) => {
    setInputValue(value);
    setOpen(true);
    setNavigated(false); // 타이핑하면 탐색 초기화 — 첫 하이라이트 숨김 + Enter는 입력값 검색
    // 검색어가 바뀌면 결과를 없애고 자동완성으로 복귀
    if (submittedQuery && value !== submittedQuery) setSubmittedQuery('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // cmdk CommandItem 목록(자동완성·최근검색어)에서만 키보드 하이라이트 노출.
      // results 모드는 plain div라 cmdk 하이라이트 대상이 아님
      if (mode !== 'autocomplete' && mode !== 'recent') return;
      // cmdk는 검색 변경/마운트 시 첫 항목을 내부 선택해 둠. 첫 ↑↓는 이동시키지 않고(=preventDefault)
      // 이미 선택된 첫 항목의 하이라이트만 드러낸다. 이후부터 cmdk 기본 이동에 맡긴다.
      if (!navigated) {
        e.preventDefault();
        setNavigated(true);
      }
    } else if (e.key === 'Enter') {
      // ↑↓로 항목을 탐색한 경우엔 cmdk가 하이라이트 항목 onSelect 실행(차단 안 함)
      if (navigated) return;
      e.preventDefault();
      e.stopPropagation(); // cmdk 자동 select 차단 — 항상 타이핑값 실행
      executeSearch(inputValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      resetSearch();
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSubmittedQuery('');
    setActiveTab('all');
    inputRef.current?.focus();
  };

  const handleSelectMenu = (result: MenuSearchResult) => {
    const path = result.path ?? findPathByMenuKey(menuConfigs, result.appId, result.menuKey);
    // 검색 결과(메뉴) 클릭도 메뉴 클릭과 동일하게 새 탭으로 연다.
    if (path) openInNewTab(`/${result.appId}/${path}`);
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
    if (!isOpen) resetSearch();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Command shouldFilter={false} className="bg-transparent overflow-visible">
        <PopoverAnchor asChild>
          <div
            ref={anchorRef}
            className="group relative flex h-10 w-full items-center gap-3 rounded-full border border-white/20 bg-white/15 pl-5 pr-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 hover:border-white/40 hover:bg-white/25 focus-within:border-white/40 focus-within:bg-white/25"
          >
            <Search className="size-4 shrink-0 text-white/70 transition-colors group-hover:text-white group-focus-within:text-white" />
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={handleQueryChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setOpen(true)}
              placeholder="통합 검색"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/60"
            />
            {isFetching && mode === 'results' && <Loader2 className="size-4 shrink-0 animate-spin text-white/70" />}
            {inputValue.length > 0 && (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={handleClear}
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </PopoverAnchor>

        {mode !== 'hidden' && (
          <PopoverContent
            className="w-[600px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/40 p-0 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)]"
            align="center"
            sideOffset={10}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
          >
            {mode === 'recent' && <SearchRecentList recents={recents} navigated={navigated} onSelect={executeSearch} onRemove={removeRecent} />}
            {mode === 'autocomplete' && <SearchAutocomplete query={inputValue.trim()} suggestions={suggestions} navigated={navigated} onSelect={executeSearch} />}
            {mode === 'results' && (
              <SearchResults
                query={submittedQuery}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                menus={menus}
                docs={docs}
                docTotal={docTotal}
                isFetching={isFetching}
                onSelectMenu={handleSelectMenu}
                onSelectDoc={handleSelectDoc}
              />
            )}
          </PopoverContent>
        )}
      </Command>
    </Popover>
  );
}
