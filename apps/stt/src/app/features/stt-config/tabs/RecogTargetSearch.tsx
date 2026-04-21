import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { PlayCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { recogQueryKeys, useAddRecogTarget, useSearchRecogTarget } from '../hooks/useRecogQueries';
import type { RecogTargetItem, RecogTargetSearchParams } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const IN_OUT_OPTIONS = [
  { label: '전체', value: '' },
  { label: 'I/B (인바운드)', value: '0' },
  { label: 'O/B (아웃바운드)', value: '1' },
];

const RXTX_OPTIONS = [
  { label: '전체', value: '' },
  { label: '통합', value: '9' },
  { label: '고객', value: '1' },
  { label: '상담원', value: '2' },
];

const ENGINE_OPTIONS = [
  { label: '전체', value: '' },
  { label: 'ENGINE#0', value: 'ENGINE0' },
  { label: 'ENGINE#1', value: 'ENGINE1' },
  { label: 'ENGINE#2', value: 'ENGINE2' },
];

const PAGE_SIZE = 10;

interface RegisterCellRendererParams extends ICellRendererParams<RecogTargetItem> {
  onRegister: (data: RecogTargetItem) => void;
}

function RegisterCellRenderer({ data, onRegister }: RegisterCellRendererParams) {
  if (!data) return null;
  return (
    <Button type="primary" size="small" onClick={() => onRegister(data)}>
      등록
    </Button>
  );
}

function PlayCellRenderer() {
  return (
    <button className="flex items-center justify-center text-blue-500 hover:text-blue-700">
      <PlayCircle size={18} />
    </button>
  );
}

interface RecogTargetSearchProps {
  groupCode: string;
}

export default function RecogTargetSearch({ groupCode }: RecogTargetSearchProps) {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0).second(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59).second(59));
  const [keyword, setKeyword] = useState('');
  const [inoutKind, setInoutKind] = useState('');
  const [ucidGkey, setUcidGkey] = useState('');
  const [dnNo, setDnNo] = useState('');
  const [rxtxKind, setRxtxKind] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [tenantId, setTenantId] = useState<string | undefined>();
  const [searchParams, setSearchParams] = useState<RecogTargetSearchParams | null>(null);

  const { data: rowData, isLoading } = useSearchRecogTarget({ params: searchParams as Record<string, unknown> });

  const { mutate: addTarget } = useAddRecogTarget({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogTargetList(groupCode).queryKey });
      },
      onError: () => {
        toast.error('등록에 실패했습니다.');
      },
    },
  });

  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }
    const startDateTime = startDate
      .hour(startTime?.hour() ?? 0)
      .minute(startTime?.minute() ?? 0)
      .second(startTime?.second() ?? 0);
    const endDateTime = endDate
      .hour(endTime?.hour() ?? 23)
      .minute(endTime?.minute() ?? 59)
      .second(endTime?.second() ?? 59);
    if (startDateTime.isAfter(endDateTime)) {
      toast.warning('시작일시가 종료일시보다 늦을 수 없습니다.');
      return;
    }
    setSearchParams({
      fromDateTime: startDate.format('YYYYMMDD') + (startTime?.format('HHmmss') ?? '000000'),
      toDateTime: endDate.format('YYYYMMDD') + (endTime?.format('HHmmss') ?? '235959'),
      keyword: keyword || undefined,
      inoutKind: inoutKind || undefined,
      ucidGkey: ucidGkey || undefined,
      dnNo: dnNo || undefined,
      rxtxKind: rxtxKind || undefined,
      engineCode: engineCode || undefined,
      tenantId: tenantId ? Number(tenantId) : undefined,
    });
  };

  const handleRegister = (data: RecogTargetItem) => {
    addTarget({ groupCode, ucidGkey: data.ucidGkey, sentence: data.sentence });
  };

  const columnDefs: ColDef<RecogTargetItem>[] = [
    {
      headerName: '',
      colId: 'play',
      maxWidth: 50,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: PlayCellRenderer,
    },
    { headerName: '고유번호(UCID)', field: 'ucidGkey', flex: 3, tooltipField: 'ucidGkey' },
    { headerName: '내선번호', field: 'dnNo', maxWidth: 110 },
    { headerName: '통화일시', field: 'callDatetime', flex: 2 },
    { headerName: '발화시간', field: 'talkTime', maxWidth: 100 },
    { headerName: '화자', field: 'rxtxKind', maxWidth: 90 },
    { headerName: '대표문장', field: 'sentence', flex: 4, tooltipField: 'sentence' },
    {
      headerName: '',
      colId: 'register',
      maxWidth: 80,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: RegisterCellRenderer,
      cellRendererParams: { onRegister: handleRegister },
    },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 1행: 검색일자 / 키워드 / IN/OUT 구분 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <DatePicker value={startDate} onChange={setStartDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          <TimePicker value={startTime} onChange={setStartTime} format="HH:mm:ss" allowClear={false} inputReadOnly style={{ width: 110 }} />
          <span className="text-[#495057]">-</span>
          <DatePicker value={endDate} onChange={setEndDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          <TimePicker value={endTime} onChange={setEndTime} format="HH:mm:ss" allowClear={false} inputReadOnly style={{ width: 110 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">키워드</span>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} placeholder="키워드를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">IN/OUT 구분</span>
          <Select value={inoutKind} onChange={setInoutKind} options={IN_OUT_OPTIONS} popupMatchSelectWidth={false} style={{ width: 160 }} />
        </div>
      </div>

      {/* 2행: 고유번호 / 내선 / 화자구분 / 엔진 / 테넌트 / 조회 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">고유번호</span>
          <Input value={ucidGkey} onChange={(e) => setUcidGkey(e.target.value)} onPressEnter={handleSearch} placeholder="고유번호를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">내선</span>
          <Input value={dnNo} onChange={(e) => setDnNo(e.target.value)} onPressEnter={handleSearch} placeholder="내선번호를 입력하세요" style={{ width: 160 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">화자구분</span>
          <Select value={rxtxKind} onChange={setRxtxKind} options={RXTX_OPTIONS} popupMatchSelectWidth={false} style={{ width: 120 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select value={engineCode} onChange={setEngineCode} options={ENGINE_OPTIONS} popupMatchSelectWidth={false} style={{ width: 120 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={tenantId} onChange={setTenantId} placeholder="테넌트 선택" popupMatchSelectWidth={false} style={{ width: 160 }} />
          <Button type="primary" onClick={handleSearch}>
            조회
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[200px]">
        <AgGridReact<RecogTargetItem>
          rowData={rowData ?? []}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, paginationPageSize: PAGE_SIZE }}
          loading={isLoading}
          sideBar={false}
        />
      </div>
    </div>
  );
}
