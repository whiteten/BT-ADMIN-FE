import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CellKeyDownEvent, ColDef, ICellRendererParams, RowEditingStartedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { AlertCircle, PlayCircle, StopCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetSttSearchListen } from '../hooks/useSearchQueries';
import { trainingQueryKeys, useCreateTuningSentence, useGetTrainingList } from '../hooks/useTrainingQueries';
import type { ConfidenceTrainingItem, ConfidenceTrainingSearchParams, SttSearchListenParams } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const ENGINE_OPTIONS = [
  { label: '전체', value: '' },
  { label: 'ENGINE#0', value: 'ENGINE0' },
  { label: 'ENGINE#1', value: 'ENGINE1' },
];

const PAGE_SIZE = 20;
const CONFIDENCE_THRESHOLD = 95; // 조회할 신뢰도 설정 값

function ConfidenceCellRenderer({ value }: ICellRendererParams<ConfidenceTrainingItem>) {
  if (value == null) return null;
  const className =
    value < 80 ? 'bg-gray-50 text-gray-700 border-gray-200' : value < 90 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200';
  return <Badge className={className}>{value}</Badge>;
}

interface RegisterCellRendererParams extends ICellRendererParams<ConfidenceTrainingItem> {
  onRegister: (data: ConfidenceTrainingItem) => void;
}

function CreateCellRenderer({ data, onRegister }: RegisterCellRendererParams) {
  if (!data) return null;
  return (
    <Button type="primary" size="small" onClick={() => onRegister(data)} style={{ fontSize: '12px' }}>
      등록
    </Button>
  );
}

const RXTX_LISTEN_TYPE: Record<string, string> = { '1': '4', '2': '5', '9': '3' };

function PlayCellRenderer({ data }: ICellRendererParams<ConfidenceTrainingItem>) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  playingRef.current = playing;

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

  const { data: listenData, error: listenError } = useGetSttSearchListen({
    params: listenParams as unknown as Record<string, unknown>,
    queryOptions: { enabled: playing && !!listenParams, staleTime: Infinity },
  });

  useEffect(() => {
    if (!listenError || !playingRef.current) return;
    setPlaying(false);
    try {
      const buffer = (listenError as { response?: { data?: unknown } }).response?.data;
      if (buffer instanceof ArrayBuffer) {
        const msg = (JSON.parse(new TextDecoder().decode(buffer)) as { message?: string }).message;
        if (msg) {
          toast.warning(msg);
          return;
        }
      }
    } catch {
      /* ignore parse errors */
    }
    toast.warning('음성 파일을 불러올 수 없습니다.');
  }, [listenError]);

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

const DEFAULT_START_TIME = dayjs().subtract(2, 'hour').startOf('hour');
const DEFAULT_END_TIME = dayjs().add(1, 'hour').startOf('hour');

export default function ConfidenceTraining() {
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const gridRef = useRef<AgGridReact<ConfidenceTrainingItem>>(null);

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(DEFAULT_START_TIME);
  const [endTime, setEndTime] = useState<Dayjs | null>(DEFAULT_END_TIME);
  const [dnNo, setDnNo] = useState('');
  const [engineCode, setEngineCode] = useState('');

  const [searchParams, setSearchParams] = useState<ConfidenceTrainingSearchParams>({
    fromDateTime: dayjs().format('YYYYMMDD') + DEFAULT_START_TIME.format('HHmmss'),
    toDateTime: dayjs().format('YYYYMMDD') + DEFAULT_END_TIME.format('HHmmss'),
    confidence: CONFIDENCE_THRESHOLD,
  });

  const {
    data: rowData,
    isLoading,
    refetch,
  } = useGetTrainingList({
    params: searchParams as Record<string, unknown>,
  });

  const { mutate: createTuningSentence } = useCreateTuningSentence({
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

    const newParams: ConfidenceTrainingSearchParams = {
      fromDateTime: startDate.format('YYYYMMDD') + (startTime?.format('HHmmss') ?? '000000'),
      toDateTime: endDate.format('YYYYMMDD') + (endTime?.format('HHmmss') ?? '235959'),
      dnNo: dnNo || undefined,
      engineCode: engineCode || undefined,
      confidence: CONFIDENCE_THRESHOLD,
    };
    const paramsChanged = JSON.stringify(newParams) !== JSON.stringify(searchParams);
    setSearchParams(newParams);
    if (!paramsChanged) void refetch();
  };

  const handleAdd = (originData: ConfidenceTrainingItem) => {
    const editingCells = gridRef.current?.api?.getEditingCells() ?? [];
    const cellEditors = gridRef.current?.api?.getCellEditorInstances() ?? [];

    let sentence = originData.sentence;
    editingCells.forEach((cell, index) => {
      if (cell.colId === 'sentence') {
        const editor = cellEditors[index];
        if (editor) sentence = editor.getValue() as string;
      }
    });

    if (/[^가-힣ㄱ-ㅎㅏ-ㅣ\s]/.test(sentence)) {
      toast.warning('대화내용에 숫자, 영문자, 특수문자는 사용할 수 없습니다.');
      return;
    }

    gridRef.current?.api?.stopEditing();

    createTuningSentence({
      ucidGkey: originData.ucidGkey,
      armsoffset: originData.armsoffset,
      rxtxKind: originData.rxtxKind,
      trString: sentence,
      engineCode: originData.engineCode,
    });
  };

  const handleCellKeyDown = (event: CellKeyDownEvent<ConfidenceTrainingItem>) => {
    if ((event.event as KeyboardEvent)?.key !== 'Enter') return;
    if (!event.data) return;
    const isEditing = (gridRef.current?.api?.getEditingCells() ?? []).length > 0;
    if (!isEditing) return;
    (event.event as KeyboardEvent).stopPropagation();
    handleAdd(event.data);
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
      filter: true,
      tooltipField: 'ucidGkey',
    },
    {
      headerName: '내선번호',
      field: 'dnNo',
      maxWidth: 110,
      flex: 1,
      filter: true,
    },
    {
      headerName: '통화일시',
      field: 'callDatetime',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : ''),
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
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: ConfidenceCellRenderer,
    },
    {
      headerName: '대화내용',
      field: 'sentence',
      flex: 4,
      filter: true,
      tooltipField: 'sentence',
      editable: true,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: { useFormatter: true },
      suppressKeyboardEvent: (params) => params.editing && params.event.key === 'Enter',
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
          <span className="text-sm font-medium text-[#495057] shrink-0">내선</span>
          <Input value={dnNo} onChange={(e) => setDnNo(e.target.value)} onPressEnter={handleSearch} placeholder="내선번호를 입력하세요" style={{ width: 160 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select value={engineCode} onChange={setEngineCode} options={ENGINE_OPTIONS} popupMatchSelectWidth={false} style={{ width: 120 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="flex items-center gap-1 text-xs text-amber-500">
            <AlertCircle size={13} />
            신뢰도 {CONFIDENCE_THRESHOLD} 미만 데이터만 조회됩니다.
          </span>
          <Button type="primary" onClick={handleSearch}>
            조회
          </Button>
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
            singleClickEdit: true,
          }}
          onRowEditingStarted={handleRowEditingStarted}
          onCellKeyDown={handleCellKeyDown}
          loading={isLoading}
          sideBar={false}
        />
      </div>
    </div>
  );
}
