import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Input, Select, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, CloudDownload, Download } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import ExcelImportResultModal, { type ExcelImportResultModalRef } from '../../bot-config/components/ExcelImportResultModal';
import type { ExcelImportResult } from '../../bot-config/types/intent';
import AoeFaqDrawer, { type AoeFaqDrawerRef } from '../components/AoeFaqDrawer';
import { aoeQueryKeys, useApplyFaq, useDeleteFaq, useExportFaq, useGetFaqList, useImportFaq } from '../hooks/useAoeQueries';
import type { FaqListItem } from '../types/aoe.types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import { IconTrash } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function AoeFaqList() {
  const { agentId } = useParams<{ agentId: string }>();
  const { gridOptions } = useAggridOptions();
  const faqDrawerRef = useRef<AoeFaqDrawerRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<ExcelImportResultModalRef>(null);
  const modal = useModal();
  const queryClient = useQueryClient();

  // FAQ 목록 조회
  const { data: faqList, isFetching } = useGetFaqList({ params: { aoeAgentId: agentId } });

  // FAQ 삭제
  const { mutate: deleteFaq, isPending: isDeleting } = useDeleteFaq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('FAQ가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: aoeQueryKeys.getFaqList({ aoeAgentId: agentId }).queryKey });
      },
    },
  });

  // FAQ 적용
  const { mutate: applyFaq, isPending: isApplying } = useApplyFaq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('FAQ가 적용되었습니다.');
        queryClient.invalidateQueries({ queryKey: aoeQueryKeys.getFaqList({ aoeAgentId: agentId }).queryKey });
      },
      onError: () => {
        toast.error('FAQ 적용에 실패했습니다.');
      },
    },
  });

  // FAQ Export
  const { mutate: exportFaq, isPending: isExporting } = useExportFaq();

  // FAQ Import
  const { mutate: importFaq, isPending: isImporting } = useImportFaq({
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: aoeQueryKeys.getFaqList({ aoeAgentId: agentId }).queryKey });
        importModalRef.current?.close();
        importResultModalRef.current?.open(data as ExcelImportResult);
      },
    },
  });

  // State
  const [rowData, setRowData] = useState<FaqListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('firstSentence');
  const [searchValue, setSearchValue] = useState('');

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleDelete = (faqId: string) => {
    if (!agentId) return;
    modal.confirm.delete({
      onOk: () => {
        deleteFaq({ aoeAgentId: agentId, faqId });
      },
    });
  };

  const handleApply = () => {
    if (!agentId) return;
    modal.confirm.execute({
      options: {
        title: 'FAQ 적용',
        content: 'FAQ를 적용하시겠습니까?',
      },
      onOk: () => {
        applyFaq({ aoeAgentId: agentId });
      },
    });
  };

  const handleClickImport = () => {
    importModalRef.current?.open();
  };

  const handleImportFaq = async (files: File[]) => {
    if (!agentId) return;
    const file = files[0];
    importFaq({ params: { aoeAgentId: agentId }, data: file });
  };

  const handleClickExportData = () => {
    if (!agentId) return;
    exportFaq({ aoeAgentId: agentId, isTemplate: 0 });
  };

  const handleClickExportTemplate = () => {
    if (!agentId) return;
    exportFaq({ aoeAgentId: agentId, isTemplate: 1 });
  };

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

  const columnDefs: ColDef<FaqListItem>[] = [
    { field: 'faqId', hide: true },
    {
      headerName: '질의문',
      field: 'firstSentence',
      flex: 2,
      cellRenderer: (params: ICellRendererParams<FaqListItem>) => {
        const { data } = params;
        if (!data) return '';
        const { firstSentence, sentenceCount } = data;
        return sentenceCount > 1 ? (
          <div className="flex items-center gap-1 w-full overflow-hidden">
            <span className="truncate min-w-0">{firstSentence}</span>
            <Tag color="default" className="shrink-0 !rounded-[14px] !text-[#888B9A]">
              +{sentenceCount - 1}
            </Tag>
          </div>
        ) : (
          firstSentence
        );
      },
    },
    { headerName: '답변', field: 'faqAnswer', flex: 2 },
    {
      headerName: '상태',
      field: 'faqEnable',
      maxWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<FaqListItem>) => {
        if (!params.data) return null;
        const isActive = params.data.faqEnable === 1;
        return (
          <Badge variant="secondary" className={cn('text-[13px] font-medium !h-6', isActive ? 'text-[#10B981] bg-[#10B9811A]' : 'text-[#6B7280] bg-[#6B72801A]')}>
            {isActive ? '활성' : '비활성'}ㅋ
          </Badge>
        );
      },
    },
    {
      headerName: '수정일',
      field: 'workTime',
      maxWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '',
      maxWidth: 80,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<FaqListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data.faqId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!faqList) return [];
    if (!searchValue.trim()) return faqList;
    const keyword = searchValue.toLowerCase();
    return faqList.filter((item) => {
      const value = item[filterColumn as keyof FaqListItem];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [faqList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList);
  }, [filteredList]);

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="firstSentence"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '질의문', value: 'firstSentence' },
              { label: '답변', value: 'faqAnswer' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="검색어를 입력하세요." className="w-full lg:max-w-[400px]" />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" onClick={handleClickImport}>
            Import
          </Button>
          <Dropdown menu={exportMenu} trigger={['click']} placement="bottomRight">
            <Button variant="solid" color="cyan" loading={isExporting} icon={<ChevronDown className="size-4" />} iconPlacement="end">
              Export
            </Button>
          </Dropdown>
          <Button variant="solid" color="primary" onClick={() => faqDrawerRef.current?.open({ aoeAgentId: agentId ?? '' })}>
            추가
          </Button>
          <Button variant="solid" color="purple" onClick={handleApply} loading={isApplying}>
            적용
          </Button>
        </div>
      </header>

      <div className="w-full h-full">
        <AgGridReact<FaqListItem>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isFetching || isDeleting}
          onRowDoubleClicked={(event: RowDoubleClickedEvent<FaqListItem>) => {
            if (event.data) {
              faqDrawerRef.current?.open({ aoeAgentId: agentId ?? '', faqData: event.data });
            }
          }}
        />
      </div>

      <AoeFaqDrawer
        ref={faqDrawerRef}
        onSave={(data, isEditMode) => {
          Log.debug('Save FAQ:', data, 'Edit mode:', isEditMode);
        }}
      />
      <FileImportModal ref={importModalRef} title="FAQ Import" accept=".xlsx,.xls" onConfirm={handleImportFaq} confirmLoading={isImporting} />
      <ExcelImportResultModal ref={importResultModalRef} nameColumnTitle="질의문" />
    </div>
  );
}
