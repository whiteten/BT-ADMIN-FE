import { useEffect, useState } from 'react';

/** 멀티선택 드롭다운 (공용) — 큐/그룹/상담사/미디어타입 등 id 목록 멀티선택에 사용. */
export interface MultiSelectDropdownProps {
  label: string;
  color: string;
  isFetching: boolean;
  items: { id: string; name: string }[];
  selectedIds: string[];
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onToggleItem: (id: string) => void;
  onToggleAll: () => void;
  emptyText?: string;
}

export function MultiSelectDropdown({
  label,
  color,
  isFetching,
  items,
  selectedIds,
  isOpen,
  dropdownRef,
  onToggleOpen,
  onToggleItem,
  onToggleAll,
  emptyText,
}: MultiSelectDropdownProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const filteredItems = search.trim()
    ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase()))
    : items;

  const btnLabel =
    isFetching && items.length === 0
      ? '로딩 중...'
      : selectedIds.length === 0
        ? `${label} 선택...`
        : selectedIds.length === items.length && items.length > 0
          ? '전체'
          : selectedIds.map((id) => items.find((i) => i.id === id)?.name ?? id).join(', ');

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={onToggleOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-md text-[11px] font-semibold hover:brightness-95 transition-colors w-[180px]"
        style={{ borderColor: `${color}50`, color }}
      >
        <span className="flex-1 text-left truncate">{btnLabel}</span>
        {selectedIds.length > 0 && (
          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: color }}>
            {selectedIds.length}/{items.length}
          </span>
        )}
        <span className="text-slate-400 text-[9px] flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          className="fixed bg-white border border-cyan-200 rounded-lg shadow-2xl z-[9999] min-w-[220px] max-h-72 overflow-y-auto"
          style={{
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left : 0,
          }}
        >
          {/* 검색 입력 */}
          <div className="px-3 py-2 border-b border-slate-100 sticky top-0 bg-white z-10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색..."
              className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {/* 전체 선택 */}
          <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-cyan-50 cursor-pointer border-b border-slate-100 sticky top-[41px] bg-white z-10">
            <input
              type="checkbox"
              checked={filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id))}
              onChange={() => {
                const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id));
                if (search.trim()) {
                  filteredItems.forEach((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    if (allFilteredSelected ? isSelected : !isSelected) onToggleItem(item.id);
                  });
                } else {
                  onToggleAll();
                }
              }}
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ accentColor: color }}
            />
            <span className="text-[11px] font-bold text-slate-700">전체 선택</span>
            <span className="text-[10px] text-slate-400 ml-auto font-mono">{filteredItems.length}개</span>
          </label>
          {filteredItems.length === 0 ? (
            <div className="px-3 py-3 text-[10px] text-slate-400 text-center">{isFetching ? '로딩 중...' : search ? '검색 결과 없음' : (emptyText ?? '데이터 없음')}</div>
          ) : (
            filteredItems.map((item) => (
              <label key={item.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-cyan-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => onToggleItem(item.id)}
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ accentColor: color }}
                />
                <span className="text-[11px] text-slate-700 flex-1 truncate">{item.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">#{item.id}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
