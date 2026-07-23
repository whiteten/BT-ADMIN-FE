import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type {
  CellDoubleClickedEvent,
  CellKeyDownEvent,
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
import { Button, Dropdown, Input, type InputRef, Select, Tag, Tooltip } from 'antd';
import { Check, ChevronDown, CloudDownload, Download, X } from 'lucide-react';
import { toast } from '@/shared-util';
import ExcelImportResultModal, { type ExcelImportResultModalRef } from '../components/ExcelImportResultModal';
import TrainDiffStatusBadge, { trainDiffStatusLabel } from '../components/TrainDiffStatusBadge';
import TrainStatusBadge, { trainStatusLabel } from '../components/TrainStatusBadge';
import { modelQueryKeys, useCreateKeyword, useDeleteKeyword, useExportKeyword, useGetKeywords, useImportKeyword, useUpdateKeyword } from '../hooks/useModelQueries';
import type { ExcelImportResult, KeywordListItem, TrainDiffStatus, TrainStatus } from '../types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import { IconTag, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const TEMP_ROW_PREFIX = 'temp_';
const KEYWORD_PATTERN = /^[가-힣][가-힣\s]*$/;

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

interface KeywordValuesCellRendererParams extends ICellRendererParams<KeywordListItem> {
  value: string;
}

const KeywordValuesCellRenderer = ({ value }: KeywordValuesCellRendererParams) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const values =
    value
      ?.split(',')
      .map((v) => v.trim())
      .filter(Boolean) ?? [];

  const TAG_GAP = 4;
  const MORE_TAG_WIDTH = 40;

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
      <div ref={measureRef} className="absolute invisible flex gap-1" aria-hidden="true">
        {values.map((v, index) => (
          <Tag key={index} color="default" variant="outlined" icon={<IconTag />} className="!inline-flex items-center !px-2 !py-1 !m-0 !bg-white">
            {v}
          </Tag>
        ))}
      </div>
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

interface ActionCellRendererParams extends ICellRendererParams<KeywordListItem> {
  editingRowId: string | null;
  onSave: (data: KeywordListItem) => void;
  onCancel: () => void;
  onDelete: (data: KeywordListItem) => void;
}

const ActionCellRenderer = (params: ActionCellRendererParams) => {
  const { data, editingRowId, onSave, onCancel, onDelete } = params;
  if (!data) return null;
  if (editingRowId === data.keywordId) {
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

export default function ModelKeywordList() {
  const { modelId = '' } = useParams();
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

  const [filterColumn, setFilterColumn] = useState('keyword');
  const [searchValue, setSearchValue] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const gridApiRef = useRef<GridApi<KeywordListItem> | null>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<ExcelImportResultModalRef>(null);

  const { data: keywordList, isLoading } = useGetKeywords({ params: { modelId }, queryOptions: { enabled: !!modelId } });

  const { mutate: createKeyword, isPending: isCreating } = useCreateKeyword({
    mutationOptions: {
      onSuccess: () => {
        toast.success('키워드가 추가되었습니다.');
        gridApiRef.current?.stopEditing();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getKeywords({ modelId }).queryKey });
      },
    },
  });

  const { mutate: updateKeyword, isPending: isUpdating } = useUpdateKeyword({
    mutationOptions: {
      onSuccess: () => {
        toast.success('키워드가 수정되었습니다.');
        gridApiRef.current?.stopEditing();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getKeywords({ modelId }).queryKey });
      },
    },
  });

  const { mutate: deleteKeyword, isPending: isDeleting } = useDeleteKeyword({
    mutationOptions: {
      onSuccess: () => {
        toast.success('키워드가 삭제되었습니다.');
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

  const getRowId = (params: GetRowIdParams<KeywordListItem>) => params.data.keywordId;

  const isExternalFilterPresent = () => searchValue.trim().length > 0;

  const doesExternalFilterPass = (node: IRowNode<KeywordListItem>) => {
    if (!node.data) return true;
    if (node.data.keywordId.startsWith(TEMP_ROW_PREFIX)) return true;
    const keyword = searchValue.toLowerCase();
    const value = node.data[filterColumn as keyof KeywordListItem];
    return String(value ?? '')
      .toLowerCase()
      .includes(keyword);
  };

  useEffect(() => {
    gridApiRef.current?.onFilterChanged();
  }, [searchValue, filterColumn]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleGridReady = (event: GridReadyEvent<KeywordListItem>) => {
    gridApiRef.current = event.api;
  };

  const handleCellDoubleClick = (event: CellDoubleClickedEvent<KeywordListItem>) => {
    if (!event.data) return;
    const rowId = event.data.keywordId;
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

  const handleRowEditingStarted = (event: RowEditingStartedEvent<KeywordListItem>) => {
    setEditingRowId(event?.data?.keywordId ?? null);
  };

  const handleRowEditingStopped = (event: RowEditingStoppedEvent<KeywordListItem>) => {
    const rowId = event.data?.keywordId;
    setEditingRowId(null);

    if (rowId?.startsWith(TEMP_ROW_PREFIX)) {
      event.api.applyTransaction({
        remove: [{ keywordId: rowId } as KeywordListItem],
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
    const newRow: KeywordListItem = {
      keywordId: tempId,
      keyword: '',
      keywordValues: '',
      trainStatus: 0,
      trainDiffStatus: null as unknown as TrainDiffStatus,
      changedYn: false,
      workTime: '',
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
            colKey: 'keyword',
          });
        }
      });
    }
  };

  const handleSave = (originData: KeywordListItem) => {
    const editingCells = gridApiRef.current?.getEditingCells() ?? [];
    const cellEditors = gridApiRef.current?.getCellEditorInstances() ?? [];
    const currentValues: Partial<KeywordListItem> = {};
    editingCells.forEach((cell, index) => {
      const colId = cell.colId as keyof KeywordListItem;
      const editor = cellEditors[index];
      if (editor && colId) {
        (currentValues as Record<string, unknown>)[colId] = editor.getValue();
      }
    });
    const requestData = {
      keyword: (currentValues.keyword ?? '').trim(),
      keywordValues: (currentValues.keywordValues ?? '').trim(),
    };
    if (!requestData.keyword) {
      toast.warning('키워드명을 입력하세요.');
      return;
    }
    if (!KEYWORD_PATTERN.test(requestData.keyword)) {
      toast.warning('키워드명은 한글과 공백만 입력 가능하며, 한글로 시작해야 합니다.');
      return;
    }
    const isNewRow = originData.keywordId.startsWith(TEMP_ROW_PREFIX);
    if (isNewRow) {
      createKeyword({ params: { modelId }, data: requestData });
    } else {
      updateKeyword({ params: { modelId, keywordId: originData.keywordId }, data: requestData });
    }
  };

  const handleCellKeyDown = (event: CellKeyDownEvent<KeywordListItem>) => {
    if ((event.event as KeyboardEvent)?.key === 'Enter' && editingRowId && event.data) {
      (event.event as KeyboardEvent).stopPropagation();
      handleSave(event.data);
    }
  };

  const cancelEditing = () => {
    gridApiRef.current?.stopEditing(true);
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleDelete = (data: KeywordListItem) => {
    modal.confirm.delete({
      onOk: () => deleteKeyword({ modelId, keywordId: data.keywordId }),
    });
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

  const columnDefs: ColDef<KeywordListItem>[] = [
    { headerName: 'ID', field: 'keywordId', hide: true },
    {
      headerName: '키워드명',
      field: 'keyword',
      editable: true,
      maxWidth: 300,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellEditor: InputTextCellEditor,
      cellEditorParams: { placeholder: '키워드명을 입력하세요.' },
      suppressKeyboardEvent: (params) => params.editing && params.event.key === 'Enter',
    },
    {
      headerName: '유사어',
      field: 'keywordValues',
      editable: true,
      flex: 2,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellEditor: InputTextCellEditor,
      cellEditorParams: { placeholder: '여러 단어는 콤마(,)로 구분해 입력하세요.' },
      suppressKeyboardEvent: (params) => params.editing && params.event.key === 'Enter',
      cellRenderer: KeywordValuesCellRenderer,
    },
    {
      headerName: '학습상태',
      field: 'trainStatus',
      maxWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      filterValueGetter: (params) => trainStatusLabel(params.data?.trainStatus as TrainStatus),
      cellRenderer: (params: ICellRendererParams<KeywordListItem>) => <TrainStatusBadge status={params.value as TrainStatus} showAlert={params.data?.changedYn} />,
    },
    {
      headerName: '변경이력',
      headerTooltip: '모델 학습이 완료된 이후, 변경사항이 있을 경우 표시됩니다. 다음 모델 학습 완료시, 이력은 초기화됩니다.',
      field: 'trainDiffStatus',
      maxWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      filterValueGetter: (params) => trainDiffStatusLabel(params.data?.trainDiffStatus as TrainDiffStatus),
      cellRenderer: (params: ICellRendererParams<KeywordListItem>) => <TrainDiffStatusBadge status={params.value as TrainDiffStatus} />,
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
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '키워드명', value: 'keyword' },
              { label: '유사어', value: 'keywordValues' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" onClick={() => importModalRef.current?.open()}>
            Import
          </Button>
          <Dropdown menu={exportMenu} trigger={['click']} placement="bottomRight">
            <Button color="cyan" variant="solid" loading={isExporting} icon={<Download className="size-4" />}>
              Export
              <ChevronDown className="size-4" />
            </Button>
          </Dropdown>
          <Button variant="solid" color="primary" onClick={handleAddNewRow} loading={isCreating}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<KeywordListItem>
          rowData={keywordList ?? []}
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
          onCellKeyDown={handleCellKeyDown}
        />
      </div>
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
