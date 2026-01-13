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
import { Check, X } from 'lucide-react';
import { toast } from '@/shared-util';
import SentenceAutoGenDrawer, { type SentenceAutoGenDrawerRef } from '../components/SentenceAutoGenDrawer';
import {
  modelQueryKeys,
  useCreateEvaluationQuestion,
  useCreateEvaluationQuestionBulk,
  useDeleteEvaluationQuestion,
  useGetEvaluationQuestions,
  useGetIntents,
  useUpdateEvaluationQuestion,
} from '../hooks/useModelQueries';
import type { EvaluationQuestionListItem } from '../types/evaluation';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const TEMP_ROW_PREFIX = 'temp_';

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

interface SelectCellEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  cellStartedEdit?: boolean;
}

const SelectCellEditor = ({ value = '', onValueChange, options = [], placeholder = '', cellStartedEdit }: SelectCellEditorProps) => {
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cellStartedEdit) {
      selectRef.current?.querySelector('input')?.focus();
    }
  }, [cellStartedEdit]);

  return (
    <div ref={selectRef} className="w-full">
      <Select value={value || undefined} onChange={onValueChange} options={options} placeholder={placeholder} className="w-full" showSearch={{ optionFilterProp: 'label' }} />
    </div>
  );
};

interface ActionCellRendererParams extends ICellRendererParams<EvaluationQuestionListItem> {
  editingRowId: string | null;
  onSave: (data: EvaluationQuestionListItem) => void;
  onCancel: () => void;
  onDelete: (data: EvaluationQuestionListItem) => void;
}

const ActionCellRenderer = (params: ActionCellRendererParams) => {
  const { data, editingRowId, onSave, onCancel, onDelete } = params;
  if (!data) return null;

  const rowId = `${data.evalId}_${data.questionSeq}_${data.question}`;

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
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onDelete(data);
      }}
    >
      <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
    </button>
  );
};

