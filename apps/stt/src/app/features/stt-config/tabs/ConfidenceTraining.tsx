import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowEditingStartedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { PlayCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetTenants } from '../hooks/useCommonQueries';
import { trainingQueryKeys, useCreateConfidenceTraining, useGetTrainingList } from '../hooks/useTrainingQueries';
import type { ConfidenceTrainingItem, ConfidenceTrainingSearchParams } from '../types';
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
];

const PAGE_SIZE = 10;
const CONFIDENCE_THRESHOLD = 95;

interface RegisterCellRendererParams extends ICellRendererParams<ConfidenceTrainingItem> {
  onRegister: (data: ConfidenceTrainingItem) => void;
}

function CreateCellRenderer({ data, onRegister }: RegisterCellRendererParams) {
  if (!data) return null;
  return (
    <Button type="primary" size="small" onClick={() => onRegister(data)} style={{ height: 26 }}>
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

export default function ConfidenceTraining() {
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const gridRef = useRef<AgGridReact<ConfidenceTrainingItem>>(null);

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0).second(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(23).minute(59).second(59));
  const [keyword, setKeyword] = useState('');
  const [inoutKind, setInOutKind] = useState('');
  const [ucidGkey, setUcidGkey] = useState('');
  const [dnNo, setDnNo] = useState('');
  const [rxtxKind, setRxtxKind] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [tenantId, setTenantId] = useState<string | undefined>();

  const { data: tenants } = useGetTenants({});
  const tenantOptions = tenants?.map((t) => ({ label: t.tenantName, value: String(t.tenantId) })) ?? [];

  useEffect(() => {
    if (tenants && tenants.length > 0) {
      const firstTenantId = String(tenants[0].tenantId);
      setTenantId((prev) => {
        const resolved = prev ?? firstTenantId;
        setSearchParams({
          fromDateTime: dayjs().format('YYYYMMDD') + '000000',
          toDateTime: dayjs().format('YYYYMMDD') + '235959',
          tenantId: Number(resolved),
          confidence: CONFIDENCE_THRESHOLD,
        });
        return resolved;
      });
    }
  }, [tenants]);

  const buildParams = (): ConfidenceTrainingSearchParams => ({
    fromDateTime: startDate && startTime ? startDate.format('YYYYMMDD') + startTime.format('HHmmss') : undefined,
    toDateTime: endDate && endTime ? endDate.format('YYYYMMDD') + endTime.format('HHmmss') : undefined,
    keyword: keyword || undefined,
    inoutKind: inoutKind || undefined,
    ucidGkey: ucidGkey || undefined,
    dnNo: dnNo || undefined,
    rxtxKind: rxtxKind || undefined,
    engineCode: engineCode || undefined,
    tenantId: tenantId,
    confidence: CONFIDENCE_THRESHOLD,
  });

  const [searchParams, setSearchParams] = useState<ConfidenceTrainingSearchParams | null>(null);

  const { data: rowData, isLoading } = useGetTrainingList({
    params: searchParams as Record<string, unknown>,
    queryOptions: { enabled: !!searchParams },
  });

  const { mutate: createConfidenceTraining } = useCreateConfidenceTraining({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: trainingQueryKeys.getTrainingList(searchParams ?? undefined).queryKey });
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
    setSearchParams(buildParams());
  };

  const handleAdd = (data: ConfidenceTrainingItem, editedSentence?: string) => {
    createConfidenceTraining({
      ucidGkey: data.ucidGkey,
      armsoffset: data.armsoffset,
      rxtxKind: data.rxtxKind,
      trString: editedSentence ?? data.sentence,
      tenantId: searchParams?.tenantId,
      engineCode: data.engineCode,
    });
    gridRef.current?.api?.stopEditing();
  };

  const handleRowEditingStarted = (event: RowEditingStartedEvent<ConfidenceTrainingItem>) => {
    event.api.refreshCells({ rowNodes: [event.node], force: true });
  };

  const columnDefs: ColDef<ConfidenceTrainingItem>[] = [
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
      field: 'ucidGkey',
      flex: 3,
      tooltipField: 'ucidGkey',
    },
    {
      headerName: '내선번호',
      field: 'dnNo',
      maxWidth: 110,
      flex: 1,
    },
    {
      headerName: '통화일시',
      field: 'callDatetime',
      flex: 2,
    },
    {
      headerName: '발화시간',
      field: 'talkTime',
      maxWidth: 100,
      flex: 1,
      valueFormatter: (params) => (params.value != null ? `${params.value}초` : ''),
    },
    {
      headerName: '화자',
      field: 'rxtxKind',
      maxWidth: 90,
      flex: 1,
      valueFormatter: (params) => ({ '1': '고객', '2': '상담원', '9': '통합' })[String(params.value)] ?? params.value,
    },
    {
      headerName: '신뢰도',
      field: 'confidence',
      maxWidth: 90,
      flex: 1,
    },
    {
      headerName: '대화내용',
      field: 'sentence',
      flex: 4,
      tooltipField: 'sentence',
      editable: true,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: { useFormatter: true },
    },
    {
      headerName: '',
      colId: 'create',
      maxWidth: 80,
      sortable: false,
      filter: false,
      editable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: CreateCellRenderer,
      cellRendererParams: { onRegister: (data: ConfidenceTrainingItem) => handleAdd(data) },
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
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
            <Select value={inoutKind} onChange={setInOutKind} options={IN_OUT_OPTIONS} popupMatchSelectWidth={false} style={{ width: 180 }} />
          </div>
        </div>

        {/* 2행: 고유번호 / 내선 / 화자구분 / 테넌트 / 조회 */}
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
            <Select value={tenantId} onChange={setTenantId} options={tenantOptions} placeholder="기본테넌트" popupMatchSelectWidth={false} style={{ width: 160 }} />
            <Button type="primary" onClick={handleSearch}>
              조회
            </Button>
          </div>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[300px]">
        <AgGridReact<ConfidenceTrainingItem>
          ref={gridRef}
          rowData={rowData ?? []}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            paginationPageSize: PAGE_SIZE,
            editType: 'fullRow',
            suppressClickEdit: false,
          }}
          onRowEditingStarted={handleRowEditingStarted}
          loading={isLoading}
          sideBar={false}
        />
      </div>
    </div>
  );
}
