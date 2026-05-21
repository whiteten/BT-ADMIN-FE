import { useEffect, useMemo, useState } from 'react';
import { type BreadcrumbProps, Button, Input, Select, Tag } from 'antd';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import SearchConditionEditor from '../../features/search-condition/components/SearchConditionEditor';
import { useGetSearchConditions } from '../../features/search-condition/hooks/useSearchConditionQueries';
import { useSearchConditionStore } from '../../features/search-condition/hooks/useSearchConditionStore';
import type { CatalogRow, InputType } from '../../features/search-condition/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const INPUT_TYPE_COLOR_MAP: Record<InputType, string> = {
  SELECT: 'blue',
  MULTI_SELECT: 'blue',
  TREE_MULTI_SELECT: 'orange',
  RADIO: 'geekblue',
};

const CATEGORY_LABEL: Record<string, string> = {
  IE: '교환기',
  IC: 'CTI',
  IR: 'IVR',
  COMMON: '공통',
};

const breadcrumb: BreadcrumbProps['items'] = [{ title: '인사이트' }, { title: '검색조건 정의', path: '/insight/statistics/search-conditions' }];

export default function SearchConditionCatalog() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { openEditor, openEditorById } = useSearchConditionStore();

  const [filterGroup, setFilterGroup] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: conditions = [], isLoading } = useGetSearchConditions();

  // 번들 → 노드 단위 플랫 행
  const allRows = useMemo<CatalogRow[]>(
    () =>
      conditions.flatMap((cond) =>
        cond.nodes.map((node) => ({
          searchCondId: cond.searchCondId,
          title: cond.title,
          categoryCode: cond.categoryCode,
          usedReportCount: cond.usedReportCount,
          nodeCode: node.nodeCode,
          inputType: node.inputType,
          parentNodeCode: node.parentNodeCode,
          optionSqlPreview: node.optionSqlPreview,
        })),
      ),
    [conditions],
  );

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (filterGroup) rows = rows.filter((r) => r.categoryCode === filterGroup);
    if (searchText.trim()) {
      const kw = searchText.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(kw) || r.nodeCode.toLowerCase().includes(kw));
    }
    return rows;
  }, [allRows, filterGroup, searchText]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        {/* 필터 헤더 */}
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex items-center gap-3">
            <Select
              value={filterGroup || ''}
              onChange={(v) => setFilterGroup(v)}
              options={[
                { value: '', label: '전체 그룹' },
                { value: 'IE', label: '교환기' },
                { value: 'IC', label: 'CTI' },
                { value: 'IR', label: 'IVR' },
                { value: 'COMMON', label: '공통' },
              ]}
              className="!min-w-[120px]"
              popupMatchSelectWidth={false}
            />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="이름 · 키 검색…"
              prefix={<Search className="size-4 text-gray-400" />}
              className="w-full max-w-[300px]"
              allowClear
            />
          </div>
          <Button type="primary" onClick={() => openEditor()}>
            + 새 검색조건
          </Button>
        </header>

        {/* 카탈로그 테이블 */}
        <div className="w-full h-full flex flex-col overflow-hidden border border-gray-200 rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <FallbackSpinner />
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-semibold">KEY</th>
                    <th className="px-4 py-3 font-semibold">표시명</th>
                    <th className="px-4 py-3 font-semibold">GROUP</th>
                    <th className="px-4 py-3 font-semibold">INPUT_TYPE</th>
                    <th className="px-4 py-3 font-semibold">SQL 미리보기</th>
                    <th className="px-4 py-3 font-semibold">부모</th>
                    <th className="px-4 py-3 font-semibold text-right">사용 패널</th>
                    <th className="w-10 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                        검색조건이 없습니다. 새 검색조건을 추가하세요.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr
                        key={`${row.searchCondId}-${row.nodeCode}-${idx}`}
                        onDoubleClick={() => openEditorById(row.searchCondId)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">{row.nodeCode}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700">{row.title}</td>
                        <td className="px-4 py-2.5">
                          {row.categoryCode ? <Tag>{CATEGORY_LABEL[row.categoryCode] ?? row.categoryCode}</Tag> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <Tag color={INPUT_TYPE_COLOR_MAP[row.inputType]} className="font-mono">
                            {row.inputType}
                          </Tag>
                        </td>
                        <td className="px-4 py-2.5 max-w-[280px]">
                          <span className="font-mono text-xs text-gray-400 truncate block">{row.optionSqlPreview || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {row.parentNodeCode ? (
                            <Tag color="orange" className="font-mono">
                              {row.parentNodeCode}
                            </Tag>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-600">{row.usedReportCount}</td>
                        <td className="px-2 py-2.5 text-center text-gray-300 text-base">⋯</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 테이블 하단 정보 */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-400 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Tag color="orange" className="font-mono font-bold m-0">
                RAW_SQL
              </Tag>
              <span>모든 검색조건은 SQL로 작성 · 백엔드 방어 로직(SELECT-only AST · 키워드 블랙리스트 · 파라미터 바인딩)으로 안전 보장</span>
            </div>
            <span className="whitespace-nowrap">총 {filteredRows.length}건</span>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <SearchConditionEditor />
    </div>
  );
}
