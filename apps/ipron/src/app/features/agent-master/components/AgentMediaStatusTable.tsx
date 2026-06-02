/**
 * 상담사 미디어 현황 매트릭스 (AS-IS SWAT IPR20S40xx 미디어 화면 흡수).
 *
 * 상담사 × 8 미디어 매트릭스를 ag-Grid 로 표시.
 * 각 셀(읽기): 해당 미디어의 사용 여부 뱃지 + (사용 시) MAX quick.
 * 각 셀(편집): 사용여부 토글 + MAX(동시 최대) InputNumber 인라인 편집.
 *
 * 편집 방식: 행 단위. [편집] 액션 → 해당 행의 미디어 셀이 인라인 입력으로 전환되고
 *   미디어 옵션(개별/그룹) 토글도 인라인 가능. [저장] → 상담사 update 엔드포인트
 *   (ipron-agent-master-update) 로 미디어 매트릭스 포함 전체 페이로드 전송 (상세 Drawer 와 동일 결과).
 *   useGrpMdaOpt=1(그룹 상속) 이면 mediaMatrix=null 로 전송.
 *
 * 데이터 출처: 기존 getList(AgentResponse) — 별도 미디어 API 없음. agent.mediaMatrix 셀 파생.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { CellStyle, ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { InputNumber, Select } from 'antd';
import { Check, Pencil, X } from 'lucide-react';
import type { AgentMediaMatrix, AgentMediaOption, AgentResponse, AgentUpdateRequest } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const MEDIA_KEYS = ['chat', 'videoVoice', 'videoChat', 'email', 'fax', 'voip', 'mvoip', 'sms'] as const;
type MediaKey = (typeof MEDIA_KEYS)[number];

const MEDIA_LABELS: Record<MediaKey, string> = {
  chat: 'Chat',
  videoVoice: 'Video Voice',
  videoChat: 'Video Chat',
  email: 'Email',
  fax: 'Fax',
  voip: 'VOIP',
  mvoip: 'MVOIP',
  sms: 'SMS / WEB',
};

const DEFAULT_OPT: AgentMediaOption = {
  use: false,
  autoansUse: false,
  autoanswerMode: 0,
  autoanswerTime: 2,
  util: 1,
  max: 1,
  afctime: 30,
};

/** AgentResponse.mediaMatrix 를 8 미디어 모두 채운 편집용 매트릭스로 정규화. */
function normalizeMatrix(src: AgentMediaMatrix | null | undefined): AgentMediaMatrix {
  const ensure = (o: AgentMediaOption | null | undefined): AgentMediaOption => (o ? { ...o } : { ...DEFAULT_OPT });
  return {
    chat: ensure(src?.chat),
    videoVoice: ensure(src?.videoVoice),
    videoChat: ensure(src?.videoChat),
    email: ensure(src?.email),
    fax: ensure(src?.fax),
    voip: ensure(src?.voip),
    mvoip: ensure(src?.mvoip),
    sms: ensure(src?.sms),
  };
}

/** 행(상담사) + 편집된 매트릭스/그룹옵션으로 상담사 update 페이로드 구성 (Drawer handleSubmit 과 동일 규격). */
function toUpdateBody(agent: AgentResponse, matrix: AgentMediaMatrix, useGrpMdaOpt: number): AgentUpdateRequest {
  return {
    groupId: agent.groupId,
    agentName: agent.agentName,
    agentAlias: agent.agentAlias,
    agentGrade: agent.agentGrade ?? undefined,
    jikgup: agent.jikgup ?? undefined,
    oscomId: agent.oscomId ?? undefined,
    activateYn: agent.activateYn,
    retireYn: agent.retireYn,
    useGrpMdaOpt,
    useGrpSkill: agent.useGrpSkill,
    masterCtiqId: agent.masterCtiqId ?? undefined,
    monitorSvc: agent.monitorSvc ?? undefined,
    coachingSvc: agent.coachingSvc ?? undefined,
    mediaMatrix: useGrpMdaOpt === 1 ? null : matrix,
  };
}

