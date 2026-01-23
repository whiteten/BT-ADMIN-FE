import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type {
  CellDoubleClickedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IRowNode,
  RowEditingStartedEvent,
  RowEditingStoppedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, type InputRef, Select } from 'antd';
import dayjs from 'dayjs';
import { Check, X } from 'lucide-react';
import { toast } from '@/shared-util';
import IntentSentenceAutoGenDrawer, { type IntentSentenceAutoGenDrawerRef } from '../components/IntentSentenceAutoGenDrawer';
import { modelInferenceModal } from '../components/ModelInferenceModal';
import TrainDiffStatusBadge from '../components/TrainDiffStatusBadge';
import TrainStatusBadge from '../components/TrainStatusBadge';
import {
  modelQueryKeys,
  useCreateIntentSentence,
  useCreateIntentSentenceBulk,
  useDeleteIntentSentence,
  useGetIntentSentences,
  useUpdateIntentSentence,
} from '../hooks/useModelQueries';
import type { IntentSentenceListItem, TrainDiffStatus, TrainStatus } from '../types';
import { IconPlayCircle, IconTrash } from '@/libs/shared-ui/src/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface InputTextCellEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  cellStartedEdit?: boolean;
}

const InputTextCellEditor = ({ value = '', onValueChange, placeholder = '', cellStartedEdit }: InputTextCellEditorProps) => {
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (cellStartedEdit) {
      inputRef.current?.focus();
    }
  }, [cellStartedEdit]);

  return <Input ref={inputRef} value={value} onChange={(e) => onValueChange(e.target.value)} placeholder={placeholder} />;
};

interface ActionCellRendererParams extends ICellRendererParams<IntentSentenceListItem> {
  editingRowId: string | null;
  onSave: (data: IntentSentenceListItem) => void;
  onCancel: () => void;
  onTest: (data: IntentSentenceListItem) => void;
  onDelete: (data: IntentSentenceListItem) => void;
}

const ActionCellRenderer = (params: ActionCellRendererParams) => {
  const { data, editingRowId, onSave, onCancel, onTest, onDelete } = params;
  if (!data) return null;

  const rowId = data.sentenceId;

  if (editingRowId === rowId) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave(data);
          }}
        >
          <Check className="size-5 text-green-500 hover:text-green-600 hover:cursor-pointer" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
        >
          <X className="size-5 text-gray-500 hover:text-gray-600 hover:cursor-pointer" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTest(data);
        }}
      >
        <IconPlayCircle className="size-5 text-[#405189] hover:cursor-pointer" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(data);
        }}
      >
        <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
      </button>
    </div>
  );
};

