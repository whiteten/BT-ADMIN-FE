import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { confirmModal, toast } from '@/shared-util';
import IntentDrawer, { type IntentDrawerRef } from '../components/IntentDrawer';
import { modelQueryKeys, useDeleteIntent, useGetIntents } from '../hooks/useModelQueries';
import type { IntentListItem, TrainStatus } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const TRAIN_STATUS_META: Record<TrainStatus, { label: string; className: string }> = {
  0: { label: '미학습', className: 'text-[#495057] bg-[#E9EBEC]' },
  1: { label: '학습중', className: 'text-[#1F79D4] bg-[#1F79D41A]' },
  2: { label: '학습완료', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
};

export default function ModelIntentList() {
  const { modelId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<IntentListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('intentName');
  const [searchValue, setSearchValue] = useState('');
  const drawerRef = useRef<IntentDrawerRef>(null);

  const { data: intentList, isFetching } = useGetIntents({ params: { modelId } });

  const { mutateAsync: deleteIntent } = useDeleteIntent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('의도가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntents({ modelId }).queryKey });
      },
    },
  });

  const handleDeleteIntent = (intentId: string) => {
    confirmModal.delete({
      onOk: () => deleteIntent({ modelId, intentId }),
    });
  };

  const columnDefs: ColDef<IntentListItem>[] = [
    { headerName: 'ID', field: 'intentId', hide: true },
    { headerName: '의도이름', field: 'intentName' },
    { headerName: '의도설명', field: 'intentDesc', flex: 3 },
    {
      headerName: '학습상태',
      field: 'trainStatus',
      maxWidth: 120,
      cellRenderer: (params: { value: number }) => {
        const meta = TRAIN_STATUS_META[params.value as TrainStatus];
        if (!meta) return '-';
        return (
          <Badge variant="secondary" className={cn('text-[13px] font-medium !h-6', meta.className)}>
            {meta.label}
          </Badge>
        );
      },
    },
    { headerName: '문장수', field: 'sentenceCount', maxWidth: 120 },
    {
      headerName: '작업일시',
      field: 'workTime',
      maxWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<IntentListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteIntent(data.intentId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!intentList) return [];
    if (!searchValue.trim()) return intentList;
    const keyword = searchValue.toLowerCase();
    return intentList.filter((intent) => {
      const value = intent[filterColumn as keyof typeof intent];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [intentList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickAddIntent = () => {
    drawerRef.current?.open({ modelId });
  };

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<IntentListItem>) => {
    if (!event.data) return;
    const { intentId } = event.data;
    navigate(`/bot/bot-config/model/${modelId}/intent/${intentId}`);
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="intentName"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '의도이름', value: 'intentName' }]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid">Import</Button>
          <Button variant="solid">Export</Button>
          <Button variant="solid" color="primary" onClick={handleClickAddIntent}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<IntentListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isFetching} onRowDoubleClicked={handleRowDoubleClick} />
      </div>
      <IntentDrawer ref={drawerRef} />
    </div>
  );
}
