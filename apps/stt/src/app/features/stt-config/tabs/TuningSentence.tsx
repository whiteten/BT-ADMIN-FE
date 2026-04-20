import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Bookmark, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { trainingQueryKeys, useDeleteTuningSentence, useGetTuningSentenceList } from '../hooks/useTrainingQueries';
import type { TuningSentenceItem, TuningSentenceSearchParams } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const TUNING_OPTIONS = [
  { label: '전체', value: '' },
  { label: '반영', value: '0' },
  { label: '미반영', value: '1' },
];

// TODO 공통 데이터 조회
const ENGINE_OPTIONS = [
  { label: '전체', value: '' },
  { label: 'ENGINE#0', value: 'ENGINE0' },
  { label: 'ENGINE#1', value: 'ENGINE1' },
];

const PAGE_SIZE = 10;

interface ActionCellRendererParams {
  data?: TuningSentenceItem;
  onDelete: (id: number) => void;
}

interface BookmarkCellRendererParams {
  data?: TuningSentenceItem;
}

function BookmarkCellRenderer({ data }: BookmarkCellRendererParams) {
  const filled = data?.tuningKind === '0';
  return (
    <button className="flex items-center justify-center">
      <Bookmark size={15} className={filled ? 'text-blue-500 fill-blue-500' : 'text-gray-400'} />
    </button>
  );
}

function ActionCellRenderer({ data, onDelete }: ActionCellRendererParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data.dataKey)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function TuningSentence() {
  const { gridOptions } = useAggridOptions();
  const modal = useModal();
  const queryClient = useQueryClient();

  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs());
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [keyword, setKeyword] = useState('');
  const [tuningKind, setTuningKind] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [searchParams, setSearchParams] = useState<TuningSentenceSearchParams>({
    fromDate: dayjs().format('YYYYMMDD'),
    toDate: dayjs().format('YYYYMMDD'),
  });

  const {
    data: rowData = [],
    isLoading,
    refetch,
  } = useGetTuningSentenceList({
    params: searchParams as Record<string, unknown>,
  });

  const { mutate: deleteItem } = useDeleteTuningSentence({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trainingQueryKeys.getTuningSentenceList(searchParams).queryKey });
      },
    },
  });

  const handleSearch = () => {
    if (!fromDate || !toDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }
    if (fromDate.isAfter(toDate)) {
      toast.warning('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }
    const next = {
      fromDate: fromDate.format('YYYYMMDD'),
      toDate: toDate.format('YYYYMMDD'),
      keyword: keyword || undefined,
      tuningKind: tuningKind || undefined,
      engineCode: engineCode || undefined,
    };
    setSearchParams(next);
    setTimeout(() => refetch(), 0);
  };

  const handleDelete = (id: number) => {
    modal.confirm.delete({ onOk: () => deleteItem(id) });
  };

  const columnDefs: ColDef<TuningSentenceItem>[] = [
    {
      headerName: '',
      colId: 'bookmark',
      maxWidth: 50,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: BookmarkCellRenderer,
    },
    {
      headerName: 'TEXT',
      field: 'trString',
      flex: 4,
      tooltipField: 'trString',
    },
    {
      headerName: '등록일',
      field: 'workTime',
      flex: 2,
    },
    {
      headerName: '',
      colId: 'actions',
      maxWidth: 60,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: ActionCellRenderer,
      cellRendererParams: { onDelete: handleDelete },
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 검색 필터 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <DatePicker value={fromDate} onChange={setFromDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          <span className="text-[#495057]">-</span>
          <DatePicker value={toDate} onChange={setToDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">키워드</span>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} placeholder="키워드를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">반영여부</span>
          <Select value={tuningKind} onChange={setTuningKind} options={TUNING_OPTIONS} style={{ width: 120 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select value={engineCode} onChange={setEngineCode} options={ENGINE_OPTIONS} popupMatchSelectWidth={false} style={{ width: 120 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button type="primary" onClick={handleSearch}>
            조회
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<TuningSentenceItem>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            paginationPageSize: PAGE_SIZE,
          }}
          loading={isLoading}
          sideBar={false}
        />
      </div>
    </div>
  );
}