export default function IntentSentenceList() {
  const { modelId = '', intentId = '' } = useParams();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();

  // Refs
  const refAutoGenDrawer = useRef<IntentSentenceAutoGenDrawerRef>(null);
  const gridApiRef = useRef<GridApi<IntentSentenceListItem> | null>(null);

  // State
  const [filterColumn, setFilterColumn] = useState('sentence');
  const [searchValue, setSearchValue] = useState('');
  const [testInputValue, setTestInputValue] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // API Hooks
  const { data: sentenceList, isLoading: isLoadingSentenceList } = useGetIntentSentences({
    params: { modelId, intentId },
    queryOptions: { enabled: !!modelId && !!intentId && !editingRowId, refetchInterval: 5000 },
  });
  const { mutate: createIntentSentence, isPending: isCreating } = useCreateIntentSentence({
    mutationOptions: {
      onSuccess: () => {
        toast.success('문장이 추가되었습니다.');
        setTestInputValue('');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntentSentences({ modelId, intentId }).queryKey });
      },
    },
  });
  const { mutate: createIntentSentenceBulk, isPending: isCreatingBulk } = useCreateIntentSentenceBulk({
    mutationOptions: {
      onSuccess: () => {
        toast.success('문장이 추가되었습니다.');
        refAutoGenDrawer.current?.close();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntentSentences({ modelId, intentId }).queryKey });
      },
    },
  });
  const { mutate: updateIntentSentence, isPending: isUpdating } = useUpdateIntentSentence({
    mutationOptions: {
      onSuccess: () => {
        toast.success('문장이 수정되었습니다.');
        gridApiRef.current?.stopEditing();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntentSentences({ modelId, intentId }).queryKey });
      },
    },
  });
  const { mutate: deleteIntentSentence } = useDeleteIntentSentence({
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
    modelInferenceModal.open(sentence.trim());
  };

  const handleCreateIntentSentence = () => {
    if (!testInputValue.trim()) {
      toast.warning('문장을 입력하세요.');
      return;
    }
    createIntentSentence({ params: { modelId, intentId }, data: { sentence: testInputValue.trim() } });
  };

  const handleCreateBulkIntentSentenceByDrawer = (params: { modelId: string; sentences: string[] }) => {
    createIntentSentenceBulk({ params: { modelId: params.modelId, intentId }, data: { sentences: params.sentences } });
  };

  const handleDeleteIntentSentence = (sentenceId: string) => {
    modal.confirm.delete({
      onOk: () => deleteIntentSentence({ modelId, intentId, sentenceId }),
    });
  };

  // Grid 이벤트 핸들러
  const handleGridReady = (event: GridReadyEvent<IntentSentenceListItem>) => {
    gridApiRef.current = event.api;
  };

  const getRowId = (params: GetRowIdParams<IntentSentenceListItem>) => {
    return params.data.sentenceId;
  };

  const handleCellDoubleClick = (event: CellDoubleClickedEvent<IntentSentenceListItem>) => {
    if (!event.data) return;
    const rowId = event.data.sentenceId;

    if (editingRowId === rowId) return;

    if (editingRowId) {
      toast.warning('현재 편집 중인 항목을 먼저 저장하거나 취소하세요.');
      return;
    }

    if (event.rowIndex != null) {
      event.api.startEditingCell({ rowIndex: event.rowIndex, colKey: 'sentence' });
    }
  };

  const handleRowEditingStarted = (event: RowEditingStartedEvent<IntentSentenceListItem>) => {
    if (!event.data) return;
    setEditingRowId(event.data.sentenceId);
  };

  const handleRowEditingStopped = (event: RowEditingStoppedEvent<IntentSentenceListItem>) => {
    if (!event.data) return;
    setEditingRowId(null);
  };

  const handleSave = (originData: IntentSentenceListItem) => {
    const editingCells = gridApiRef.current?.getEditingCells() ?? [];
    const cellEditors = gridApiRef.current?.getCellEditorInstances() ?? [];

    let newSentence = originData.sentence;

    editingCells.forEach((cell, index) => {
      if (cell.colId === 'sentence') {
        const editor = cellEditors[index];
        if (editor) {
          newSentence = editor.getValue();
        }
      }
    });

    if (!newSentence?.trim()) {
      toast.warning('문장을 입력하세요.');
      return;
    }

    updateIntentSentence({
      params: { modelId, intentId, sentenceId: originData.sentenceId },
      data: { sentence: newSentence.trim() },
    });
  };

  const cancelEditing = () => {
    gridApiRef.current?.stopEditing(true);
  };

  // 외부 필터 함수
  const isExternalFilterPresent = () => {
    return searchValue.trim().length > 0;
  };

  const doesExternalFilterPass = (node: IRowNode<IntentSentenceListItem>) => {
    if (!node.data) return true;
    const keyword = searchValue.toLowerCase();
    const value = node.data[filterColumn as keyof IntentSentenceListItem];
    return String(value).toLowerCase().includes(keyword);
  };

  useEffect(() => {
    gridApiRef.current?.onFilterChanged();
  }, [searchValue, filterColumn]);

  const columnDefs: ColDef<IntentSentenceListItem>[] = [
    { headerName: 'ID', field: 'sentenceId', hide: true },
    {
      headerName: '문장',
      field: 'sentence',
      flex: 3,
      editable: true,
      cellEditor: InputTextCellEditor,
      cellEditorParams: { placeholder: '문장을 입력하세요.' },
    },
    {
      headerName: '학습상태',
      field: 'trainStatus',
      maxWidth: 120,
      editable: false,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: { value: number; data: IntentSentenceListItem }) => <TrainStatusBadge status={params.value as TrainStatus} />,
    },
    {
      headerName: '변경이력',
      headerTooltip: '모델 학습이 완료된 이후, 변경사항이 있을 경우 표시됩니다. 다음 모델 학습 완료시, 이력은 초기화됩니다.',
      field: 'trainDiffStatus',
      maxWidth: 100,
      editable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: { value: TrainDiffStatus }) => <TrainDiffStatusBadge status={params.value as TrainDiffStatus} />,
    },
    {
      headerName: '작업일시',
      field: 'workTime',
      maxWidth: 180,
      editable: false,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '',
      colId: 'actions',
      maxWidth: 100,
      sortable: false,
      filter: false,
      editable: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      cellRendererParams: {
        editingRowId,
        onSave: handleSave,
        onCancel: cancelEditing,
        onTest: (data: IntentSentenceListItem) => handleTestIntentSentence(data.sentence),
        onDelete: (data: IntentSentenceListItem) => handleDeleteIntentSentence(data.sentenceId),
      },
      cellRenderer: ActionCellRenderer,
    },
  ];

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
          <Button variant="solid" onClick={() => refAutoGenDrawer.current?.open({ modelId, intentId })}>
            자동생성
          </Button>
          <Button variant="solid">Import</Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<IntentSentenceListItem>
          rowData={sentenceList ?? []}
          columnDefs={columnDefs}
          getRowId={getRowId}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          gridOptions={{
            ...gridOptions,
            editType: 'fullRow',
            stopEditingWhenCellsLoseFocus: true,
            readOnlyEdit: true,
            suppressClickEdit: true,
          }}
          loading={isLoadingSentenceList || isUpdating}
          onGridReady={handleGridReady}
          onCellDoubleClicked={handleCellDoubleClick}
          onRowEditingStarted={handleRowEditingStarted}
          onRowEditingStopped={handleRowEditingStopped}
        />
      </div>
      <IntentSentenceAutoGenDrawer ref={refAutoGenDrawer} onAdd={handleCreateBulkIntentSentenceByDrawer} isAdding={isCreatingBulk} />
    </div>
  );
}
