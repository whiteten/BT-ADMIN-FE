import { useEffect, useMemo, useState } from 'react';
import { type BreadcrumbProps, Button, Input, Segmented } from 'antd';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import SearchConditionEditor from '../../features/search-condition/components/SearchConditionEditor';
import SearchConditionGrid from '../../features/search-condition/components/SearchConditionGrid';
import { useGetSearchConditions } from '../../features/search-condition/hooks/useSearchConditionQueries';
import { useSearchConditionStore } from '../../features/search-condition/hooks/useSearchConditionStore';
import { CATEGORY_OPTIONS } from '../../features/search-condition/types';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '검색조건 정의', path: '/insight/statistics/search-conditions' }];

export default function SearchConditionCatalog() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { openEditor } = useSearchConditionStore();

  const [filterCategory, setFilterCategory] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: conditions = [] } = useGetSearchConditions();

  const filteredConditions = useMemo(() => {
    let rows = conditions;
    if (filterCategory) rows = rows.filter((r) => r.categoryCode === filterCategory);
    if (searchText.trim()) {
      const kw = searchText.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(kw) || r.nodes.some((n) => n.nodeCode.toLowerCase().includes(kw)));
    }
    return rows;
  }, [conditions, filterCategory, searchText]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex items-center w-full gap-3">
            <Segmented value={filterCategory} onChange={(v) => setFilterCategory(v as string)} options={[{ value: '', label: '전체' }, ...CATEGORY_OPTIONS]} />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="묶음명 · 조건 코드 검색…"
              prefix={<Search className="size-4 text-gray-400" />}
              className="w-full max-w-[300px]"
              allowClear
            />
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="primary" onClick={() => openEditor()}>
              + 새 검색조건
            </Button>
          </div>
        </header>
        <div className="w-full h-full">
          <SearchConditionGrid conditions={filteredConditions} />
        </div>
      </div>
      <SearchConditionEditor />
    </div>
  );
}
