import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GridOptions, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { toast } from '@/shared-util';
import IntentDrawer, { type IntentDrawerRef } from '../components/IntentDrawer';
import IntentSentenceCustomDetail from '../components/IntentSentenceCustomDetail';
import TrainDiffStatusBadge from '../components/TrainDiffStatusBadge';
import TrainStatusBadge from '../components/TrainStatusBadge';
import { modelQueryKeys, useDeleteIntent, useExportIntent, useGetIntents, useImportIntent } from '../hooks/useModelQueries';
import type { IntentListItem, TrainDiffStatus, TrainStatus } from '../types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function ModelIntentList() {
  const { modelId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const customGridOptions = useMemo<GridOptions>(() => ({ ...gridOptions, rowNumbers: false }), [gridOptions]);
  const [rowData, setRowData] = useState<IntentListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('intentName');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const gridRef = useRef<AgGridReact<IntentListItem>>(null);
  const drawerRef = useRef<IntentDrawerRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);

  const debouncedSetKeyword = useRef(
    debounce((value: string) => {
      setDebouncedKeyword(value);
    }, 500),
  ).current;

  useEffect(() => {
    return () => {
      debouncedSetKeyword.cancel();
    };
  }, [debouncedSetKeyword]);

  const { data: intentList, isFetching } = useGetIntents({
    params: {
      modelId,
      ...(filterColumn === 'sentenceKeyword' && debouncedKeyword.trim() ? { sentenceKeyword: debouncedKeyword } : {}),
    },
  });

  const { mutate: deleteIntent } = useDeleteIntent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntents({ modelId }).queryKey });
      },
    },
  });

  const { mutate: exportIntent, isPending: isExporting } = useExportIntent();

  const { mutate: importIntent, isPending: isImporting } = useImportIntent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntents({ modelId }).queryKey });
        importModalRef.current?.close();
      },
    },
  });

  const handleDeleteIntent = (intentId: string) => {
    modal.confirm.delete({
      onOk: () => deleteIntent({ modelId, intentId }),
    });
  };

  const columnDefs: ColDef<IntentListItem>[] = [
    { headerName: 'IntentId', field: 'intentId', hide: true },
    {
      headerName: '',
      maxWidth: 40,
      cellRenderer: 'agGroupCellRenderer',
      sortable: false,
      filter: false,
    },
    { headerName: '의도이름', field: 'intentName' },
    { headerName: '의도설명', field: 'intentDesc', flex: 3 },
    { headerName: '문장수', field: 'sentenceCount', maxWidth: 120 },
    {
      headerName: '학습상태',
      field: 'trainStatus',
      maxWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: { value: number; data: IntentListItem }) => <TrainStatusBadge status={params.value as TrainStatus} showAlert={params.data?.changedYn} />,
    },
    {
      headerName: '변경이력',
      headerTooltip: '모델 학습이 완료된 이후, 변경사항이 있을 경우 표시됩니다. 다음 모델 학습 완료시, 이력은 초기화됩니다.',
      field: 'trainDiffStatus',
      maxWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: { value: TrainDiffStatus }) => <TrainDiffStatusBadge status={params.value as TrainDiffStatus} />,
    },
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
    if (filterColumn === 'sentenceKeyword') return intentList;
    if (!debouncedKeyword.trim()) return intentList;
    const keyword = debouncedKeyword.toLowerCase();
    return intentList.filter((intent) => {
      const value = intent[filterColumn as keyof typeof intent];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [intentList, filterColumn, debouncedKeyword]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleRowDataUpdated = () => {
    if (filterColumn === 'sentenceKeyword' && debouncedKeyword.trim()) {
      gridRef.current?.api?.forEachNode((node) => {
        if (node.master) {
          node.setExpanded(true);
        }
      });
    }
  };

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
    setDebouncedKeyword('');
    debouncedSetKeyword.cancel();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSetKeyword(value);
  };

  const handleClickAddIntent = () => {
    drawerRef.current?.open({ modelId });
  };

  const handleClickImport = () => {
    importModalRef.current?.open();
  };

  const handleImportIntent = async (files: File[]) => {
    const file = files[0];
    importIntent({ params: { modelId }, data: file });
  };

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<IntentListItem>) => {
    if (!event.data) return;
    if (event?.node?.detail) return;
    const { intentId } = event.data;
    navigate(`./intent/${intentId}`);
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="intentName"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '의도이름', value: 'intentName' },
              { label: '의도문장', value: 'sentenceKeyword' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={handleSearchChange} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" onClick={handleClickImport}>
            Import
          </Button>
          <Button variant="solid" loading={isExporting} onClick={() => exportIntent({ modelId })}>
            Export
          </Button>
          <Button variant="solid" color="primary" onClick={handleClickAddIntent}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<IntentListItem>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={customGridOptions}
          loading={isFetching}
          onRowDoubleClicked={handleRowDoubleClick}
          masterDetail
          isRowMaster={(dataItem) => dataItem.sentenceCount > 0}
          detailCellRenderer={IntentSentenceCustomDetail}
          detailCellRendererParams={{
            sentence: filterColumn === 'sentenceKeyword' ? debouncedKeyword : undefined,
            modelId,
          }}
          detailRowHeight={250}
          getRowId={(params) => params.data?.intentId}
          onRowDataUpdated={handleRowDataUpdated}
        />
      </div>
      <IntentDrawer ref={drawerRef} />
      <FileImportModal ref={importModalRef} title="Import" accept=".xlsx,.xls" onConfirm={handleImportIntent} confirmLoading={isImporting} />
    </div>
  );
}
