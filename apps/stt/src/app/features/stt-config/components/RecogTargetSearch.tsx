import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowEditingStartedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { PlayCircle, StopCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetTenants } from '../hooks/useCommonQueries';
import { recogQueryKeys, useCreateRecogTarget, useGetRecogTargetSearch } from '../hooks/useRecogQueries';
import { useGetSttSearchListen } from '../hooks/useSearchQueries';
import type { RecogTargetSearchItem, RecogTargetSearchParams, SttSearchListenParams } from '../types';
import { cn } from '@/lib/utils';
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

const PAGE_SIZE = 20;
const RXTX_LISTEN_TYPE: Record<string, string> = { '1': '4', '2': '5', '9': '3' };

interface RegisterCellRendererParams extends ICellRendererParams<RecogTargetSearchItem> {
  onRegister: (data: RecogTargetSearchItem) => void;
}

function CreateCellRenderer({ data, onRegister }: RegisterCellRendererParams) {
  if (!data) return null;
  return (
    <Button type="primary" size="small" onClick={() => onRegister(data)} style={{ height: 26 }}>
      등록
    </Button>
  );
}

function PlayCellRenderer({ data }: ICellRendererParams<RecogTargetSearchItem>) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const listenParams: SttSearchListenParams | undefined =
    data?.recSystemIp && data.saFilename
      ? {
          recSystemIp: data.recSystemIp,
          request: {
            saFilepath: data.saFilepath ?? '',
            saFilename: data.saFilename,
            saFileformat: '1',
            playerWidth: '800',
            type: RXTX_LISTEN_TYPE[data.rxtxKind] ?? '3',
          },
        }
      : undefined;

  const { data: listenData } = useGetSttSearchListen({
    params: listenParams as unknown as Record<string, unknown>,
    queryOptions: { enabled: playing && !!listenParams, staleTime: Infinity },
  });

  useEffect(() => {
    if (!listenData?.audioBlob || !playing || !data) return;

    const url = URL.createObjectURL(listenData.audioBlob);
    const audio = new Audio(url);
    audio.currentTime = data.armsoffset / 1000;
    void audio.play();
    audioRef.current = audio;

    const endSec = data.endoffset / 1000;
    const handleTimeUpdate = () => {
      if (audio.currentTime >= endSec) {
        audio.pause();
        setPlaying(false);
      }
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', () => setPlaying(false));

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
  }, [listenData?.audioBlob, playing, data]);

  const handleClick = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  };

  if (!data?.recSystemIp) return null;

  return (
    <button
      onClick={handleClick}
      className={cn('flex items-center justify-center transition-colors', playing ? 'text-red-500 hover:text-red-700' : 'text-blue-500 hover:text-blue-700')}
    >
      {playing ? <StopCircle size={18} /> : <PlayCircle size={18} />}
    </button>
  );
}

interface RecogTargetSearchProps {
  groupCode: string;
  engineCode?: string;
}

