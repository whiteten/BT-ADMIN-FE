import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import SearchConditionEditor from '../../features/search-condition/components/SearchConditionEditor';
import SearchConditionGrid from '../../features/search-condition/components/SearchConditionGrid';
import { useGetSearchConditions } from '../../features/search-condition/hooks/useSearchConditionQueries';
import { useSearchConditionStore } from '../../features/search-condition/hooks/useSearchConditionStore';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

type FilterColumn = 'title' | 'nodeCode';

const FILTER_OPTIONS = [
  { label: '이름', value: 'title' as FilterColumn },
  { label: '키', value: 'nodeCode' as FilterColumn },
];

export default function SearchConditionCatalog() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { isEditorOpen, openEditor } = useSearchConditionStore();
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('title');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb([{ title: '인사이트' }, { title: '검색조건 정의', path: '/insight/statistics/search-conditions' }]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: conditions = [], isLoading } = useGetSearchConditions();

  const filteredConditions = useMemo(() => {
    if (!searchValue.trim()) return conditions;
    const keyword = searchValue.toLowerCase();
    return conditions.filter((c) => {
      if (filterColumn === 'title') return c.title.toLowerCase().includes(keyword);
      return c.nodes.some((n) => n.nodeCode.toLowerCase().includes(keyword));
    });
  }, [conditions, filterColumn, searchValue]);

  const handleColumnChange = (value: FilterColumn) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  if (isLoading) return <FallbackSpinner />;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={filterColumn} onChange={handleColumnChange} options={FILTER_OPTIONS} className="!min-w-[90px]" popupMatchSelectWidth={false} />
            <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[300px]" placeholder="검색어를 입력하세요." />
          </div>
          <Button type="primary" onClick={() => openEditor()}>
            새 검색조건
          </Button>
        </header>
        <div className="w-full h-full">
          <SearchConditionGrid conditions={filteredConditions} />
        </div>
      </div>

      {isEditorOpen && <SearchConditionEditor />}
    </div>
  );
}
