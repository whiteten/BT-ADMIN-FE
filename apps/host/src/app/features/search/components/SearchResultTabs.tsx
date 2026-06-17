import { SEARCH_TABS, type SearchTabKey } from '../constants/searchConstants';
import { cn } from '@/lib/utils';

interface SearchResultTabsProps {
  activeTab: SearchTabKey;
  onTabChange: (tab: SearchTabKey) => void;
  counts: Record<SearchTabKey, number>;
}

/** 검색 결과 탭바 — 전체/메뉴/문서. 활성 탭 하단 밑줄(브랜드 블루) */
export default function SearchResultTabs({ activeTab, onTabChange, counts }: SearchResultTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-[#e9ecef] px-3">
      {SEARCH_TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'relative px-3 py-2.5 text-[13px] transition-colors cursor-pointer',
              active ? 'font-semibold text-[var(--color-bt-primary)]' : 'text-[#868e96] hover:text-[#343a40]',
            )}
          >
            <span>{tab.label}</span>
            <span className="ml-1 tabular-nums">{counts[tab.key].toLocaleString()}</span>
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--color-bt-primary)]" />}
          </button>
        );
      })}
    </div>
  );
}
