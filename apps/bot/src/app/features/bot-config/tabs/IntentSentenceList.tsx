import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { confirmModal, toast } from '@/shared-util';
import { modelTestModal } from '../components/ModelTestModal';
import { modelQueryKeys, useCreateIntentSentence, useDeleteIntentSentence, useGetIntentSentences } from '../hooks/useModelQueries';
import type { IntentSentenceListItem } from '../types';
import { IconPlayCircle, IconTrash } from '@/libs/shared-ui/src/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export default function IntentSentenceList() {
  const { modelId = '', intentId = '' } = useParams();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<IntentSentenceListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('sentence');
  const [searchValue, setSearchValue] = useState('');
  const [testInputValue, setTestInputValue] = useState('');
  const queryClient = useQueryClient();
  const { data: sentenceList, isFetching } = useGetIntentSentences({ params: { modelId, intentId } });
  const { mutateAsync: createIntentSentence, isPending: isCreating } = useCreateIntentSentence({
    mutationOptions: {
      onSuccess: () => {
        toast.success('문장이 추가되었습니다.');
        setTestInputValue('');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntentSentences({ modelId, intentId }).queryKey });
      },
    },
  });
  const { mutateAsync: deleteIntentSentence } = useDeleteIntentSentence({
    mutationOptions: {
      onSuccess: () => {
        toast.success('문장이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntentSentences({ modelId, intentId }).queryKey });
      },
    },
  });

  const handleTestIntentSentence = (sentence: string) => {
    if (!sentence.trim()) {
      toast.warning('문장을 입력하세요.');
      return;
    }
    modelTestModal.open(sentence.trim());
  };

  const handleCreateIntentSentence = () => {
    if (!testInputValue.trim()) {
      toast.warning('문장을 입력하세요.');
      return;
    }
    createIntentSentence({ params: { modelId, intentId }, data: { sentence: testInputValue.trim(), modelVersion: 'DRAFT' } });
  };

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
              handleTestIntentSentence(data.sentence);
            }}
          >
            <IconPlayCircle className="size-5 text-[#405189] hover:cursor-pointer" />
          </button>
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
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Select
            defaultValue="sentence"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '문장', value: 'sentence' }]}
            className="!w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="!w-[280px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Input placeholder="의도를 인식할 문장을 입력하세요." className="!w-[400px]" value={testInputValue} onChange={(e) => setTestInputValue(e.target.value)} />
          <Button
            variant="solid"
            color="cyan"
            icon={<IconPlayCircle className="size-5" />}
            className="[&_.ant-btn-icon]:flex [&_.ant-btn-icon]:items-center !gap-1"
            onClick={() => handleTestIntentSentence(testInputValue)}
          >
            테스트
          </Button>
          <Button variant="solid" color="primary" onClick={handleCreateIntentSentence} loading={isCreating}>
            추가
          </Button>
          <Button variant="solid">자동생성</Button>
          <Button variant="solid">Import</Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<IntentSentenceListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isFetching} />
      </div>
    </div>
  );
}
