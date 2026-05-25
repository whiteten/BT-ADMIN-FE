import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { DOMAIN_COLOR_CLASS, DOMAIN_LABELS } from '../../features/monitoring/constants/monitoringConstants';
import { monitoringDatasetKeys, useDeleteMonitoringDataset, useGetMonitoringDatasets } from '../../features/monitoring/hooks/useDatasetQueries';
import type { DatasetListItem, DomainCode } from '../../features/monitoring/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '인사이트' }, { title: '모니터링' }, { title: '데이터셋', path: '/insight/monitoring/datasets' }];

export default function DatasetCatalog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const [filterColumn, setFilterColumn] = useState('datasetName');
  const [searchValue, setSearchValue] = useState('');

  const { data: datasets, isLoading } = useGetMonitoringDatasets();
  const { mutate: deleteDataset } = useDeleteMonitoringDataset({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: monitoringDatasetKeys.list().queryKey });
        toast.success('데이터셋이 삭제되었습니다.');
      },
    },
  });

  const columnDefs: ColDef<DatasetListItem>[] = [
    { headerName: 'ID', field: 'datasetId', maxWidth: 80 },
    { headerName: '이름', field: 'datasetName', flex: 1 },
    { headerName: '코드', field: 'datasetCode', flex: 1 },
    {
      headerName: '도메인',
      field: 'domainCode',
      maxWidth: 140,
      cellRenderer: (params: ICellRendererParams<DatasetListItem>) => {
        const code = params.value as DomainCode | undefined;
        if (!code) return '-';
        return <span className={`rounded px-2 py-0.5 text-xs font-bold ${DOMAIN_COLOR_CLASS[code]}`}>{`${code} · ${DOMAIN_LABELS[code]}`}</span>;
      },
    },
    { headerName: '필드 수', field: 'fieldCount', maxWidth: 100 },
    {
      headerName: '코드 룩업',
      field: 'lookupCount',
      maxWidth: 140,
      valueFormatter: (params) => {
        const lookupCount = (params.value as number) ?? 0;
        const virtual = params.data?.virtualFieldCount ?? 0;
        if (lookupCount === 0) return '-';
        return `룩업 ${lookupCount} · 가상 +${virtual}`;
      },
    },
    { headerName: '사용 위젯', field: 'usageWidgetCount', maxWidth: 110 },
    {
      headerName: '수정일',
      field: 'updatedAt',
      maxWidth: 170,
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      headerName: '',
      maxWidth: 80,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<DatasetListItem>) => {
        const { data } = params;
        if (!data) return null;
        const blockDelete = data.usageWidgetCount > 0;
        return (
          <button
            type="button"
            disabled={blockDelete}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data);
            }}
            title={blockDelete ? '사용 위젯이 있어 삭제 불가' : '삭제'}
            className="disabled:cursor-not-allowed disabled:opacity-30"
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!datasets) return [];
    if (!searchValue.trim()) return datasets;

    const keyword = searchValue.toLowerCase();
    return datasets.filter((d) => {
      const value = d[filterColumn as keyof DatasetListItem];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [datasets, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleCreate = () => {
    navigate('create');
  };

  const handleEdit = (datasetId?: number) => {
    if (datasetId) navigate(`${datasetId}/edit`);
  };

  const handleDelete = (data: DatasetListItem) => {
    if (data.usageWidgetCount > 0) {
      toast.warning('사용 중인 위젯이 있어 삭제할 수 없습니다.');
      return;
    }
    modal.confirm.delete({
      onOk: () => deleteDataset(data.datasetId),
    });
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
                { label: '이름', value: 'datasetName' },
                { label: '코드', value: 'datasetCode' },
              ]}
              className="!max-w-[150px] !min-w-[120px]"
              popupMatchSelectWidth={false}
            />
            <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="primary" onClick={handleCreate}>
              추가
            </Button>
          </div>
        </header>
        <div className="w-full h-full">
          <AgGridReact<DatasetListItem>
            rowData={filteredList}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            loading={isLoading}
            onRowDoubleClicked={(e) => handleEdit(e.data?.datasetId)}
          />
        </div>
      </div>
    </div>
  );
}
