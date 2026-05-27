import { useMemo, useState } from 'react';
import { Input, Popover } from 'antd';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useGetLookupCatalog } from '../../hooks/useLookupQueries';
import { MOCK_LOOKUP_CATALOG } from '../../mocks/mockLookups';
import type { LookupCatalogItem } from '../../types';

interface LookupCatalogDropdownProps {
  value?: number;
  onChange: (item: LookupCatalogItem) => void;
  /** ADMIN 즉석 등록 모달 열기 */
  onOpenAdminRegister: () => void;
}

export default function LookupCatalogDropdown({ value, onChange, onOpenAdminRegister }: LookupCatalogDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: fetched = [] } = useGetLookupCatalog();
  const catalog = fetched.length > 0 ? fetched : MOCK_LOOKUP_CATALOG;

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const kw = search.toLowerCase();
    return catalog.filter((c) => c.displayName.toLowerCase().includes(kw) || c.tableName.toLowerCase().includes(kw));
  }, [catalog, search]);

  const selected = catalog.find((c) => c.lookupCatalogId === value);

  const content = (
    <div className="w-[440px]">
      <div className="px-3 py-2 border-b border-[var(--color-bt-border)]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-bt-fg-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="표시명·테이블명으로 검색"
            className="w-full rounded border border-[var(--color-bt-border)] bg-white pl-7 pr-2 py-1.5 text-[11px] focus:border-[var(--color-bt-primary)] focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center py-6 text-[12px] text-[var(--color-bt-fg-muted)]">검색 결과 없음</p>
        ) : (
          filtered.map((c) => {
            const active = value === c.lookupCatalogId;
            return (
              <button
                key={c.lookupCatalogId}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 border-b border-[var(--color-bt-border)] last:border-b-0 ${
                  active ? 'bg-[var(--color-bt-primary-soft)]/40 border-l-2 border-l-[var(--color-bt-primary)]' : 'hover:bg-[var(--color-bt-bg-muted)]/40'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-semibold text-[var(--color-bt-fg)]">{c.displayName}</span>
                  <span className="mono text-[9.5px] text-[var(--color-bt-fg-muted)]">{c.tableName}</span>
                  {active && (
                    <span className="ml-auto inline-flex items-center gap-0.5 rounded bg-[var(--color-bt-primary)] px-1 mono text-[9px] font-bold text-white">
                      <Check className="w-2.5 h-2.5" /> 선택됨
                    </span>
                  )}
                  {c.usageCount > 0 && !active && <span className="ml-auto text-[9px] text-[var(--color-bt-fg-muted)]">사용 {c.usageCount}건</span>}
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--color-bt-fg-muted)] leading-snug">
                  {c.description} · 권장 키: <span className="mono text-[var(--color-bt-fg)]">{c.recommendedKey}</span> · 값:{' '}
                  <span className="mono text-[var(--color-bt-fg)]">{c.recommendedValues.join(', ')}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ADMIN 즉석 등록 진입점 */}
      <div className="border-t border-[var(--color-bt-border)] bg-[var(--color-bt-warn-soft)]/30 px-3 py-2 flex items-center gap-2">
        <span className="rounded bg-[var(--color-bt-warn)] px-1 py-0.5 text-[9px] font-bold text-white">ADMIN</span>
        <span className="text-[10.5px] text-[var(--color-bt-fg)]">찾는 마스터가 없나요?</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onOpenAdminRegister();
          }}
          className="ml-auto rounded bg-[var(--color-bt-warn)] px-2 py-1 text-[10.5px] font-semibold text-white hover:opacity-90"
        >
          + 새 마스터 등록
        </button>
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} content={content} trigger="click" placement="bottomLeft" overlayClassName="!p-0" overlayInnerStyle={{ padding: 0 }}>
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded border border-[var(--color-bt-border)] bg-white px-2 py-1.5 text-left hover:border-[var(--color-bt-primary)]"
      >
        {selected ? (
          <>
            <span className="text-[11.5px] font-semibold truncate">{selected.displayName}</span>
            <span className="mono text-[9.5px] text-[var(--color-bt-fg-muted)] truncate">{selected.tableName}</span>
          </>
        ) : (
          <span className="text-[11.5px] text-[var(--color-bt-fg-muted)]">마스터 테이블 선택…</span>
        )}
        <ChevronDown className="ml-auto w-3 h-3 text-[var(--color-bt-fg-muted)]" />
      </button>
    </Popover>
  );
}
