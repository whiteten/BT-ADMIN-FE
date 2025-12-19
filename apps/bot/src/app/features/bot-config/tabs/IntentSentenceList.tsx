import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, Select } from 'antd';
import dayjs from 'dayjs';
import { confirmModal, toast } from '@/shared-util';
import { modelQueryKeys, useDeleteIntentSentence, useGetIntentSentences } from '../hooks/useModelQueries';
import type { IntentSentenceListItem } from '../types';
import { IconTrash } from '@/libs/shared-ui/src/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export default function IntentSentenceList() {
  const { modelId = '', intentId = '' } = useParams();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<IntentSentenceListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('sentence');
  const [searchValue, setSearchValue] = useState('');
  const queryClient = useQueryClient();
  const { data: sentenceList, isFetching } = useGetIntentSentences({ params: { modelId, intentId } });
  const { mutateAsync: deleteIntentSentence } = useDeleteIntentSentence({
    mutationOptions: {
      onSuccess: () => {
        toast.success('문장이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntentSentences({ modelId, intentId }).queryKey });
      },
    },
  });

  const handleDeleteIntentSentence = (sentenceId: string) => {
    confirmModal.delete({
      onOk: () => deleteIntentSentence({ modelId, intentId, sentenceId }),
    });
  };

  const columnDefs: ColDef<IntentSentenceListItem>[] = [
    { headerName: 'ID', field: 'sentenceId', hide: true },
    { headerName: '문장', field: 'sentence', flex: 3 },
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
      cellRenderer: (params: ICellRendererParams<IntentSentenceListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteIntentSentence(data.sentenceId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!sentenceList) return [];
    if (!searchValue.trim()) return sentenceList;
    const keyword = searchValue.toLowerCase();
    return sentenceList.filter((sentence) => {
      const value = sentence[filterColumn as keyof typeof sentence];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [sentenceList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="sentence"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '문장', value: 'sentence' }]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<IntentSentenceListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isFetching} />
      </div>
    </div>
  );
}
