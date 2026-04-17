import { useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { PlayCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetTenants } from '../../stt-search/hooks/useSttQueries';
import { useGetTrainingList, useRegisterTraining } from '../hooks/useTrainingQueries';
import type { TrainingItem, TrainingSearchParams } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const IN_OUT_OPTIONS = [
  { label: '전체', value: '' },
  { label: 'I/B (인바운드)', value: 'IB' },
  { label: 'O/B (아웃바운드)', value: 'OB' },
];

const SPEAKER_OPTIONS = [
  { label: '전체', value: '' },
  { label: '상담원', value: 'agent' },
  { label: '고객', value: 'customer' },
];

const PAGE_SIZE = 10;

interface RegisterCellRendererParams extends ICellRendererParams<TrainingItem> {
  onRegister: (data: TrainingItem) => void;
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

export default function ConfidenceLearning() {
  const { gridOptions } = useAggridOptions();

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0).second(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59).second(59));
  const [keyword, setKeyword] = useState('');
  const [inOutType, setInOutType] = useState('');
  const [ucid, setUcid] = useState('');
  const [extension, setExtension] = useState('');
  const [speakerType, setSpeakerType] = useState('');
  const [tenantId, setTenantId] = useState<string | undefined>();

  const { data: tenants } = useGetTenants({});
  const tenantOptions = tenants?.map((t) => ({ label: t.tenantName, value: String(t.tenantId) })) ?? [];

  const buildParams = (): TrainingSearchParams => ({
    startDate: startDate ? startDate.format('YYYYMMDD') : undefined,
    startTime: startTime ? startTime.format('HHmmss') : undefined,
    endDate: endDate ? endDate.format('YYYYMMDD') : undefined,
    endTime: endTime ? endTime.format('HHmmss') : undefined,
    keyword: keyword || undefined,
    inOutType: inOutType || undefined,
    ucid: ucid || undefined,
    extension: extension || undefined,
    speakerType: speakerType || undefined,
    tenantId: tenantId,
  });

  const [searchParams, setSearchParams] = useState<TrainingSearchParams>({});

  const {
    data: rowData,
    isLoading,
    refetch,
  } = useGetTrainingList({
    params: searchParams as Record<string, unknown>,
    queryOptions: { enabled: false },
  });

  const { mutate: registerTraining } = useRegisterTraining({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
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
    if (startDate.isAfter(endDate)) {
      toast.warning('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }
    setSearchParams(buildParams());
    setTimeout(() => refetch(), 0);
  };

  const handleRegister = (data: TrainingItem) => {
    registerTraining({ ucid: data.ucid, sentence: data.sentence, confidence: data.confidence });
  };

  const columnDefs: ColDef<TrainingItem>[] = [
    {
      headerName: '',
      colId: 'play',
      maxWidth: 50,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: PlayCellRenderer,
    },
    {
      headerName: '고유번호(UCID)',
      field: 'ucid',
      flex: 3,
      tooltipField: 'ucid',
    },
    {
      headerName: '내선번호',
      field: 'extension',
      maxWidth: 110,
      flex: 1,
    },
    {
      headerName: '통화일시',
      field: 'callDate',
      flex: 2,
    },
    {
      headerName: '발화시간',
      field: 'callDuration',
      maxWidth: 100,
      flex: 1,
    },
    {
      headerName: '화자',
      field: 'speaker',
      maxWidth: 90,
      flex: 1,
    },
    {
      headerName: '신뢰도',
      field: 'confidence',
      maxWidth: 90,
      flex: 1,
    },
    {
      headerName: '대표문장',
      field: 'sentence',
      flex: 4,
      tooltipField: 'sentence',
    },
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
    <div className="flex flex-col gap-4 h-full">
      {/* 제목 */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-base">신뢰도별 학습</span>
        <span className="text-sm text-blue-500">신뢰도 95 이하로 조회됩니다.</span>
      </div>

      {/* 검색 필터 */}
      <div className="flex flex-col gap-3">
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
            <Select value={inOutType} onChange={setInOutType} options={IN_OUT_OPTIONS} popupMatchSelectWidth={false} style={{ width: 180 }} />
          </div>
        </div>

        {/* 2행: 고유번호 / 내선 / 화자구분 / 테넌트 / 조회 */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#495057] shrink-0">고유번호</span>
            <Input value={ucid} onChange={(e) => setUcid(e.target.value)} onPressEnter={handleSearch} placeholder="고유번호를 입력하세요" style={{ width: 200 }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#495057] shrink-0">내선</span>
            <Input value={extension} onChange={(e) => setExtension(e.target.value)} onPressEnter={handleSearch} placeholder="내선번호를 입력하세요" style={{ width: 160 }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#495057] shrink-0">화자구분</span>
            <Select value={speakerType} onChange={setSpeakerType} options={SPEAKER_OPTIONS} popupMatchSelectWidth={false} style={{ width: 120 }} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={tenantId} onChange={setTenantId} options={tenantOptions} placeholder="기본테넌트" allowClear popupMatchSelectWidth={false} style={{ width: 160 }} />
            <Button type="primary" onClick={handleSearch}>
              조회
            </Button>
          </div>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<TrainingItem>
          rowData={rowData ?? []}
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