export default function RecogTargetSearch({ groupCode, engineCode }: RecogTargetSearchProps) {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<RecogTargetSearchItem>>(null);

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().subtract(3, 'hour').startOf('hour'));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().startOf('hour'));
  const [keyword, setKeyword] = useState('');
  const [inoutKind, setInoutKind] = useState('');
  const [ucidGkey, setUcidGkey] = useState('');
  const [dnNo, setDnNo] = useState('');
  const [rxtxKind, setRxtxKind] = useState('');
  const [tenantId, setTenantId] = useState<string | undefined>();
  const [searchParams, setSearchParams] = useState<RecogTargetSearchParams | null>(null);

  const { data: tenants } = useGetTenants({});
  const tenantOptions = tenants?.map((t) => ({ label: t.tenantName, value: String(t.tenantId) })) ?? [];

  useEffect(() => {
    if (!tenants?.length) return;
    setTenantId((prev) => prev ?? String(tenants[0].tenantId));
  }, [tenants]);

  useEffect(() => {
    if (!tenantId) return;
    setSearchParams((prev) => {
      const base: RecogTargetSearchParams = prev ?? {
        fromDateTime: dayjs().subtract(3, 'hour').startOf('hour').format('YYYYMMDDHHmmss'),
        toDateTime: dayjs().startOf('hour').format('YYYYMMDDHHmmss'),
      };
      return { ...base, groupCode, engineCode, tenantId: Number(tenantId) };
    });
  }, [groupCode, engineCode, tenantId]);

  const { data: rowData, isLoading } = useGetRecogTargetSearch({ params: searchParams as Record<string, unknown> });

  const { mutate: createTarget } = useCreateRecogTarget({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.searchRecogTarget(searchParams as Record<string, unknown>).queryKey });
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

    const diffMinutes = endDateTime.diff(startDateTime, 'minute');

    if (startDate.isSame(endDate, 'day') && diffMinutes > 180) {
      toast.warning('같은 날짜 조회 시 최대 3시간까지만 가능합니다.');
      return;
    }
    if (diffMinutes > 7 * 24 * 60) {
      toast.warning('검색기간은 최대 1주일까지 가능합니다.');
      return;
    }
    if (diffMinutes > 24 * 60 && !dnNo.trim()) {
      toast.warning('조회기간이 하루를 초과하면 내선번호 입력이 필요합니다.');
      return;
    }

    setSearchParams({
      groupCode,
      engineCode,
      fromDateTime: startDate.format('YYYYMMDD') + (startTime?.format('HHmmss') ?? '000000'),
      toDateTime: endDate.format('YYYYMMDD') + (endTime?.format('HHmmss') ?? '235959'),
      keyword: keyword || undefined,
      inoutKind: inoutKind || undefined,
      ucidGkey: ucidGkey || undefined,
      dnNo: dnNo || undefined,
      rxtxKind: rxtxKind || undefined,
      tenantId: tenantId ? Number(tenantId) : undefined,
    });
  };

  const handleAdd = (data: RecogTargetSearchItem) => {
    createTarget({
      groupCode,
      tenantId: tenantId ?? '',
      ucidGkey: data.ucidGkey,
      armsoffset: data.armsoffset,
      rxtxKind: Number(data.rxtxKind),
      orgSentence: data.sentence,
      engineCode: data.engineCode,
    });
    gridRef.current?.api?.stopEditing();
  };

  const handleRowEditingStarted = (event: RowEditingStartedEvent<RecogTargetSearchItem>) => {
    event.api.refreshCells({ rowNodes: [event.node], force: true });
  };

  const columnDefs: ColDef<RecogTargetSearchItem>[] = [
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
    { headerName: '내선번호', field: 'dnNo', maxWidth: 110, flex: 1 },
    { headerName: '통화일시', field: 'callDatetime', flex: 2 },
    { headerName: '발화시간', field: 'talkTime', maxWidth: 100, flex: 1, valueFormatter: (params) => (params.value != null ? `${params.value}초` : '') },
    {
      headerName: '화자',
      field: 'rxtxKind',
      maxWidth: 90,
      flex: 1,
      valueFormatter: (params) => ({ '1': '고객', '2': '상담원', '9': '통합' })[String(params.value)] ?? params.value,
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
      cellRendererParams: { onRegister: (data: RecogTargetSearchItem) => handleAdd(data) },
    },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 검색 조건 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-[#495057] shrink-0">검색일자</span>
          <DatePicker value={startDate} onChange={setStartDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          <TimePicker value={startTime} onChange={setStartTime} format="HH:mm:ss" allowClear={false} inputReadOnly needConfirm={false} style={{ width: 110 }} />
          <span className="text-[#495057]">-</span>
          <DatePicker value={endDate} onChange={setEndDate} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
          <TimePicker value={endTime} onChange={setEndTime} format="HH:mm:ss" allowClear={false} inputReadOnly needConfirm={false} style={{ width: 110 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">키워드</span>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} placeholder="키워드를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">고유번호</span>
          <Input value={ucidGkey} onChange={(e) => setUcidGkey(e.target.value)} onPressEnter={handleSearch} placeholder="고유번호를 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">내선</span>
          <Input value={dnNo} onChange={(e) => setDnNo(e.target.value)} onPressEnter={handleSearch} placeholder="내선번호를 입력하세요" style={{ width: 160 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">IN/OUT 구분</span>
          <Select value={inoutKind} onChange={setInoutKind} options={IN_OUT_OPTIONS} popupMatchSelectWidth={false} style={{ width: 160 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">화자구분</span>
          <Select value={rxtxKind} onChange={setRxtxKind} options={RXTX_OPTIONS} popupMatchSelectWidth={false} style={{ width: 120 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={tenantId} onChange={setTenantId} options={tenantOptions} placeholder="기본테넌트" popupMatchSelectWidth={false} style={{ width: 160 }} />
          <Button type="primary" onClick={handleSearch}>
            조회
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-[200px]">
        <AgGridReact<RecogTargetSearchItem>
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
