import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  RowDataUpdatedEvent,
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

export default function EntityValueList() {
  const { modelId, entityId } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<EntityValueListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('entityValue');
  const [searchValue, setSearchValue] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const gridApiRef = useRef<GridApi<EntityValueListItem> | null>(null);

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

  const filteredList = useMemo(() => {
    if (!entityValueList) return [];
    if (!searchValue.trim()) return entityValueList;
    const keyword = searchValue.toLowerCase();
    return entityValueList.filter((item) => {
      const value = item[filterColumn as keyof typeof item];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [entityValueList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  // 검색 컬럼 selectbox 변경시 검색어 초기화
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
    // 이미 같은 row를 편집 중이면 무시
    if (editingRowId === rowId) return;
    // 다른 row를 편집 중이면 경고
    if (editingRowId) {
      toast.warning('현재 편집 중인 항목을 먼저 저장하거나 취소하세요.');
      return;
    }
    // AG Grid 편집 모드 시작
    if (event.rowIndex != null) {
      event.api.startEditingCell({ rowIndex: event.rowIndex, colKey: 'entityValue' });
    }
  };

  const handleRowDataUpdated = (event: RowDataUpdatedEvent<EntityValueListItem>) => {
    // 첫 번째 row가 temp_이고 편집 중이 아니면 편집 시작
    const firstRowNode = event.api.getDisplayedRowAtIndex(0);
    if (firstRowNode?.data?.entityValueId.startsWith('temp_') && !editingRowId) {
      event.api.startEditingCell({ rowIndex: 0, colKey: 'entityValue' });
    }
  };

  const handleRowEditingStarted = (event: RowEditingStartedEvent<EntityValueListItem>) => {
    setEditingRowId(event?.data?.entityValueId ?? null);
  };

  const handleRowEditingStopped = (event: RowEditingStoppedEvent<EntityValueListItem>) => {
    setEditingRowId(null);
    if (event.data?.entityValueId.startsWith('temp_')) {
      setRowData((prev) => prev.filter((row) => row.entityValueId !== event.data?.entityValueId));
    }
  };

  const handleAddNewRow = () => {
    if (editingRowId) {
      toast.warning('현재 편집 중인 항목을 먼저 저장하거나 취소하세요.');
      return;
    }
    gridApiRef.current?.paginationGoToFirstPage();
    const tempId = `temp_${Date.now()}`;
    const newRow: EntityValueListItem = {
      entityValueId: tempId,
      entityValue: '',
      entityType: 'SAME' as EntityType,
      entityTypeValues: '',
    };
    setRowData((prev) => [newRow, ...prev]);
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
    const isNewRow = originData.entityValueId.startsWith('temp_');
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
    gridApiRef.current?.redrawRows();
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
    { headerName: '대표값', field: 'entityValue', editable: true, maxWidth: 250 },
    {
      headerName: '타입',
      field: 'entityType',
      editable: true,
      maxWidth: 120,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['SAME', 'SYNONYMS', 'PATTERNS'],
      },
      cellRenderer: (params: { value: EntityType }) => {
        const type = params.value;
        if (!type) return null;
        return (
          <Tag color={ENTITY_TYPE_COLORS[type]} className="!m-0">
            {ENTITY_TYPE_LABELS[type]}
          </Tag>
        );
      },
    },
    {
      headerName: '유사어',
      field: 'entityTypeValues',
      editable: true,
      flex: 2,
      sortable: false,
    },
    {
      headerName: '',
      maxWidth: 100,
      sortable: false,
      filter: false,
      editable: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      cellRenderer: (params: ICellRendererParams<EntityValueListItem>) => {
        const { data } = params;
        if (!data) return null;
        if (editingRowId === data.entityValueId) {
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave(data);
                }}
              >
                <Check className="size-5 text-green-500 hover:text-green-600 hover:cursor-pointer" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelEditing();
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
              handleDelete(data);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
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
          rowData={rowData}
          columnDefs={columnDefs}
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
          onRowDataUpdated={handleRowDataUpdated}
        />
      </div>
    </div>
  );
}
