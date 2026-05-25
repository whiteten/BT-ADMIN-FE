import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Input, Select, Tag } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import LookupCatalogFormDrawer from '../../features/monitoring/components/lookup/LookupCatalogFormDrawer';
import { monitoringLookupCatalogKeys, useDeleteMonitoringLookupCatalog, useGetMonitoringLookupCatalogs } from '../../features/monitoring/hooks/useLookupCatalogQueries';
import type { LookupCatalogItem } from '../../features/monitoring/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '인사이트' }, { title: '모니터링' }, { title: '코드 룩업', path: '/insight/monitoring/lookups' }];

const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: '일반', label: '일반' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IR', label: 'IR (IVR)' },
];

export default function LookupCatalogList() {
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const [filterColumn, setFilterColumn] = useState('displayName');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');

  const queryParams = useMemo(
    () => ({
      category: categoryFilter || undefined,
    }),
    [categoryFilter],
  );

  const { data: catalogs, isLoading } = useGetMonitoringLookupCatalogs({ params: queryParams });
  const { mutate: deleteCatalog } = useDeleteMonitoringLookupCatalog({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: monitoringLookupCatalogKeys.list().queryKey });
        toast.success('코드 룩업이 삭제되었습니다.');
      },
      onError: () => toast.error('삭제 실패'),
    },
  });

  // 등록/편집 Drawer 상태
  const [editingItem, setEditingItem] = useState<LookupCatalogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCreate = () => {
    setEditingItem(null);
    setDrawerOpen(true);
  };
  const handleEdit = (item: LookupCatalogItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };

  const handleDelete = (item: LookupCatalogItem) => {
    if (item.usageCount > 0) {
      toast.warning('사용 중인 데이터셋이 있어 삭제할 수 없습니다.');
      return;
    }
    modal.confirm.delete({
      onOk: () => deleteCatalog(item.lookupCatalogId),
    });
  };

  const columnDefs: ColDef<LookupCatalogItem>[] = [
    { headerName: 'ID', field: 'lookupCatalogId', maxWidth: 80 },
    { headerName: '표시명', field: 'displayName', flex: 1, minWidth: 180 },
    { headerName: '테이블명', field: 'tableName', flex: 1, minWidth: 220, cellClass: 'font-mono' },
    {
      headerName: '카테고리',
      field: 'category',
      maxWidth: 120,
      cellRenderer: (params: ICellRendererParams<LookupCatalogItem>) => {
        const v = params.value as string | undefined;
        if (!v) return '-';
        return <Tag className="!m-0 !text-[10.5px]">{v}</Tag>;
      },
    },
    {
      headerName: '권장 키 / 값',
      field: 'recommendedKey',
      flex: 1,
      minWidth: 240,
      cellRenderer: (params: ICellRendererParams<LookupCatalogItem>) => {
        const d = params.data;
        if (!d) return null;
        return (
          <div className="flex flex-wrap items-center gap-1 leading-tight">
            <span className="font-mono text-[11px] font-semibold text-[var(--color-bt-primary)]">{d.recommendedKey}</span>
            <span className="text-[var(--color-bt-fg-muted)]">→</span>
            {d.recommendedValues.slice(0, 4).map((v) => (
              <Tag key={v} className="!m-0 !text-[10.5px] font-mono">
                {v}
              </Tag>
            ))}
            {d.recommendedValues.length > 4 && <span className="text-[10.5px] text-[var(--color-bt-fg-muted)]">+{d.recommendedValues.length - 4}</span>}
          </div>
        );
      },
    },
    {
      headerName: '사용 데이터셋',
      field: 'usageCount',
      maxWidth: 120,
      cellRenderer: (params: ICellRendererParams<LookupCatalogItem>) => {
        const v = (params.value as number) ?? 0;
        if (v === 0) return <span className="text-[var(--color-bt-fg-muted)]">-</span>;
        return <span className="font-mono text-[11px] font-semibold text-[var(--color-bt-primary)]">{v}</span>;
      },
    },
    { headerName: '등록자', field: 'registeredBy', maxWidth: 110 },
    {
      headerName: '',
      maxWidth: 80,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<LookupCatalogItem>) => {
        const { data } = params;
        if (!data) return null;
        const blockDelete = data.usageCount > 0;
        return (
          <button
            type="button"
            disabled={blockDelete}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data);
            }}
            title={blockDelete ? '사용 중인 데이터셋이 있어 삭제 불가' : '삭제'}
            className="disabled:cursor-not-allowed disabled:opacity-30"
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  // 클라이언트 측 검색 — 표시명/테이블명 둘 중 선택
  const filteredList = useMemo(() => {
    if (!catalogs) return [];
    if (!searchValue.trim()) return catalogs;
    const keyword = searchValue.toLowerCase();
    return catalogs.filter((c) => {
      const value = c[filterColumn as keyof LookupCatalogItem];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [catalogs, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: monitoringLookupCatalogKeys.list().queryKey });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex items-center w-full gap-3">
            <Select
              value={filterColumn}
              onChange={handleColumnChange}
              options={[
                { label: '표시명', value: 'displayName' },
                { label: '테이블명', value: 'tableName' },
              ]}
              className="!max-w-[150px] !min-w-[120px]"
              popupMatchSelectWidth={false}
            />
            <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
            <Select value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_FILTER_OPTIONS} className="!max-w-[180px] !min-w-[160px]" popupMatchSelectWidth={false} />
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="primary" onClick={handleCreate}>
              등록
            </Button>
          </div>
        </header>
        <div className="w-full h-full">
          <AgGridReact<LookupCatalogItem>
            rowData={filteredList}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            loading={isLoading}
            onRowDoubleClicked={(e) => e.data && handleEdit(e.data)}
          />
        </div>
      </div>

      {/* 등록/편집 Drawer */}
      <LookupCatalogFormDrawer open={drawerOpen} initial={editingItem} onClose={() => setDrawerOpen(false)} onSaved={handleSaved} />
    </div>
  );
}
