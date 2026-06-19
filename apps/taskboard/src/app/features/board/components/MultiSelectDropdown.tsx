import { useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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

  const allSelected = selectedIds.length === items.length && items.length > 0;
  const accentStyle = { '--ms-accent': color } as React.CSSProperties;
  const checkboxClassName = 'border-slate-300 data-[state=checked]:bg-(--ms-accent) data-[state=checked]:border-(--ms-accent)';

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef} style={accentStyle}>
      <button
        onClick={onToggleOpen}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 bg-white border rounded-full text-[11px] font-semibold transition-shadow hover:shadow-sm w-[180px]"
        style={{ borderColor: isOpen ? color : `${color}40` }}
      >
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 tabular-nums"
          style={{ backgroundColor: selectedIds.length > 0 ? `${color}1A` : '#f1f5f9', color: selectedIds.length > 0 ? color : '#94a3b8' }}
        >
          {selectedIds.length}
        </span>
        <span className="flex-1 min-w-0 text-left truncate" style={{ color: selectedIds.length > 0 ? '#334155' : '#94a3b8' }}>
          {isFetching && items.length === 0 ? '로딩 중...' : selectedIds.length === 0 ? `${label} 선택...` : allSelected ? '전체 선택됨' : `${selectedIds.length}개 선택됨`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="fixed bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] min-w-[230px] max-h-80 overflow-hidden flex flex-col"
          style={{
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 6 : 0,
            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left : 0,
          }}
        >
          {/* 검색 입력 */}
          <div className="px-2.5 py-2 border-b border-slate-100 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="검색..."
                className="w-full text-[11px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none transition-colors"
                style={{ borderColor: search ? color : undefined }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {/* 전체 선택 */}
            <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 sticky top-0 bg-white z-10">
              <Checkbox
                checked={filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id))}
                onCheckedChange={() => {
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
                className={checkboxClassName}
              />
              <span className="text-[11px] font-bold text-slate-700">전체 선택</span>
              <span className="text-[10px] text-slate-400 ml-auto font-mono">{filteredItems.length}개</span>
            </label>
            {filteredItems.length === 0 ? (
              <div className="px-3 py-6 text-[10px] text-slate-400 text-center">{isFetching ? '로딩 중...' : search ? '검색 결과 없음' : (emptyText ?? '데이터 없음')}</div>
            ) : (
              filteredItems.map((item) => (
                <label key={item.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => onToggleItem(item.id)} className={checkboxClassName} />
                  <span className="text-[11px] text-slate-700 flex-1 min-w-0 truncate">{item.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">#{item.id}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
