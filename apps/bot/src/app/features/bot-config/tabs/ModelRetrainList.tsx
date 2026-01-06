import { useEffect, useMemo, useRef, useState } from 'react';
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
import { DatePicker, Divider, Input, type InputRef, Radio, Select, Slider, Tag, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { debounce } from 'lodash';
import { Check, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { ReactComponent as IconLinkIfe } from '../../../../assets/images/icon/icon-link-ife.svg';
import { modelQueryKeys, useGetIntents, useGetRetrains, useUpdateRetrain } from '../hooks/useModelQueries';
import type { RetrainListItem } from '../types/retrain';
import { IconBookmark, IconSearch, IconTag } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// Row ID 생성 헬퍼 함수
const createRowId = (data: RetrainListItem) => `${data.ucidGkey}_${data.hop}_${data.questionSeq}`;

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

interface TagsCellRendererProps {
  value: string[];
}

const TagsCellRenderer = ({ value }: TagsCellRendererProps) => {
  const tags = value ?? [];
  if (!tags.length) return null;

  return (
    <div className="flex items-center gap-1">
      {tags.slice(0, 2).map((tag, i) => (
        <Tag key={i} color="default" variant="outlined" icon={<IconTag />} className="!inline-flex items-center !px-2 !py-1 !m-0 !bg-white shrink-0">
          {tag}
        </Tag>
      ))}
    </div>
  );
};

interface ActionCellRendererParams extends ICellRendererParams<RetrainListItem> {
  editingRowId: string | null;
  onSave: (data: RetrainListItem) => void;
  onCancel: () => void;
}

const ActionCellRenderer = (params: ActionCellRendererParams) => {
  const { data, editingRowId, onSave, onCancel } = params;
  if (!data) return null;

  const rowId = createRowId(data);

  if (editingRowId === rowId) {
    return (
      <div className="flex items-center gap-3">
        <Tooltip title="저장">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave(data);
            }}
          >
            <Check className="size-5 text-green-500 hover:text-green-600 hover:cursor-pointer" />
          </button>
        </Tooltip>
        <Tooltip title="취소">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            <X className="size-5 text-gray-500 hover:text-gray-600 hover:cursor-pointer" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <Tooltip title="상세보기">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconSearch className="size-5 text-[#888B9A] hover:cursor-pointer" />
        </button>
      </Tooltip>
      <Divider orientation="vertical" />
      <Tooltip title="편집기 실행">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconLinkIfe className="hover:cursor-pointer" />
        </button>
      </Tooltip>
      {data.status !== 2 && (
        <>
          <Divider orientation="vertical" />
          <Tooltip title="반영하기">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <IconBookmark className="size-5 hover:cursor-pointer" fill="var(--color-bt-primary)" color="var(--color-bt-primary)" />
            </button>
          </Tooltip>
        </>
      )}
    </div>
  );
};

export default function ModelRetrainList() {
  const { modelId = '' } = useParams();
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const { RangePicker } = DatePicker;
  // State
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 100]);
  const [successFilter, setSuccessFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Refs
  const gridApiRef = useRef<GridApi<RetrainListItem> | null>(null);

  // API Hooks
  const { data: retrainList, isFetching } = useGetRetrains({
    params: {
      modelId,
      startDate: dateRange[0].format('YYYYMMDD'),
      endDate: dateRange[1].format('YYYYMMDD'),
    },
    queryOptions: { enabled: !!modelId },
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

  const { mutate: updateRetrain, isPending: isUpdating } = useUpdateRetrain({
    mutationOptions: {
      onSuccess: () => {
        toast.success('재학습 데이터가 수정되었습니다.');
        gridApiRef.current?.stopEditing();
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getRetrains({ modelId }).queryKey });
      },
    },
  });

  // Row ID 생성 (복합키)
  const getRowId = (params: GetRowIdParams<RetrainListItem>) => createRowId(params.data);

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates?.[0] && dates?.[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  // Debounce된 신뢰구간 상태 변경 함수
  const debouncedSetConfidenceRange = useMemo(() => debounce(setConfidenceRange, 300), []);

  // 외부 필터 활성화
  const isExternalFilterPresent = () => true;

  // 각 row가 검색 조건을 만족하는지 확인
  const doesExternalFilterPass = (node: IRowNode<RetrainListItem>) => {
    if (!node.data) return true;

    // 신뢰구간 필터
    const confidence = node.data.confidence;
    const [minConf, maxConf] = confidenceRange;
    const isInConfRange = confidence >= minConf && confidence <= maxConf;

    // 인식결과 필터
    const isSuccessMatch = successFilter === null || node.data.isSuccess === successFilter;

    // 반영여부 필터
    const isStatusMatch = statusFilter === null || node.data.status === statusFilter;

    return isInConfRange && isSuccessMatch && isStatusMatch;
  };

  // 필터 조건 변경 시 필터 적용
  useEffect(() => {
    gridApiRef.current?.onFilterChanged();
  }, [confidenceRange, successFilter, statusFilter]);

  const handleGridReady = (event: GridReadyEvent<RetrainListItem>) => {
    gridApiRef.current = event.api;
  };

  const handleCellDoubleClick = (event: CellDoubleClickedEvent<RetrainListItem>) => {
    if (!event.data) return;
    const rowId = createRowId(event.data);
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

  const handleRowEditingStarted = (event: RowEditingStartedEvent<RetrainListItem>) => {
    if (!event.data) return;
    setEditingRowId(createRowId(event.data));
  };

  const handleRowEditingStopped = (event: RowEditingStoppedEvent<RetrainListItem>) => {
    if (!event.data) return;
    setEditingRowId(null);
  };

  const handleSave = (originData: RetrainListItem) => {
    const editingCells = gridApiRef.current?.getEditingCells() ?? [];
    const cellEditors = gridApiRef.current?.getCellEditorInstances() ?? [];
    const currentValues: Partial<RetrainListItem> = {};
    editingCells.forEach((cell, index) => {
      const colId = cell.colId as keyof RetrainListItem;
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

    updateRetrain({
      params: { modelId, questionSeq: originData.questionSeq, ucidGkey: originData.ucidGkey, hop: originData.hop },
      data: requestData,
    });
  };

  const cancelEditing = () => {
    gridApiRef.current?.stopEditing(true);
  };

  const columnDefs: ColDef<RetrainListItem>[] = [
    { field: 'questionSeq', hide: true },
    { field: 'scnId', hide: true },
    { field: 'ucidGkey', hide: true },
    { field: 'hop', hide: true },
    {
      headerName: '사용자발화',
      field: 'question',
      editable: (params) => params.data?.status !== 2,
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellEditor: InputTextCellEditor,
      cellEditorParams: { placeholder: '사용자발화 값을 입력하세요.' },
    },
    {
      headerName: '인식의도',
      field: 'intent',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '신뢰도',
      field: 'confidence',
      maxWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => `${params.value}%`,
    },
    {
      headerName: '인식결과',
      field: 'isSuccess',
      maxWidth: 100,
      cellRenderer: (params: ICellRendererParams<RetrainListItem>) => {
        if (!params.data) return null;
        const isSuccess = params.data.isSuccess === 1;
        return (
          <Badge variant="secondary" className={cn('text-[13px] font-medium !h-6', isSuccess ? 'text-[#0AB39C] bg-[#0AB39C1A]' : 'text-[#F06548] bg-[#F065481A]')}>
            {isSuccess ? '성공' : '실패'}
          </Badge>
        );
      },
    },
    {
      headerName: '정답의도',
      field: 'answer',
      editable: (params) => params.data?.status !== 2,
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellEditor: SelectCellEditor,
      cellEditorParams: {
        options: intentOptions,
        placeholder: '정답의도를 선택하세요.',
      },
    },
    {
      headerName: '처리일시',
      field: 'dbInsertTime',
      maxWidth: 180,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '개체정보',
      field: 'tags',
      flex: 1,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => params.value?.join(', ') ?? '',
      cellRenderer: TagsCellRenderer,
    },
    {
      headerName: '반영여부',
      field: 'status',
      maxWidth: 80,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<RetrainListItem>) => {
        if (!params.data) return null;
        const status = params.data.status;
        return <IconBookmark className="size-5" fill={status === 2 ? 'var(--color-bt-primary)' : 'none'} color={status === 2 ? 'var(--color-bt-primary)' : '#495057'} />;
      },
    },
    {
      headerName: '',
      colId: 'actions',
      maxWidth: 120,
      sortable: false,
      filter: false,
      editable: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      cellRendererParams: {
        editingRowId,
        onSave: handleSave,
        onCancel: cancelEditing,
      },
      cellRenderer: ActionCellRenderer,
    },
  ];

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-[#495057] shrink-0">검색일자</span>
            <RangePicker value={dateRange} onChange={handleDateRangeChange} disabledDate={(current) => current > dayjs().endOf('day')} inputReadOnly allowClear={false} />
            <Divider orientation="vertical" className="!h-5 !m-0" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-[#495057] shrink-0">신뢰구간</span>
            <Slider
              range
              min={0}
              max={100}
              step={1}
              defaultValue={[0, 100]}
              onChange={(value) => debouncedSetConfidenceRange(value as [number, number])}
              tooltip={{ formatter: (value) => `${value}%` }}
              className="!w-[200px]"
            />
            <Divider orientation="vertical" className="!h-5 !m-0" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-[#495057] shrink-0">인식결과</span>
            <Radio.Group
              value={successFilter}
              onChange={(e) => setSuccessFilter(e.target.value)}
              options={[
                { label: '전체', value: null },
                { label: '성공', value: 1 },
                { label: '실패', value: 0 },
              ]}
            />
            <Divider orientation="vertical" className="!h-5 !m-0" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-[#495057] shrink-0">반영여부</span>
            <Radio.Group
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { label: '전체', value: null },
                { label: '반영', value: 2 },
                { label: '미반영', value: 1 },
              ]}
            />
          </div>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<RetrainListItem>
          rowData={retrainList ?? []}
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
          loading={isFetching || isUpdating}
          onGridReady={handleGridReady}
          onCellDoubleClicked={handleCellDoubleClick}
          onRowEditingStarted={handleRowEditingStarted}
          onRowEditingStopped={handleRowEditingStopped}
        />
      </div>
    </div>
  );
}
