import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, Select, Tag } from 'antd';
import WidgetCatalogFormDrawer from './WidgetCatalogFormDrawer';
import { dashboardKeys, useGetCustomWidgetCatalog } from '../../hooks/useDashboardQueries';
import type { CustomWidgetCatalogItem } from '../../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const DOMAIN_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'IR', label: 'IR (IVR)' },
];

const DOMAIN_COLOR: Record<string, string> = { IC: 'blue', IE: 'green', IR: 'gold' };

/**
 * 커스텀 위젯 탭 — 시스템 자원이라 등록/삭제 없이 "수정"만 가능.
 * (BE 구현체와 1:1 매칭되는 카탈로그라 추가/삭제는 코드 배포로만)
 */
export default function CustomWidgetCatalogTab() {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const [filterColumn, setFilterColumn] = useState<'widgetName' | 'widgetTypeId'>('widgetName');
  const [domainFilter, setDomainFilter] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const { data: catalogs, isLoading } = useGetCustomWidgetCatalog();

  const [editingItem, setEditingItem] = useState<CustomWidgetCatalogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleEdit = (item: CustomWidgetCatalogItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };

  const columnDefs: ColDef<CustomWidgetCatalogItem>[] = [
    { headerName: '위젯명', field: 'widgetName', flex: 1, minWidth: 180 },
    { headerName: '위젯 식별자', field: 'widgetTypeId', flex: 1, minWidth: 200, cellClass: 'font-mono' },
    {
      headerName: '도메인',
      field: 'domainCode',
      maxWidth: 110,
      cellRenderer: (params: ICellRendererParams<CustomWidgetCatalogItem>) => {
        const v = params.value as string | undefined;
        if (!v) return '-';
        return (
          <Tag color={DOMAIN_COLOR[v]} className="!m-0 !text-[10.5px]">
            {v}
          </Tag>
        );
      },
    },
    {
      headerName: '카테고리',
      field: 'widgetCategory',
      maxWidth: 120,
      cellRenderer: (params: ICellRendererParams<CustomWidgetCatalogItem>) => {
        const v = params.value as string | undefined;
        if (!v) return '-';
        return <Tag className="!m-0 !text-[10.5px]">{v}</Tag>;
      },
    },
    {
      headerName: '설명',
      field: 'description',
      flex: 2,
      minWidth: 260,
      cellRenderer: (params: ICellRendererParams<CustomWidgetCatalogItem>) => {
        const v = params.value as string | undefined;
        return <span className="text-[12px] text-[var(--color-bt-fg-muted)]">{v ?? '-'}</span>;
      },
    },
    {
      headerName: '최소 크기',
      maxWidth: 110,
      sortable: false,
      cellRenderer: (params: ICellRendererParams<CustomWidgetCatalogItem>) => {
        const d = params.data;
        if (!d) return null;
        return (
          <span className="font-mono text-[11px] text-[var(--color-bt-fg-muted)]">
            {d.minW} × {d.minH}
          </span>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!catalogs) return [];
    return catalogs.filter((c) => {
      if (domainFilter && c.domainCode !== domainFilter) return false;
      if (searchValue.trim()) {
        const value = c[filterColumn];
        if (value == null) return false;
        if (!String(value).toLowerCase().includes(searchValue.toLowerCase())) return false;
      }
      return true;
    });
  }, [catalogs, domainFilter, filterColumn, searchValue]);

  const handleColumnChange = (value: 'widgetName' | 'widgetTypeId') => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.customWidgetCatalog._def });
  };

  return (
    <div className="flex flex-col gap-5 w-full flex-1 min-h-0">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '위젯명', value: 'widgetName' },
              { label: '위젯 식별자', value: 'widgetTypeId' },
            ]}
            className="!max-w-[150px] !min-w-[130px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
          <Select value={domainFilter} onChange={setDomainFilter} options={DOMAIN_FILTER_OPTIONS} className="!max-w-[180px] !min-w-[160px]" popupMatchSelectWidth={false} />
        </div>
      </header>
      <div className="w-full flex-1 min-h-0">
        <AgGridReact<CustomWidgetCatalogItem>
          rowData={filteredList}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          onRowDoubleClicked={(e) => e.data && handleEdit(e.data)}
        />
      </div>

      <WidgetCatalogFormDrawer open={drawerOpen} initial={editingItem} onClose={() => setDrawerOpen(false)} onSaved={handleSaved} />
    </div>
  );
}
