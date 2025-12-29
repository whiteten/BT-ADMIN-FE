import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IRowNode,
  RowDoubleClickedEvent,
  RowEditingStartedEvent,
  RowEditingStoppedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag } from 'antd';
import { Check, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { modelQueryKeys, useCreateEntityValue, useDeleteEntityValue, useGetEntityValues, useUpdateEntityValue } from '../hooks/useModelQueries';
import type { EntityType, EntityValueListItem } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const TEMP_ROW_PREFIX = 'temp_';

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  SAME: '동의어',
  SYNONYMS: '유사어',
  PATTERNS: '패턴형',
};

const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  SAME: 'blue',
  SYNONYMS: 'green',
  PATTERNS: 'orange',
};

interface InputTextCellEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const InputTextCellEditor = ({ value = '', onValueChange, placeholder = '' }: InputTextCellEditorProps) => {
  return <Input value={value} onChange={(e) => onValueChange(e.target.value)} placeholder={placeholder} />;
};

interface TypeCellRendererParams extends ICellRendererParams<EntityValueListItem> {
  value: EntityType;
}

const TypeCellRenderer = ({ value }: TypeCellRendererParams) => {
  if (!value) return null;
  return (
    <Tag color={ENTITY_TYPE_COLORS[value]} className="!m-0">
      {ENTITY_TYPE_LABELS[value]}
    </Tag>
  );
};

interface ActionCellRendererParams extends ICellRendererParams<EntityValueListItem> {
  editingRowId: string | null;
  onSave: (data: EntityValueListItem) => void;
  onCancel: () => void;
  onDelete: (data: EntityValueListItem) => void;
}

