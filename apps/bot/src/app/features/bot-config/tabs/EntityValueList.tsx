import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { Button, Input, type InputRef, Select, Tag } from 'antd';
import { Check, X } from 'lucide-react';
import { toast } from '@/shared-util';
import TrainDiffStatusBadge from '../components/TrainDiffStatusBadge';
import TrainStatusBadge from '../components/TrainStatusBadge';
import { modelQueryKeys, useCreateEntityValue, useDeleteEntityValue, useGetEntityValues, useUpdateEntityValue } from '../hooks/useModelQueries';
import type { EntityType, EntityValueListItem, TrainDiffStatus, TrainStatus } from '../types';
import { IconTag, IconTrash } from '@/components/custom/Icons';
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
  cellStartedEdit?: boolean;
}

const SelectCellEditor = ({ value = '', onValueChange, options = [], cellStartedEdit }: SelectCellEditorProps) => {
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cellStartedEdit) {
      selectRef.current?.querySelector('input')?.focus();
    }
  }, [cellStartedEdit]);

  return (
    <div ref={selectRef} className="w-full">
      <Select value={value || undefined} onChange={onValueChange} options={options} className="w-full" />
    </div>
  );
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

interface EntityTypeValuesCellRendererParams extends ICellRendererParams<EntityValueListItem> {
  value: string;
}

const EntityTypeValuesCellRenderer = ({ value }: EntityTypeValuesCellRendererParams) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const parseValues = (value: string | undefined) =>
    value
      ?.split(',')
      .map((v) => v.trim())
      .filter(Boolean) ?? [];

  const values = parseValues(value);

  const TAG_GAP = 4; // gap-1 = 0.25rem = 4px
  const MORE_TAG_WIDTH = 40; // "+N" 태그 예상 너비

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureContainer = measureRef.current;
    if (!container || !measureContainer) return;

    const tagElements = measureContainer.children;
    if (tagElements.length === 0) return;

    const calculateVisibleCount = () => {
      const containerWidth = container.offsetWidth;
      let totalWidth = 0;
      let count = 0;

      for (let i = 0; i < tagElements.length; i++) {
        const tagWidth = (tagElements[i] as HTMLElement).offsetWidth;
        const widthWithGap = i === 0 ? tagWidth : tagWidth + TAG_GAP;
        const remainingTags = tagElements.length - (i + 1);
        const needsMoreTag = remainingTags > 0;
        const reservedWidth = needsMoreTag ? MORE_TAG_WIDTH + TAG_GAP : 0;

        if (totalWidth + widthWithGap + reservedWidth <= containerWidth) {
          totalWidth += widthWithGap;
          count++;
        } else {
          break;
        }
      }

      setVisibleCount(count > 0 ? count : 1);
    };

    const resizeObserver = new ResizeObserver(calculateVisibleCount);
    resizeObserver.observe(container);
    calculateVisibleCount();

    return () => resizeObserver.disconnect();
  }, [value]);

  if (!value) return null;

  const hiddenCount = visibleCount !== null ? values.length - visibleCount : 0;

  return (
    <>
      {/* 측정용 숨겨진 컨테이너 */}
      <div ref={measureRef} className="absolute invisible flex gap-1" aria-hidden="true">
        {values.map((v, index) => (
          <Tag key={index} color="default" variant="outlined" icon={<IconTag />} className="!inline-flex items-center !px-2 !py-1 !m-0 !bg-white">
            {v}
          </Tag>
        ))}
      </div>
      {/* 실제 표시 컨테이너 */}
      <div ref={containerRef} className="flex items-center gap-1 w-full overflow-hidden">
        {values.slice(0, visibleCount ?? values.length).map((v, index) => (
          <Tag key={index} color="default" variant="outlined" icon={<IconTag />} className="!inline-flex items-center !px-2 !py-1 !m-0 !bg-white shrink-0">
            {v}
          </Tag>
        ))}
        {hiddenCount > 0 && (
          <Tag color="default" className="!inline-flex items-center !px-2 !py-1 !m-0 shrink-0 !rounded-[14px] !text-[#888B9A]">
            +{hiddenCount}
          </Tag>
        )}
      </div>
    </>
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
  const customGridOptions = useMemo(
    () => ({
      ...gridOptions,
      sideBar: false,
      editType: 'fullRow' as const,
      stopEditingWhenCellsLoseFocus: true,
      readOnlyEdit: true,
      suppressClickEdit: true,
    }),
    [gridOptions],
  );

  // State
  const [filterColumn, setFilterColumn] = useState('entityValue');
  const [searchValue, setSearchValue] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Refs
  const gridApiRef = useRef<GridApi<EntityValueListItem> | null>(null);

  // API Hooks
  const { data: entityValueList, isLoading } = useGetEntityValues({
    params: { modelId, entityId },
    queryOptions: { enabled: !!modelId && !!entityId && !editingRowId, refetchInterval: 5000 },
  });
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

  const handleCellDoubleClick = (event: CellDoubleClickedEvent<EntityValueListItem>) => {
    if (!event.data) return;
    const rowId = event.data.entityValueId;
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
      trainStatus: 0,
      trainDiffStatus: null as unknown as TrainDiffStatus,
    };
    const result = gridApiRef.current?.applyTransaction({
      add: [newRow],
      addIndex: 0,
    });
    if (result?.add?.[0]) {
      gridApiRef.current?.onFilterChanged();
      requestAnimationFrame(() => {
        const rowNode = gridApiRef.current?.getRowNode(tempId);
        if (rowNode?.rowIndex != null) {
          gridApiRef.current?.startEditingCell({
            rowIndex: rowNode.rowIndex,
            colKey: 'entityValue',
          });
        }
      });
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
    if (!requestData.entityType) {
      toast.warning('타입을 선택하세요.');
      return;
    }
    if (!requestData.entityTypeValues?.trim()) {
      toast.warning('유사어를 입력하세요.');
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
      cellEditor: SelectCellEditor,
      cellEditorParams: {
        options: [
          { label: '동의어', value: 'SAME' },
          { label: '유사어', value: 'SYNONYMS' },
          { label: '패턴형', value: 'PATTERNS' },
        ],
      },
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
      cellRenderer: EntityTypeValuesCellRenderer,
    },
    {
      headerName: '학습상태',
      field: 'trainStatus',
      maxWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: { value: number; data: EntityValueListItem }) => <TrainStatusBadge status={params.value as TrainStatus} />,
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
          gridOptions={customGridOptions}
          loading={isLoading || isUpdating || isDeleting}
          onGridReady={handleGridReady}
          onCellDoubleClicked={handleCellDoubleClick}
          onRowEditingStarted={handleRowEditingStarted}
          onRowEditingStopped={handleRowEditingStopped}
        />
      </div>
    </div>
  );
}
