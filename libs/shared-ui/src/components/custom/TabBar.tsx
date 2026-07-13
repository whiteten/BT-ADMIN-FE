import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TabBarItem<T extends string | number> {
  id: T;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** 탭별 항목 수(N). 집계 API가 없어 계산할 수 없는 화면은 생략 — 그 경우 (N) 배지 자체를 그리지 않는다. */
  count?: number;
}

interface TabBarProps<T extends string | number> {
  items: TabBarItem<T>[];
  selectedId: T | null;
  onSelect: (id: T) => void;
  /** 탭 우측 검색 Input·버튼 등. 있을 때만 컨테이너에 pr-5가 붙는다. */
  rightContent?: React.ReactNode;
}

/**
 * 노드/카테고리 탭 바(좌우 스크롤 화살표 + 가로 스크롤 탭 스트립).
 * "탭바 + 카드 슬라이더 + 하단 그리드" 3단 목록 화면의 1단 — .claude/skills/add-tab-bar/SKILL.md 표준 마크업을 컴포넌트화한 것.
 */
export default function TabBar<T extends string | number>({ items, selectedId, onSelect, rightContent }: TabBarProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
      <div className={`flex items-stretch bg-white flex-shrink-0 h-[56px] ${rightContent ? 'pr-5' : ''}`}>
        <button
          type="button"
          className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
          onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
          aria-label="이전 탭"
        >
          <ChevronLeft className="size-4 text-gray-500" />
        </button>

        <div ref={scrollRef} className="flex items-stretch basis-[60%] shrink grow-0 min-w-0 overflow-x-auto divide-x divide-gray-200" style={{ scrollbarWidth: 'none' }}>
          {items.map((item) => {
            const isActive = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                  isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                }`}
                onClick={(e) => {
                  onSelect(item.id);
                  (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
              >
                <item.icon className="size-3.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.count !== undefined && <span className="text-[11px] text-gray-400 flex-shrink-0">({item.count})</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
          onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
          aria-label="다음 탭"
        >
          <ChevronRight className="size-4 text-gray-500" />
        </button>

        {rightContent && <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3 self-center">{rightContent}</div>}
      </div>
    </div>
  );
}
