import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Input, Select, Tag } from 'antd';
import { Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { datasetKeys, useDeleteDataset, useGetDatasets } from '../../features/dataset/hooks/useDatasetQueries';
import type { DatasetListItem } from '../../features/dataset/types';
import { DOMAIN_LABELS } from '../../features/report/constants/reportIconConstants';
import type { DomainCode } from '../../features/report/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '데이터셋', path: '/insight/statistics/datasets' }];

export default function StatDatasetList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [domain, setDomain] = useState<DomainCode | ''>('');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();

  const { data: datasets = [], isLoading } = useGetDatasets({
    params: { domain: domain || undefined },
  });

  const { mutate: deleteDataset } = useDeleteDataset({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
        toast.success('데이터셋이 삭제되었습니다.');
      },
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    },
  });

  const handleDelete = (data: DatasetListItem) => {
    modal.confirm.delete({
      onOk: () => deleteDataset(data.datasetId),
    });
  };

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return datasets;
    const kw = searchValue.toLowerCase();
    return datasets.filter((d) => String(d.datasetId).includes(kw) || d.datasourceName.toLowerCase().includes(kw) || (d.dbViewPrefix ?? '').toLowerCase().includes(kw));
  }, [datasets, searchValue]);

  const columnDefs: ColDef<DatasetListItem>[] = [
    {
      headerName: '이름',
      field: 'datasourceName',
      flex: 3,
      cellRenderer: ({ data }: ICellRendererParams<DatasetListItem>) =>
        data ? (
          <div className="flex flex-col justify-center h-full gap-0.5">
            <span className="font-semibold text-[var(--color-bt-fg)]">{data.datasourceName}</span>
            <span className="font-mono text-xs text-[var(--color-bt-fg-muted)]">{data.datasetId}</span>
            {data.description && <span className="text-xs text-[var(--color-bt-fg-muted)] truncate">{data.description}</span>}
          </div>
        ) : null,
    },
    {
      headerName: '카테고리',
      field: 'productCode',
      flex: 1,
      cellRenderer: ({ value }: ICellRendererParams<DatasetListItem>) =>
        value ? (
          <div className="flex items-center h-full">
            <span className="inline-flex items-center rounded bg-[var(--color-bt-primary)] px-2 py-0.5 text-xs font-bold text-white">{value}</span>
          </div>
        ) : null,
    },
    {
      headerName: '기반 뷰',
      field: 'dbViewPrefix',
      flex: 2,
      cellRenderer: ({ value }: ICellRendererParams<DatasetListItem>) => (
        <div className="flex items-center gap-2 h-full">
          <span className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">뷰</span>
          <span className="font-mono text-sm">{value || '-'}</span>
        </div>
      ),
    },
    {
      headerName: '가용 단위',
      field: 'availableUnits',
      flex: 2,
      cellRenderer: ({ value }: ICellRendererParams<DatasetListItem>) => {
        const units: string[] = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-1 items-center h-full">
            {units.map((u) => (
              <Tag key={u} className="!mb-0">
                {u}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      headerName: '상태',
      flex: 1,
      cellRenderer: ({ data }: ICellRendererParams<DatasetListItem>) => {
        if (!data) return null;
        return (
          <div className="flex items-center h-full">
            {data.isSystem ? <Tag color="blue">시스템</Tag> : data.isActive ? <Tag color="green">활성</Tag> : <Tag color="default">비활성</Tag>}
          </div>
        );
      },
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: ({ data }: ICellRendererParams<DatasetListItem>) => {
        if (!data || data.isSystem) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data);
            }}
            title="삭제"
            className="text-red-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-4 w-full bg-white bt-shadow px-7 py-5">
        <div className="flex items-center gap-3">
          <Select
            value={domain}
            onChange={(v) => setDomain(v as DomainCode | '')}
            options={[
              { value: '', label: '전체 도메인' },
              { value: 'IE', label: `IE · ${DOMAIN_LABELS.IE}` },
              { value: 'IC', label: `IC · ${DOMAIN_LABELS.IC}` },
              { value: 'IR', label: `IR · ${DOMAIN_LABELS.IR}` },
            ]}
            className="!min-w-[140px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="데이터셋 이름 검색…" className="w-full max-w-[300px]" allowClear />
        </div>
        <Button type="primary" onClick={() => navigate('/insight/statistics/datasets/new')}>
          + 새 데이터셋
        </Button>
      </div>

      <div className="flex-1 bg-white bt-shadow p-5">
        <AgGridReact<DatasetListItem>
          rowData={filtered}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, rowNumbers: false }}
          loading={isLoading}
          rowHeight={60}
          onRowDoubleClicked={(e) => {
            if (e.data) navigate(`/insight/statistics/datasets/${e.data.datasetId}/edit`);
          }}
        />
      </div>
    </div>
  );
}