/** 읽기 전용 미디어 셀 뱃지. */
function MediaBadge({ opt, inherited }: { opt: AgentMediaOption | null | undefined; inherited: boolean }) {
  const on = !!opt?.use;
  if (inherited) {
    return (
      <span className="inline-flex items-center justify-center w-full h-[20px] leading-none px-1.5 rounded text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200">
        그룹
      </span>
    );
  }
  if (!on) {
    return (
      <span className="inline-flex items-center justify-center w-full h-[20px] leading-none px-1.5 rounded text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-200">
        미사용
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center gap-1 w-full h-[20px] leading-none px-1.5 rounded text-[11px] font-medium text-green-700 bg-green-50 border border-green-200"
      title={`UTIL ${opt?.util ?? 0} · MAX ${opt?.max ?? 0} · AFC ${opt?.afctime ?? 0}s · 자동응답 ${opt?.autoanswerMode === 1 ? `${opt?.autoanswerTime ?? 0}s` : '안함'}`}
    >
      <span>사용</span>
      <span className="text-[10px] text-green-600/80">M{opt?.max ?? 0}</span>
    </span>
  );
}

/** 편집 중 미디어 셀 — 사용여부 + MAX/UTIL/AFC/자동응답 인라인 편집. */
function MediaEditCell({ opt, inherited, onChange }: { opt: AgentMediaOption; inherited: boolean; onChange: (patch: Partial<AgentMediaOption>) => void }) {
  if (inherited) {
    return <span className="inline-flex items-center justify-center w-full h-[20px] text-[11px] text-gray-400">그룹 상속</span>;
  }
  const on = !!opt.use;
  const autoOn = on && opt.autoanswerMode === 1;
  return (
    <div className="flex flex-col gap-0.5 w-full py-0.5">
      {/* 사용 여부 */}
      <Select
        size="small"
        style={{ width: '100%' }}
        value={on ? 1 : 0}
        onChange={(v) => onChange({ use: v === 1 })}
        options={[
          { value: 1, label: '사용' },
          { value: 0, label: '미사용' },
        ]}
      />
      {on && (
        <>
          {/* MAX */}
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={16}
            value={opt.max ?? 1}
            onChange={(v) => onChange({ max: typeof v === 'number' ? v : 0 })}
            placeholder="MAX"
            title="동시 최대 인입 수 (0~16)"
          />
          {/* UTIL */}
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={100}
            value={opt.util ?? 1}
            onChange={(v) => onChange({ util: typeof v === 'number' ? v : 0 })}
            placeholder="UTIL%"
            title="인입 가중치 % (0~100)"
          />
          {/* AFC 후처리 */}
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={999}
            value={opt.afctime ?? 30}
            onChange={(v) => onChange({ afctime: typeof v === 'number' ? v : 0 })}
            placeholder="후처리"
            title="후처리 보장 시간 초 (0~999)"
          />
          {/* 자동응답 여부 */}
          <Select
            size="small"
            style={{ width: '100%' }}
            value={opt.autoanswerMode === 1 ? 1 : 0}
            onChange={(v) => onChange({ autoanswerMode: v })}
            options={[
              { value: 0, label: '자동응답 안함' },
              { value: 1, label: '자동응답 사용' },
            ]}
          />
          {/* 자동응답 시간 — autoanswerMode=1 일 때만 */}
          {autoOn && (
            <InputNumber
              size="small"
              style={{ width: '100%' }}
              min={0}
              max={999}
              value={opt.autoanswerTime ?? 2}
              onChange={(v) => onChange({ autoanswerTime: typeof v === 'number' ? v : 0 })}
              placeholder="자동응답시간"
              title="자동응답 시간 초 (0~999)"
            />
          )}
        </>
      )}
    </div>
  );
}

interface RowActionsParams extends ICellRendererParams<AgentResponse> {
  editingAgentId: number | null;
  saving: boolean;
  onEdit: (agent: AgentResponse) => void;
  onSave: (agent: AgentResponse) => void;
  onCancel: () => void;
}

function RowActions(params: RowActionsParams) {
  const { data, editingAgentId, saving, onEdit, onSave, onCancel } = params;
  if (!data) return null;
  const isEditing = editingAgentId === data.agentId;
  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-2 w-full">
        <button type="button" title="저장" disabled={saving} onClick={() => onSave(data)} className="disabled:opacity-40">
          <Check className="size-4 text-green-600 hover:text-green-700" />
        </button>
        <button type="button" title="취소" disabled={saving} onClick={onCancel} className="disabled:opacity-40">
          <X className="size-4 text-gray-500 hover:text-gray-700" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-full">
      <button type="button" title="미디어 편집" disabled={editingAgentId !== null} onClick={() => onEdit(data)} className="disabled:opacity-30 disabled:cursor-not-allowed">
        <Pencil className="size-3.5 text-gray-500 hover:text-[#405189]" />
      </button>
    </div>
  );
}