export default function EvaluationQuestionList() {
  const { modelId = '', evalId = '' } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const refAutoGenDrawer = useRef<SentenceAutoGenDrawerRef>(null);

  // State
  const [filterColumn, setFilterColumn] = useState('question');
  const [searchValue, setSearchValue] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [bulkAnswer, setBulkAnswer] = useState<string | null>(null);

  // Refs
  const gridApiRef = useRef<GridApi<EvaluationQuestionListItem> | null>(null);

  // API Hooks
  const { data: questionList, isFetching } = useGetEvaluationQuestions({
    params: { modelId, evalId },
    queryOptions: { enabled: !!modelId && !!evalId },
  });

  const { data: intentList } = useGetIntents({
    params: { modelId },
    queryOptions: { enabled: !!modelId },
  });

  const intentOptions =
    intentList?.map((intent) => ({
      label: intent.intentName,
      value: intent.intentName,
    })) ?? [];

  const { mutate: createEvaluationQuestion, isPending: isCreating } = useCreateEvaluationQuestion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가 문항이 추가되었습니다.');
        gridApiRef.current?.stopEditing();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluationQuestions({ modelId, evalId }).queryKey });
      },
    },
  });

  const { mutate: createEvaluationQuestionBulk, isPending: isCreatingBulk } = useCreateEvaluationQuestionBulk({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가 문항이 추가되었습니다.');
        refAutoGenDrawer.current?.close();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluationQuestions({ modelId, evalId }).queryKey });
      },
    },
  });

  const { mutate: updateEvaluationQuestion, isPending: isUpdating } = useUpdateEvaluationQuestion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가 문항이 수정되었습니다.');
        gridApiRef.current?.stopEditing();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluationQuestions({ modelId, evalId }).queryKey });
      },
    },
  });

  const { mutate: deleteEvaluationQuestion, isPending: isDeleting } = useDeleteEvaluationQuestion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가 문항이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluationQuestions({ modelId, evalId }).queryKey });
      },
    },
  });

  // Row ID 생성 (복합키)
  const getRowId = (params: GetRowIdParams<EvaluationQuestionListItem>) => {
    const { evalId, questionSeq, question } = params.data;
    return `${evalId}_${questionSeq}_${question}`;
  };

  // 검색어가 있으면 외부 필터 활성화
  const isExternalFilterPresent = () => {
    return searchValue.trim().length > 0;
  };

  // 각 row가 검색 조건을 만족하는지 확인
  const doesExternalFilterPass = (node: IRowNode<EvaluationQuestionListItem>) => {
    if (!node.data) return true;
    const rowId = `${node.data.evalId}_${node.data.questionSeq}_${node.data.question}`;
    if (rowId.startsWith(TEMP_ROW_PREFIX)) return true;
    const keyword = searchValue.toLowerCase();
    const value = node.data[filterColumn as keyof EvaluationQuestionListItem];
    return String(value).toLowerCase().includes(keyword);
  };

  useEffect(() => {
    gridApiRef.current?.onFilterChanged();
  }, [searchValue, filterColumn]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleGridReady = (event: GridReadyEvent<EvaluationQuestionListItem>) => {
    gridApiRef.current = event.api;
  };

  const handleCellDoubleClick = (event: CellDoubleClickedEvent<EvaluationQuestionListItem>) => {
    if (!event.data) return;
    const rowId = `${event.data.evalId}_${event.data.questionSeq}_${event.data.question}`;
    if (editingRowId === rowId) return;
    if (editingRowId) {
      toast.warning('현재 편집 중인 항목을 먼저 저장하거나 취소하세요.');
      return;
    }
    if (event.rowIndex != null) {
      const clickedColId = event.column?.getColId();
      const editableColumns = event.api
        .getColumns()
        ?.filter((col) => col.getColDef().editable)
        .map((col) => col.getColId());
      const colKey = clickedColId && editableColumns?.includes(clickedColId) ? clickedColId : (editableColumns?.[0] ?? '');
      event.api.startEditingCell({ rowIndex: event.rowIndex, colKey });
    }
  };

  const handleRowEditingStarted = (event: RowEditingStartedEvent<EvaluationQuestionListItem>) => {
    if (!event.data) return;
    const rowId = `${event.data.evalId}_${event.data.questionSeq}_${event.data.question}`;
    setEditingRowId(rowId);
  };

  const handleRowEditingStopped = (event: RowEditingStoppedEvent<EvaluationQuestionListItem>) => {
    if (!event.data) return;
    const rowId = `${event.data.evalId}_${event.data.questionSeq}_${event.data.question}`;
    setEditingRowId(null);

    if (rowId.startsWith(TEMP_ROW_PREFIX)) {
      event.api.applyTransaction({
        remove: [event.data],
      });
    }
  };

  const handleAddNewRow = () => {
    if (editingRowId) {
      toast.warning('현재 편집 중인 항목을 먼저 저장하거나 취소하세요.');
      return;
    }
    gridApiRef.current?.paginationGoToFirstPage();
    const tempId = `${TEMP_ROW_PREFIX}${Date.now()}`;
    const newRow: EvaluationQuestionListItem = {
      evalId: tempId,
      questionSeq: null as unknown as number,
      question: '',
      answer: '',
    };
    const result = gridApiRef.current?.applyTransaction({
      add: [newRow],
      addIndex: 0,
    });
    if (result?.add?.[0]) {
      gridApiRef.current?.onFilterChanged();
      requestAnimationFrame(() => {
        const rowNode = gridApiRef.current?.getRowNode(`${tempId}_null_`);
        if (rowNode?.rowIndex != null) {
          gridApiRef.current?.startEditingCell({
            rowIndex: rowNode.rowIndex,
            colKey: 'question',
          });
        }
      });
    }
  };

  const handleSave = (originData: EvaluationQuestionListItem) => {
    const editingCells = gridApiRef.current?.getEditingCells() ?? [];
    const cellEditors = gridApiRef.current?.getCellEditorInstances() ?? [];
    const currentValues: Partial<EvaluationQuestionListItem> = {};
    editingCells.forEach((cell, index) => {
      const colId = cell.colId as keyof EvaluationQuestionListItem;
      const editor = cellEditors[index];
      if (editor && colId) {
        currentValues[colId] = editor.getValue();
      }
    });

    const requestData = {
      question: (currentValues.question ?? originData.question) as string,
      answer: (currentValues.answer ?? originData.answer) as string,
    };

    if (!requestData.question?.trim()) {
      toast.warning('질문을 입력하세요.');
      return;
    }
    if (!requestData.answer?.trim()) {
      toast.warning('정답을 선택하세요.');
      return;
    }

    const rowId = `${originData.evalId}_${originData.questionSeq}_${originData.question}`;
    const isNewRow = rowId.startsWith(TEMP_ROW_PREFIX);

    if (isNewRow) {
      createEvaluationQuestion({
        params: { modelId, evalId },
        data: requestData,
      });
    } else {
      updateEvaluationQuestion({
        params: { modelId, evalId, questionSeq: originData.questionSeq },
        data: requestData,
      });
    }
  };

  const cancelEditing = () => {
    gridApiRef.current?.stopEditing(true);
  };

  const handleDelete = (data: EvaluationQuestionListItem) => {
    modal.confirm.delete({
      onOk: () => {
        deleteEvaluationQuestion({
          modelId,
          evalId,
          questionSeq: data.questionSeq,
        });
      },
    });
  };

  const handleCreateBulkEvaluationQuestionByDrawer = (params: { modelId: string; sentences: string[]; answer: string }) => {
    const { sentences, answer } = params;
    if (!answer) {
      toast.warning('정답을 선택하세요.');
      return;
    }
    createEvaluationQuestionBulk({
      params: { modelId, evalId },
      data: sentences.map((sentence) => ({ question: sentence, answer })),
    });
  };

  const columnDefs: ColDef<EvaluationQuestionListItem>[] = [
    {
      headerName: '질문',
      field: 'question',
      editable: true,
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellEditor: InputTextCellEditor,
      cellEditorParams: { placeholder: '질문을 입력하세요.' },
    },
    {
      headerName: '정답',
      field: 'answer',
      editable: true,
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellEditor: SelectCellEditor,
      cellEditorParams: {
        options: intentOptions,
        placeholder: '정답을 선택하세요.',
      },
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
        onDelete: handleDelete,
      },
      cellRenderer: ActionCellRenderer,
    },
  ];

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="question"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '질문', value: 'question' },
              { label: '정답', value: 'answer' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" color="primary" onClick={handleAddNewRow} loading={isCreating}>
            추가
          </Button>
          <Button variant="solid" onClick={() => refAutoGenDrawer.current?.open({ modelId })}>
            자동생성
          </Button>
          <Button variant="solid">Import</Button>
          <Button variant="solid">Export</Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EvaluationQuestionListItem>
          rowData={questionList ?? []}
          columnDefs={columnDefs}
          getRowId={getRowId}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          gridOptions={{
            ...gridOptions,
            sideBar: false,
            editType: 'fullRow',
            stopEditingWhenCellsLoseFocus: true,
            readOnlyEdit: true,
            suppressClickEdit: true,
          }}
          loading={isFetching || isUpdating || isDeleting}
          onGridReady={handleGridReady}
          onCellDoubleClicked={handleCellDoubleClick}
          onRowEditingStarted={handleRowEditingStarted}
          onRowEditingStopped={handleRowEditingStopped}
        />
      </div>
      <SentenceAutoGenDrawer
        ref={refAutoGenDrawer}
        onAdd={({ modelId, sentences, extraData }) => {
          handleCreateBulkEvaluationQuestionByDrawer({ modelId, sentences, answer: extraData?.answer as string });
        }}
        renderExtraFields={() => (
          <div className="flex flex-col gap-2">
            <span className="text-base text-[#495057] font-medium">정답 선택</span>
            <Select
              value={bulkAnswer}
              onChange={setBulkAnswer}
              options={intentOptions}
              placeholder="정답을 선택하세요."
              className="w-full"
              showSearch={{ optionFilterProp: 'label' }}
              allowClear
            />
          </div>
        )}
        getExtraFieldValues={() => ({ answer: bulkAnswer })}
        isAdding={isCreatingBulk}
      />
    </div>
  );
}