const ActionCellRenderer = (params: ActionCellRendererParams) => {
  const { data, editingRowId, onSave, onCancel, onDelete } = params;
  if (!data) return null;
  if (editingRowId === data.entityValueId) {
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

export default function EntityValueList() {
  const { modelId, entityId } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // State
  const [filterColumn, setFilterColumn] = useState('entityValue');
  const [searchValue, setSearchValue] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Refs
  const gridApiRef = useRef<GridApi<EntityValueListItem> | null>(null);

  // API Hooks
  const { data: entityValueList, isFetching } = useGetEntityValues({ params: { modelId, entityId } });
  const { mutate: createEntityValue, isPending: isCreating } = useCreateEntityValue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('유사어가 추가되었습니다.');
        gridApiRef.current?.stopEditing();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntityValues({ modelId, entityId }).queryKey });
      },
    },
  });
  const { mutate: updateEntityValue, isPending: isUpdating } = useUpdateEntityValue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('유사어가 수정되었습니다.');
        gridApiRef.current?.stopEditing();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntityValues({ modelId, entityId }).queryKey });
      },
    },
  });
  const { mutate: deleteEntityValue, isPending: isDeleting } = useDeleteEntityValue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('유사어가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntityValues({ modelId, entityId }).queryKey });
      },
    },
  });

  // AG Grid 콜백
  const getRowId = (params: GetRowIdParams<EntityValueListItem>) => params.data.entityValueId;

  // 검색어가 있으면 외부 필터 활성화
  const isExternalFilterPresent = () => {
    return searchValue.trim().length > 0;
  };

  // 각 row가 검색 조건을 만족하는지 확인
  const doesExternalFilterPass = (node: IRowNode<EntityValueListItem>) => {
    if (!node.data) return true;
    if (node.data.entityValueId.startsWith(TEMP_ROW_PREFIX)) return true; // 추가를 통한 row는 검색조건과 관계없이 표기
    const keyword = searchValue.toLowerCase();
    const value = node.data[filterColumn as keyof EntityValueListItem];
    return String(value).toLowerCase().includes(keyword);
  };

  useEffect(() => {
    gridApiRef.current?.onFilterChanged();
  }, [searchValue, filterColumn]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleGridReady = (event: GridReadyEvent<EntityValueListItem>) => {
    gridApiRef.current = event.api;
  };

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<EntityValueListItem>) => {
    if (!event.data) return;
    const rowId = event.data.entityValueId;
    if (editingRowId === rowId) return;
    if (editingRowId) {
      toast.warning('현재 편집 중인 항목을 먼저 저장하거나 취소하세요.');
      return;
    }
    if (event.rowIndex != null) {
      event.api.startEditingCell({ rowIndex: event.rowIndex, colKey: 'entityValue' });
    }
  };

  const handleRowEditingStarted = (event: RowEditingStartedEvent<EntityValueListItem>) => {
    setEditingRowId(event?.data?.entityValueId ?? null);
  };

  const handleRowEditingStopped = (event: RowEditingStoppedEvent<EntityValueListItem>) => {
    const rowId = event.data?.entityValueId;
    setEditingRowId(null);

    if (rowId?.startsWith(TEMP_ROW_PREFIX)) {
      event.api.applyTransaction({
        remove: [{ entityValueId: rowId } as EntityValueListItem],
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
    const newRow: EntityValueListItem = {
      entityValueId: tempId,
      entityValue: '',
      entityType: 'SAME' as EntityType,
      entityTypeValues: '',
    };
    const result = gridApiRef.current?.applyTransaction({
      add: [newRow],
      addIndex: 0,
    });
    if (result?.add?.[0]) {
      gridApiRef.current?.onFilterChanged();
      // TODO: setTimeout을 사용하지 않고, 편집 가능한 row가 생성시, 정확한 시점에 편집 상태로 전환되도록 설정 필요.
      setTimeout(() => {
        const rowNode = gridApiRef.current?.getRowNode(tempId);
        if (rowNode?.rowIndex != null) {
          gridApiRef.current?.startEditingCell({
            rowIndex: rowNode.rowIndex,
            colKey: 'entityValue',
          });
        }
      }, 0);
    }
  };

  const handleSave = (originData: EntityValueListItem) => {
    const editingCells = gridApiRef.current?.getEditingCells() ?? [];
    const cellEditors = gridApiRef.current?.getCellEditorInstances() ?? [];
    const currentValues: Partial<EntityValueListItem> = {};
    editingCells.forEach((cell, index) => {
      const colId = cell.colId as keyof EntityValueListItem;
      const editor = cellEditors[index];
      if (editor && colId) {
        currentValues[colId] = editor.getValue();
      }
    });
    const requestData = {
      entityValue: (currentValues.entityValue ?? '') as string,
      entityType: (currentValues.entityType ?? 'SAME') as EntityType,
      entityTypeValues: (currentValues.entityTypeValues ?? '') as string,
    };
    if (!requestData.entityValue?.trim()) {
      toast.warning('대표값을 입력하세요.');
      return;
    }
    const isNewRow = originData.entityValueId.startsWith(TEMP_ROW_PREFIX);
    if (isNewRow) {
      createEntityValue({
        params: { modelId, entityId },
        data: requestData,
      });
    } else {
      updateEntityValue({
        params: { modelId, entityId, entityValueId: originData.entityValueId },
        data: requestData,
      });
    }
  };

  const cancelEditing = () => {
    gridApiRef.current?.stopEditing(true);
  };

  const handleDelete = (data: EntityValueListItem) => {
    modal.confirm.delete({
      onOk: () => {
        deleteEntityValue({
          modelId,
          entityId,
          entityValueId: data.entityValueId,
        });
      },
    });
  };

  const columnDefs: ColDef<EntityValueListItem>[] = [
    { headerName: 'ID', field: 'entityValueId', hide: true },
    {
      headerName: '대표값',
      field: 'entityValue',
      editable: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellEditor: InputTextCellEditor,
      cellEditorParams: { placeholder: '대표값을 입력하세요.' },
      maxWidth: 250,
    },
    {
      headerName: '타입',
      field: 'entityType',
      editable: true,
      maxWidth: 120,
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: { values: ['SAME', 'SYNONYMS', 'PATTERNS'] },
      refData: { SAME: '동의어', SYNONYMS: '유사어', PATTERNS: '패턴형' },
      cellRenderer: TypeCellRenderer,
    },
    {
      headerName: '유사어',
      field: 'entityTypeValues',
      editable: true,
      flex: 2,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellEditor: InputTextCellEditor,
      cellEditorParams: {
        placeholder: '여러 단어는 콤마(,)로 구분해 입력하세요.',
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
            defaultValue="entityValue"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '대표값', value: 'entityValue' },
              { label: '유사어', value: 'entityTypeValues' },
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
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EntityValueListItem>
          rowData={entityValueList ?? []}
          columnDefs={columnDefs}
          getRowId={getRowId}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          gridOptions={{
            ...gridOptions,
            sideBar: false,
            rowNumbers: false,
            editType: 'fullRow',
            stopEditingWhenCellsLoseFocus: true,
            readOnlyEdit: true,
            suppressClickEdit: true,
          }}
          loading={isFetching || isUpdating || isDeleting}
          onGridReady={handleGridReady}
          onRowDoubleClicked={handleRowDoubleClick}
          onRowEditingStarted={handleRowEditingStarted}
          onRowEditingStopped={handleRowEditingStopped}
        />
      </div>
    </div>
  );
}