interface AgentMediaStatusTableProps {
  rowData: AgentResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (agent: AgentResponse) => void;
  /** 행 단위 미디어 저장 — 상담사 update 엔드포인트로 전송. */
  onSaveRow: (id: number, body: AgentUpdateRequest) => void;
  /** 저장 진행 중 (mutation isPending). */
  saving?: boolean;
}

export default function AgentMediaStatusTable({ rowData, isLoading, onRowDoubleClicked, onSaveRow, saving }: AgentMediaStatusTableProps) {
  const { gridOptions } = useAggridOptions();
  const gridApiRef = useRef<GridApi<AgentResponse> | null>(null);

  // 편집 중 상담사 + 편집 버퍼(매트릭스/그룹옵션). 단일 행 편집.
  const [editingAgentId, setEditingAgentId] = useState<number | null>(null);
  const [draftMatrix, setDraftMatrix] = useState<AgentMediaMatrix>(() => normalizeMatrix(null));
  const [draftUseGrp, setDraftUseGrp] = useState(0);
  // 셀 렌더러 재호출 강제용 (버퍼 변경 시 refreshCells)
  const [draftRev, setDraftRev] = useState(0);

  const startEdit = useCallback((agent: AgentResponse) => {
    setEditingAgentId(agent.agentId);
    setDraftMatrix(normalizeMatrix(agent.mediaMatrix));
    setDraftUseGrp(agent.useGrpMdaOpt ?? 0);
    setDraftRev((r) => r + 1);
    // 행 높이 재계산 — 편집 행은 더 높게
    setTimeout(() => gridApiRef.current?.resetRowHeights(), 0);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingAgentId(null);
    setTimeout(() => gridApiRef.current?.resetRowHeights(), 0);
  }, []);

  const saveEdit = useCallback(
    (agent: AgentResponse) => {
      onSaveRow(agent.agentId, toUpdateBody(agent, draftMatrix, draftUseGrp));
      setEditingAgentId(null);
      setTimeout(() => gridApiRef.current?.resetRowHeights(), 0);
    },
    [onSaveRow, draftMatrix, draftUseGrp],
  );

  const setCell = useCallback((key: MediaKey, patch: Partial<AgentMediaOption>) => {
    setDraftMatrix((prev) => ({ ...prev, [key]: { ...prev[key]!, ...patch } }));
    setDraftRev((r) => r + 1);
  }, []);

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<AgentResponse>[] = useMemo(() => {
    const base: ColDef<AgentResponse>[] = [
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 90, pinned: 'left', valueFormatter: (p) => p.value ?? '-' },
      { headerName: '그룹', field: 'groupName', flex: 1, minWidth: 100, pinned: 'left', valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '로그인 ID',
        field: 'agentLoginId',
        flex: 0.9,
        minWidth: 90,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => (params.data ? <span className="font-semibold text-gray-800">{params.data.agentLoginId}</span> : null),
      },
      { headerName: '상담사명', field: 'agentName', flex: 0.9, minWidth: 90, pinned: 'left' },
      {
        headerName: '',
        colId: 'rowActions',
        width: 72,
        minWidth: 72,
        maxWidth: 72,
        pinned: 'left',
        sortable: false,
        filter: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 } as CellStyle,
        cellRendererParams: { editingAgentId, saving, onEdit: startEdit, onSave: saveEdit, onCancel: cancelEdit },
        cellRenderer: RowActions,
      },
      {
        headerName: '미디어 옵션',
        field: 'useGrpMdaOpt',
        flex: 0.85,
        minWidth: 110,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
          const editing = params.data?.agentId === editingAgentId;
          const group = editing ? draftUseGrp === 1 : params.data?.useGrpMdaOpt === 1;
          if (editing) {
            return (
              <Select
                size="small"
                style={{ width: 88 }}
                value={group ? 1 : 0}
                onChange={(v) => {
                  setDraftUseGrp(v);
                  setDraftRev((r) => r + 1);
                }}
                options={[
                  { value: 0, label: '개별' },
                  { value: 1, label: '그룹' },
                ]}
              />
            );
          }
          return (
            <span
              className={`inline-flex items-center justify-center w-[44px] h-[20px] leading-none px-1.5 rounded text-[11px] font-medium ${
                group ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-[#405189] bg-[#405189]/5 border border-[#405189]/20'
              }`}
            >
              {group ? '그룹' : '개별'}
            </span>
          );
        },
      },
    ];

    const mediaCols: ColDef<AgentResponse>[] = MEDIA_KEYS.map((key) => ({
      headerName: MEDIA_LABELS[key],
      colId: `media_${key}`,
      flex: 0.9,
      minWidth: 150,
      sortable: false,
      filter: false,
      cellStyle: (params: import('ag-grid-community').CellClassParams<AgentResponse>) => {
        const editing = params.data?.agentId === editingAgentId;
        if (editing) {
          return { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4px 6px', overflow: 'visible' } as CellStyle;
        }
        return { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' } as CellStyle;
      },
      cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
        const data = params.data;
        if (!data) return null;
        const editing = data.agentId === editingAgentId;
        if (editing) {
          return <MediaEditCell opt={draftMatrix[key]!} inherited={draftUseGrp === 1} onChange={(patch) => setCell(key, patch)} />;
        }
        return <MediaBadge opt={data.mediaMatrix?.[key]} inherited={data.useGrpMdaOpt === 1} />;
      },
    }));

    return [...base, ...mediaCols];
    // draftRev: 버퍼 변경 시 셀 재렌더 트리거
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAgentId, draftUseGrp, draftMatrix, draftRev, saving, startEdit, saveEdit, cancelEdit, setCell]);

  const getRowHeight = useCallback(
    (params: import('ag-grid-community').RowHeightParams<AgentResponse>) => {
      if (params.data?.agentId === editingAgentId) {
        // use=사용 시 필드 5~6개(자동응답 사용 여부 포함), 각 24px + 패딩
        return 196;
      }
      return 36;
    },
    [editingAgentId],
  );

  return (
    <AgGridReact<AgentResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      getRowId={(p) => String(p.data.agentId)}
      getRowHeight={getRowHeight}
      onGridReady={(e) => {
        gridApiRef.current = e.api;
      }}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
        rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      }}
      loading={isLoading}
      onRowDoubleClicked={(e) => {
        // 편집 중에는 더블클릭으로 Drawer 진입 차단 (편집 충돌 방지)
        if (editingAgentId !== null) return;
        if (e.data) onRowDoubleClicked(e.data);
      }}
    />
  );
}
