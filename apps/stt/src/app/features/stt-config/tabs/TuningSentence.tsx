import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CellKeyDownEvent, ColDef, ICellRendererParams, RowEditingStartedEvent, RowEditingStoppedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Check, CheckCircle2, PlayCircle, StopCircle, Trash2, X, XCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetCodes } from '../hooks/useCommonQueries';
import { useGetSttSearchListen } from '../hooks/useSearchQueries';
import { trainingQueryKeys, useDeleteTuningSentence, useGetTuningSentenceList, useUpdateTuningSentence, useUpdateTunningKind } from '../hooks/useTrainingQueries';
import type { SttSearchListenParams, TuningSentenceItem, TuningSentenceSearchParams } from '../types';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PAGE_SIZE = 20;
const RXTX_LISTEN_TYPE: Record<string, string> = { '1': '4', '2': '5', '9': '3' };

function PlayCellRenderer({ data }: ICellRendererParams<TuningSentenceItem>) {
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

interface ActionCellRendererParams {
  data?: TuningSentenceItem;
  editingRowId: number | null;
  onSave: (data: TuningSentenceItem) => void;
  onCancel: () => void;
  onDelete: (data: TuningSentenceItem) => void;
}

interface TunningKindCellRendererParams {
  data?: TuningSentenceItem;
  onToggle: (data: TuningSentenceItem) => void;
}

function TunningKindCellRenderer({ data, onToggle }: TunningKindCellRendererParams) {
  if (!data) return null;
  const reflected = data.tunningKind === '0';
  return (
    <button onClick={() => onToggle(data)} className="flex items-center justify-center">
      {reflected ? <CheckCircle2 size={16} className="text-green-500 hover:text-green-600" /> : <XCircle size={16} className="text-gray-300 hover:text-gray-400" />}
    </button>
  );
}

function ActionCellRenderer({ data, editingRowId, onSave, onCancel, onDelete }: ActionCellRendererParams) {
  if (!data) return null;

  if (editingRowId === data.dataKey) {
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
    <button onClick={() => onDelete(data)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function TuningSentence() {
  const { gridOptions } = useAggridOptions();
  const modal = useModal();
  const queryClient = useQueryClient();
  const gridRef = useRef<AgGridReact<TuningSentenceItem>>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);

  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [engineCode, setEngineCode] = useState('');
  const [searchParams, setSearchParams] = useState<TuningSentenceSearchParams | null>(null);

  const { data: engines } = useGetCodes({ params: { classCd: 'ENGINE_KIND' } });
  const engineOptions = engines?.map((e) => ({ label: e.value, value: e.code })) ?? [];

  useEffect(() => {
    if (engines && engines.length > 0) {
      setEngineCode((prev) => {
        const resolved = prev || engines[0].code;
        setSearchParams({
          fromDate: dayjs().subtract(7, 'day').format('YYYYMMDD'),
          toDate: dayjs().format('YYYYMMDD'),
          engineCode: resolved,
        });
        return resolved;
      });
    }
  }, [engines]);

  const {
    data: rowData = [],
    isLoading,
    refetch,
  } = useGetTuningSentenceList({
    params: searchParams as Record<string, unknown>,
    queryOptions: { enabled: !!searchParams },
  });

  const { mutate: updateTuningSentence } = useUpdateTuningSentence({
    mutationOptions: {
      onSuccess: () => {
        toast.success('문자수정 내용이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: trainingQueryKeys.getTuningSentenceList(searchParams ?? undefined).queryKey });
      },
      onError: () => {
        toast.error('수정에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteTuningSentence } = useDeleteTuningSentence({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: trainingQueryKeys.getTuningSentenceList(searchParams ?? undefined).queryKey });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const { mutate: updateTunningKind } = useUpdateTunningKind({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trainingQueryKeys.getTuningSentenceList(searchParams ?? undefined).queryKey });
      },
      onError: () => {
        toast.error('반영여부 변경에 실패했습니다.');
      },
    },
  });

  const handleUpdateTunningKind = (data: TuningSentenceItem) => {
    updateTunningKind({
      tunningKind: data.tunningKind === '0' ? '1' : '0',
      ucidGkey: data.ucidGkey,
      armsoffset: data.armsoffset,
      rxtxKind: data.rxtxKind,
    });
  };

  const handleSearch = () => {
    if (!fromDate || !toDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }
    if (fromDate.isAfter(toDate)) {
      toast.warning('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }
    const newParams: TuningSentenceSearchParams = {
      fromDate: fromDate.format('YYYYMMDD'),
      toDate: toDate.format('YYYYMMDD'),
      engineCode: engineCode || undefined,
    };
    const paramsChanged = JSON.stringify(newParams) !== JSON.stringify(searchParams);
    setSearchParams(newParams);
    if (!paramsChanged) void refetch();
  };

  const handleSave = (originData: TuningSentenceItem) => {
    const editingCells = gridRef.current?.api?.getEditingCells() ?? [];
    const cellEditors = gridRef.current?.api?.getCellEditorInstances() ?? [];

    let trString = originData.trString;
    editingCells.forEach((cell, index) => {
      if (cell.colId === 'trString') {
        const editor = cellEditors[index];
        if (editor) trString = editor.getValue() as string;
      }
    });

    if (/[^가-힣ㄱ-ㅎㅏ-ㅣ\s]/.test(trString)) {
      toast.warning('문자수정 내용에 숫자, 영문자, 특수문자는 사용할 수 없습니다.');
      return;
    }

    gridRef.current?.api?.stopEditing();

    updateTuningSentence({
      ucidGkey: originData.ucidGkey,
      armsoffset: originData.armsoffset,
      rxtxKind: originData.rxtxKind,
      trString,
      engineCode: searchParams?.engineCode ?? '',
    });
  };

  const handleCellKeyDown = (event: CellKeyDownEvent<TuningSentenceItem>) => {
    if ((event.event as KeyboardEvent)?.key !== 'Enter') return;
    if (!event.data) return;
    const isEditing = (gridRef.current?.api?.getEditingCells() ?? []).length > 0;
    if (!isEditing) return;
    (event.event as KeyboardEvent).stopPropagation();
    handleSave(event.data);
  };

  const handleRowEditingStarted = (event: RowEditingStartedEvent<TuningSentenceItem>) => {
    setEditingRowId(event.data?.dataKey ?? null);
    event.api.refreshCells({ rowNodes: [event.node], force: true });
  };

  const handleRowEditingStopped = (_event: RowEditingStoppedEvent<TuningSentenceItem>) => {
    setEditingRowId(null);
  };

  const cancelEditing = () => {
    gridRef.current?.api?.stopEditing(true);
  };

  const handleDelete = (data: TuningSentenceItem) => {
    modal.confirm.delete({ onOk: () => deleteTuningSentence({ ucidGkey: data.ucidGkey, armsoffset: data.armsoffset, rxtxKind: data.rxtxKind }) });
  };

  const columnDefs: ColDef<TuningSentenceItem>[] = [
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
      headerName: '',
      colId: 'tunningKind',
      maxWidth: 50,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: TunningKindCellRenderer,
      cellRendererParams: { onToggle: handleUpdateTunningKind },
    },
    {
      headerName: '고유번호(UCID)',
      field: 'ucidGkey',
      flex: 3,
      filter: true,
    },
    {
      headerName: 'STT 원문',
      field: 'sentence',
      flex: 4,
      filter: true,
    },
    {
      headerName: '문자수정 내용',
      field: 'trString',
      flex: 4,
      filter: true,
      tooltipField: 'trString',
      editable: true,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: { useFormatter: true },
      suppressKeyboardEvent: (params) => params.editing && params.event.key === 'Enter',
    },
    {
      headerName: '화자',
      field: 'rxtxKind',
      maxWidth: 90,
      flex: 1,
      valueFormatter: (params) => ({ '1': '고객', '2': '상담원', '9': '통합' })[String(params.value)] ?? params.value,
    },
    {
      headerName: '등록일',
      field: 'workTime',
      flex: 2,
      valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : ''),
    },
    {
      headerName: '',
      colId: 'actions',
      maxWidth: 80,
      sortable: false,
      filter: false,
      editable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      cellRenderer: ActionCellRenderer,
      cellRendererParams: {
        editingRowId,
        onSave: handleSave,
        onCancel: cancelEditing,
        onDelete: handleDelete,
      },
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
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select value={engineCode} onChange={setEngineCode} options={engineOptions} style={{ width: 140 }} />
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
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={{
            ...gridOptions,
            paginationPageSize: PAGE_SIZE,
            editType: 'fullRow',
            singleClickEdit: true,
          }}
          onRowEditingStarted={handleRowEditingStarted}
          onRowEditingStopped={handleRowEditingStopped}
          onCellKeyDown={handleCellKeyDown}
          loading={isLoading}
          sideBar={false}
        />
      </div>
    </div>
  );
}
