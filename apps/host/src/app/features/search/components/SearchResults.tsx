import { Loader2, Search } from 'lucide-react';
import DocResultRow from './DocResultRow';
import MenuResultRow from './MenuResultRow';
import SearchResultTabs from './SearchResultTabs';
import SearchSection from './SearchSection';
import { ALL_TAB_PREVIEW_COUNT, type SearchTabKey } from '../constants/searchConstants';
import type { DocSearchResult, MenuSearchResult } from '../types/search';

interface SearchResultsProps {
  query: string;
  activeTab: SearchTabKey;
  onTabChange: (tab: SearchTabKey) => void;
  menus: MenuSearchResult[];
  docs: DocSearchResult[];
  /** 문서 총 건수 (SearchData.total) — fetched 길이가 아닌 전체 카운트 */
  docTotal: number;
  isFetching: boolean;
  onSelectMenu: (result: MenuSearchResult) => void;
  onSelectDoc: (result: DocSearchResult) => void;
}

const StateBlock = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex h-[260px] flex-col items-center justify-center gap-3">
    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f1f3f5]">{icon}</div>
    <p className="text-[13px] text-[#868e96]">{text}</p>
  </div>
);

/** 검색 결과 영역 — 제목 + 탭(전체/메뉴/문서) + 탭별 본문 */
export default function SearchResults({ query, activeTab, onTabChange, menus, docs, docTotal, isFetching, onSelectMenu, onSelectDoc }: SearchResultsProps) {
  const menuCount = menus.length;
  const counts: Record<SearchTabKey, number> = { all: menuCount + docTotal, menu: menuCount, doc: docTotal };
  const hasAny = menuCount > 0 || docs.length > 0;

  const renderBody = () => {
    // 메뉴는 즉시(FE), 문서는 async — 아무 결과도 없고 문서 로딩 중이면 로더
    if (!hasAny && isFetching) {
      return <StateBlock icon={<Loader2 className="size-5 animate-spin text-[#adb5bd]" />} text="검색중" />;
    }
    if (!hasAny) {
      return <StateBlock icon={<Search className="size-5 text-[#adb5bd]" />} text={`'${query}'에 대한 결과가 없습니다`} />;
    }

    if (activeTab === 'menu') {
      if (menuCount === 0) return <StateBlock icon={<Search className="size-5 text-[#adb5bd]" />} text="메뉴 결과가 없습니다" />;
      return (
        <div className="px-1.5 py-1">
          {menus.map((m) => (
            <MenuResultRow key={m.id} result={m} query={query} onSelect={onSelectMenu} />
          ))}
        </div>
      );
    }

    if (activeTab === 'doc') {
      if (isFetching && docs.length === 0) return <StateBlock icon={<Loader2 className="size-5 animate-spin text-[#adb5bd]" />} text="검색중" />;
      if (docs.length === 0) return <StateBlock icon={<Search className="size-5 text-[#adb5bd]" />} text="문서 결과가 없습니다" />;
      return (
        <div className="px-1.5 py-1">
          {docs.map((d) => (
            <DocResultRow key={d.id} result={d} query={query} onSelect={onSelectDoc} />
          ))}
        </div>
      );
    }

    // activeTab === 'all' — 섹션별 미리보기 + 더보기
    return (
      <>
        {menuCount > 0 && (
          <SearchSection title="메뉴" count={menuCount} showMore={menuCount > ALL_TAB_PREVIEW_COUNT} onMore={() => onTabChange('menu')}>
            {menus.slice(0, ALL_TAB_PREVIEW_COUNT).map((m) => (
              <MenuResultRow key={m.id} result={m} query={query} onSelect={onSelectMenu} />
            ))}
          </SearchSection>
        )}
        {docs.length > 0 && (
          <SearchSection title="문서" count={docTotal} showMore={docTotal > ALL_TAB_PREVIEW_COUNT} onMore={() => onTabChange('doc')}>
            {docs.slice(0, ALL_TAB_PREVIEW_COUNT).map((d) => (
              <DocResultRow key={d.id} result={d} query={query} onSelect={onSelectDoc} />
            ))}
          </SearchSection>
        )}
        {isFetching && docs.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-[#adb5bd]">
            <Loader2 className="size-3.5 animate-spin" />
            문서 검색 중
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-2.5 pt-3.5">
        <p className="text-[14px] text-[#495057]">
          <span className="font-semibold text-[var(--color-bt-primary)]">&apos;{query}&apos;</span>에 대한 검색결과
        </p>
      </div>
      <SearchResultTabs activeTab={activeTab} onTabChange={onTabChange} counts={counts} />
      <div className="max-h-[460px] overflow-y-auto p-1.5">{renderBody()}</div>
    </div>
  );
}
