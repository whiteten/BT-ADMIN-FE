import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Input, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, CloudDownload, Download } from 'lucide-react';
import { toast } from '@/shared-util';
import ExcelImportResultModal, { type ExcelImportResultModalRef } from '../components/ExcelImportResultModal';
import KeywordDrawer, { type KeywordDrawerRef } from '../components/KeywordDrawer';
import TrainDiffStatusBadge from '../components/TrainDiffStatusBadge';
import TrainStatusBadge from '../components/TrainStatusBadge';
import { modelQueryKeys, useDeleteKeyword, useExportKeyword, useGetKeywords, useImportKeyword } from '../hooks/useModelQueries';
import type { ExcelImportResult, KeywordListItem, TrainDiffStatus, TrainStatus } from '../types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function ModelKeywordList() {
  const { modelId = '' } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<KeywordListItem[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const drawerRef = useRef<KeywordDrawerRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<ExcelImportResultModalRef>(null);

  const { data: keywordList, isFetching } = useGetKeywords({ params: { modelId } });

  const { mutate: deleteKeyword } = useDeleteKeyword({
    mutationOptions: {
      onSuccess: () => {
        toast.success('완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getKeywords({ modelId }).queryKey });
      },
    },
  });

  const { mutate: exportKeyword, isPending: isExporting } = useExportKeyword();

  const { mutate: importKeyword, isPending: isImporting } = useImportKeyword({
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getKeywords({ modelId }).queryKey });
        importModalRef.current?.close();
        importResultModalRef.current?.open(data as ExcelImportResult);
      },
    },
  });

  const handleDeleteKeyword = (keywordId: string) => {
    modal.confirm.delete({
      onOk: () => deleteKeyword({ modelId, keywordId }),
    });
  };

  const columnDefs: ColDef<KeywordListItem>[] = [
    { headerName: 'ID', field: 'keywordId', hide: true },
    {
      headerName: '키워드명',
      field: 'keyword',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '학습상태',
      field: 'trainStatus',
      maxWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<KeywordListItem>) => <TrainStatusBadge status={params.value as TrainStatus} showAlert={params.data?.changedYn} />,
    },
    {
      headerName: '변경이력',
      headerTooltip: '모델 학습이 완료된 이후, 변경사항이 있을 경우 표시됩니다. 다음 모델 학습 완료시, 이력은 초기화됩니다.',
      field: 'trainDiffStatus',
      maxWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<KeywordListItem>) => <TrainDiffStatusBadge status={params.value as TrainDiffStatus} />,
    },
    {
      headerName: '작업일시',
      field: 'workTime',
      maxWidth: 180,
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<KeywordListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteKeyword(data.keywordId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!keywordList) return [];
    if (!searchValue.trim()) return keywordList;
    return keywordList.filter((kw) => kw.keyword.toLowerCase().includes(searchValue.toLowerCase()));
  }, [keywordList, searchValue]);

  useEffect(() => {
    setRowData(filteredList);
  }, [filteredList]);

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<KeywordListItem>) => {
    if (!event.data) return;
    drawerRef.current?.open({ modelId, keywordData: event.data });
  };

  const handleClickExportData = () => exportKeyword({ modelId, isTemplate: 0 });
  const handleClickExportTemplate = () => exportKeyword({ modelId, isTemplate: 1 });

  const exportMenu = {
    items: [
      {
        label: (
          <Tooltip
            title={<span style={{ whiteSpace: 'pre-line' }}>{`전체 데이터 파일(엑셀)을 다운로드합니다.\n데이터를 일괄 내보내기 위한 용도입니다.`}</span>}
            placement="left"
            styles={{ root: { maxWidth: '300px' } }}
          >
            <span className="flex items-center gap-2">
              <CloudDownload className="size-4" />
              데이터 다운로드
            </span>
          </Tooltip>
        ),
        key: 'export-data',
        onClick: handleClickExportData,
      },
      {
        label: (
          <Tooltip
            title={<span style={{ whiteSpace: 'pre-line' }}>{`빈 템플릿 파일(엑셀)을 다운로드합니다.\n데이터를 직접 입력하기 위한 용도입니다.`}</span>}
            placement="left"
            styles={{ root: { maxWidth: '300px' } }}
          >
            <span className="flex items-center gap-2">
              <Download className="size-4" />
              템플릿 다운로드
            </span>
          </Tooltip>
        ),
        key: 'export-template',
        onClick: handleClickExportTemplate,
      },
    ],
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select value="keywordName" options={[{ label: '키워드명', value: 'keywordName' }]} className="!max-w-[150px] !min-w-[120px]" popupMatchSelectWidth={false} />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" onClick={() => importModalRef.current?.open()}>
            Import
          </Button>
          <Dropdown menu={exportMenu} trigger={['click']} placement="bottomRight">
            <Button color="cyan" variant="solid" loading={isExporting} icon={<ChevronDown className="size-4" />} iconPlacement="end">
              Export
            </Button>
          </Dropdown>
          <Button variant="solid" color="primary" onClick={() => drawerRef.current?.open({ modelId })}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<KeywordListItem>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isFetching}
          getRowId={(params) => params.data.keywordId}
          onRowDoubleClicked={handleRowDoubleClick}
        />
      </div>
      <KeywordDrawer ref={drawerRef} />
      <FileImportModal
        ref={importModalRef}
        title="Import"
        accept=".xlsx,.xls"
        onConfirm={(files) => importKeyword({ params: { modelId }, data: files[0] })}
        confirmLoading={isImporting}
      />
      <ExcelImportResultModal ref={importResultModalRef} nameColumnTitle="키워드명" />
    </div>
  );
}
