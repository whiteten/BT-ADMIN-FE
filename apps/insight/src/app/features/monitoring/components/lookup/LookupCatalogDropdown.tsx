import { Select } from 'antd';
import { useGetLookupCatalog } from '../../hooks/useLookupQueries';
import { MOCK_LOOKUP_CATALOG } from '../../mocks/mockLookups';
import type { LookupCatalogItem } from '../../types';

interface LookupCatalogDropdownProps {
  value?: number;
  onChange: (item: LookupCatalogItem) => void;
}

/**
 * 마스터 테이블(룩업 카탈로그) 선택 — 프로젝트 표준 antd Select(showSearch) 사용.
 * 선택 시 전체 카탈로그 항목을 onChange로 전달해 키 컬럼·권장 값 컬럼 자동 채움을 가능케 한다.
 */
export default function LookupCatalogDropdown({ value, onChange }: LookupCatalogDropdownProps) {
  const { data: fetched = [] } = useGetLookupCatalog();
  const catalog = fetched.length > 0 ? fetched : MOCK_LOOKUP_CATALOG;

  return (
    <Select
      showSearch
      value={value && value > 0 ? value : undefined}
      placeholder="마스터 테이블 선택…"
      style={{ width: '100%' }}
      onChange={(v) => {
        const item = catalog.find((c) => c.lookupCatalogId === v);
        if (item) onChange(item);
      }}
      filterOption={(input, option) => {
        const c = catalog.find((x) => x.lookupCatalogId === option?.value);
        const q = input.toLowerCase();
        return !!c && (c.displayName.toLowerCase().includes(q) || c.tableName.toLowerCase().includes(q));
      }}
      options={catalog.map((c) => ({
        value: c.lookupCatalogId,
        label: (
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{c.displayName}</span>
            <span className="font-mono text-xs text-[var(--color-bt-fg-muted)]">{c.tableName}</span>
          </span>
        ),
      }))}
    />
  );
}
