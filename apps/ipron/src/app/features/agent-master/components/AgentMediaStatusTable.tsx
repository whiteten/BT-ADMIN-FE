/**
 * 상담사 미디어 옵션 현황표 (AS-IS SWAT IPR20S4060 정합).
 *
 * SWAT 원본 동작:
 *   - 상단 [Media Type] 셀렉트로 미디어 1종(VOIP/Chat/VideoVoice/VideoChat/Email/Fax/MVOIP/SMS·WEB)을 선택.
 *   - 그리드는 그 미디어의 값을 상담사 행마다 **평면 컬럼**으로 직접 표시·인라인 편집:
 *       미디어옵션(개별/그룹) · 사용 · 가중치(util) · 동시최대(max) · 후처리(afctime) · 자동응답(mode) · 자동응답시간
 *   - useGrpMdaOpt=1(그룹 상속) 행은 그룹 실효값을 회색/비활성으로 표시(편집 불가). BE fallback 으로 mediaMatrix 채워짐.
 *
 * 본 컴포넌트도 동일하게:
 *   - 미디어 종류를 셀렉트로 고르면, 그 미디어 값이 **항상 그리드 셀에 보임**(배지 뒤에 숨기지 않음).
 *   - [편집] 액션으로 해당 행의 평면 컬럼들이 인라인 입력으로 전환(행 높이 변화 없음).
 *   - [저장] → 상담사 update 엔드포인트(ipron-agent-master-update) 로 전체 mediaMatrix 페이로드 전송.
 *     선택 미디어의 변경만 draftMatrix 에 반영하고 나머지 7종은 원본 유지. useGrpMdaOpt=1 이면 mediaMatrix=null.
 *
 * 데이터 출처: 기존 getList(AgentResponse) — agent.mediaMatrix[mediaKey] 셀 파생.
 */
import { useCallback, useMemo, useState } from 'react';
import type { CellClassParams, CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { InputNumber, Select } from 'antd';
import { Check, Pencil, X } from 'lucide-react';
import { MEDIA_OPTION_BOUNDS } from '../constants/codes';
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

/** 상단 Media Type 셀렉트 옵션 (SWAT combo type=mediaType 정합 순서). */
const MEDIA_TYPE_OPTIONS = MEDIA_KEYS.map((k) => ({ value: k, label: MEDIA_LABELS[k] }));

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

/** 행이 선택 미디어에 대해 그룹 상속인지. */
function isInherited(agent: AgentResponse | undefined): boolean {
  return agent?.useGrpMdaOpt === 1;
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

  // 상단에서 선택한 미디어 종류 — 이 미디어의 값이 그리드 평면 컬럼으로 표시/편집됨.
  const [mediaKey, setMediaKey] = useState<MediaKey>('voip');

  // 편집 중 상담사 + 편집 버퍼(매트릭스/그룹옵션). 단일 행 편집.
  const [editingAgentId, setEditingAgentId] = useState<number | null>(null);
  const [draftMatrix, setDraftMatrix] = useState<AgentMediaMatrix>(() => normalizeMatrix(null));
  const [draftUseGrp, setDraftUseGrp] = useState(0);
  // 셀 렌더러 재호출 강제용 (버퍼 변경 시 셀 재렌더 트리거)
  const [draftRev, setDraftRev] = useState(0);

  const startEdit = useCallback((agent: AgentResponse) => {
    setEditingAgentId(agent.agentId);
    setDraftMatrix(normalizeMatrix(agent.mediaMatrix));
    setDraftUseGrp(agent.useGrpMdaOpt ?? 0);
    setDraftRev((r) => r + 1);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingAgentId(null);
  }, []);

  const saveEdit = useCallback(
    (agent: AgentResponse) => {
      onSaveRow(agent.agentId, toUpdateBody(agent, draftMatrix, draftUseGrp));
      setEditingAgentId(null);
    },
    [onSaveRow, draftMatrix, draftUseGrp],
  );

  // 선택 미디어의 옵션 셀만 patch (나머지 7종은 draftMatrix 에 그대로 유지).
  const setOpt = useCallback(
    (patch: Partial<AgentMediaOption>) => {
      setDraftMatrix((prev) => ({ ...prev, [mediaKey]: { ...prev[mediaKey]!, ...patch } }));
      setDraftRev((r) => r + 1);
    },
    [mediaKey],
  );

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  // 편집 중인 행의 선택 미디어 옵션(편집 버퍼) 또는 원본 옵션을 반환.
  const optOf = useCallback(
    (agent: AgentResponse): AgentMediaOption => {
      if (agent.agentId === editingAgentId) return draftMatrix[mediaKey]!;
      return agent.mediaMatrix?.[mediaKey] ?? DEFAULT_OPT;
    },
    [editingAgentId, draftMatrix, mediaKey],
  );

  const isEditingRow = useCallback((agent: AgentResponse | undefined) => !!agent && agent.agentId === editingAgentId, [editingAgentId]);

  // 그룹 상속(개별/그룹) 판정 — 편집 중이면 draft, 아니면 원본.
  const inheritedOf = useCallback(
    (agent: AgentResponse): boolean => {
      if (agent.agentId === editingAgentId) return draftUseGrp === 1;
      return isInherited(agent);
    },
    [editingAgentId, draftUseGrp],
  );

  /** 인라인 편집 가능 셀 공통 스타일 — 그룹 상속 행은 회색. */
  const valueCellStyle = useCallback(
    (params: CellClassParams<AgentResponse>): CellStyle => {
      const inherited = params.data ? inheritedOf(params.data) : false;
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 6px',
        color: inherited ? '#9ca3af' : undefined,
        backgroundColor: inherited ? '#f9fafb' : undefined,
      } as CellStyle;
    },
    [inheritedOf],
  );

  /** 숫자 값 셀 렌더러 (UTIL/MAX/AFC/자동응답시간) — 보기: 숫자, 편집: InputNumber. */
  const numberCell = useCallback(
    (field: 'util' | 'max' | 'afctime' | 'autoanswerTime', bounds: { min: number; max: number }, opts?: { suffix?: string; onlyWhenAuto?: boolean }) =>
      (params: ICellRendererParams<AgentResponse>) => {
        const agent = params.data;
        if (!agent) return null;
        const inherited = inheritedOf(agent);
        const editing = isEditingRow(agent);
        const opt = optOf(agent);
        const used = !!opt.use;
        // 자동응답시간은 자동응답=사용일 때만 의미.
        const autoGated = opts?.onlyWhenAuto && opt.autoanswerMode !== 1;
        if (inherited) {
          return <span className="text-[12px] text-gray-400">{used && !autoGated ? `${opt[field] ?? 0}${opts?.suffix ?? ''}` : '–'}</span>;
        }
        if (!used || autoGated) {
          return <span className="text-[12px] text-gray-300">–</span>;
        }
        if (editing) {
          return (
            <InputNumber
              size="small"
              style={{ width: '100%' }}
              min={bounds.min}
              max={bounds.max}
              value={opt[field] ?? bounds.min}
              onChange={(v) => setOpt({ [field]: typeof v === 'number' ? v : 0 })}
            />
          );
        }
        return (
          <span className="text-[12px] font-medium text-gray-800 tabular-nums">
            {opt[field] ?? 0}
            {opts?.suffix ?? ''}
          </span>
        );
      },
    [inheritedOf, isEditingRow, optOf, setOpt],
  );

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
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
          const data = params.data;
          if (!data) return null;
          const editing = data.agentId === editingAgentId;
          if (editing) {
            return (
              <div className="flex items-center justify-center gap-2 w-full">
                <button type="button" title="저장" disabled={saving} onClick={() => saveEdit(data)} className="disabled:opacity-40">
                  <Check className="size-4 text-green-600 hover:text-green-700" />
                </button>
                <button type="button" title="취소" disabled={saving} onClick={cancelEdit} className="disabled:opacity-40">
                  <X className="size-4 text-gray-500 hover:text-gray-700" />
                </button>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-center w-full">
              <button
                type="button"
                title="미디어 편집"
                disabled={editingAgentId !== null}
                onClick={() => startEdit(data)}
                className="disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Pencil className="size-3.5 text-gray-500 hover:text-[#405189]" />
              </button>
            </div>
          );
        },
      },
      // ── 미디어옵션 기준 (개별/그룹) ──────────────────────────────────────
      {
        headerName: '미디어옵션',
        colId: 'useGrpMdaOpt',
        flex: 0.85,
        minWidth: 100,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
          const data = params.data;
          if (!data) return null;
          const editing = data.agentId === editingAgentId;
          const group = editing ? draftUseGrp === 1 : data.useGrpMdaOpt === 1;
          if (editing) {
            return (
              <Select
                size="small"
                style={{ width: 84 }}
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
      // ── 사용 여부 ────────────────────────────────────────────────────────
      {
        headerName: '사용',
        colId: 'mediaUse',
        flex: 0.7,
        minWidth: 80,
        cellStyle: valueCellStyle,
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
          const agent = params.data;
          if (!agent) return null;
          const inherited = inheritedOf(agent);
          const editing = isEditingRow(agent);
          const opt = optOf(agent);
          const on = !!opt.use;
          if (!inherited && editing) {
            return (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={on ? 1 : 0}
                onChange={(v) => setOpt({ use: v === 1 })}
                options={[
                  { value: 1, label: '사용' },
                  { value: 0, label: '미사용' },
                ]}
              />
            );
          }
          return (
            <span
              className={`inline-flex items-center justify-center w-[44px] h-[20px] leading-none px-1.5 rounded text-[11px] font-medium ${
                inherited
                  ? 'text-gray-400 bg-gray-50 border border-gray-200'
                  : on
                    ? 'text-green-700 bg-green-50 border border-green-200'
                    : 'text-gray-500 bg-gray-50 border border-gray-200'
              }`}
            >
              {on ? '사용' : '미사용'}
            </span>
          );
        },
      },
      // ── 가중치 (UTIL %) ──────────────────────────────────────────────────
      {
        headerName: '가중치(%)',
        colId: 'mediaUtil',
        flex: 0.8,
        minWidth: 90,
        cellStyle: valueCellStyle,
        cellRenderer: numberCell('util', MEDIA_OPTION_BOUNDS.util),
      },
      // ── 동시 최대 (MAX) ──────────────────────────────────────────────────
      {
        headerName: '동시최대',
        colId: 'mediaMax',
        flex: 0.7,
        minWidth: 84,
        cellStyle: valueCellStyle,
        cellRenderer: numberCell('max', MEDIA_OPTION_BOUNDS.max),
      },
      // ── 후처리 (AFC, 초) ─────────────────────────────────────────────────
      {
        headerName: '후처리(초)',
        colId: 'mediaAfc',
        flex: 0.8,
        minWidth: 90,
        cellStyle: valueCellStyle,
        cellRenderer: numberCell('afctime', MEDIA_OPTION_BOUNDS.afctime),
      },
      // ── 자동응답 여부 ────────────────────────────────────────────────────
      {
        headerName: '자동응답',
        colId: 'mediaAutoMode',
        flex: 0.8,
        minWidth: 96,
        cellStyle: valueCellStyle,
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
          const agent = params.data;
          if (!agent) return null;
          const inherited = inheritedOf(agent);
          const editing = isEditingRow(agent);
          const opt = optOf(agent);
          const used = !!opt.use;
          const auto = opt.autoanswerMode === 1;
          if (!used) return <span className="text-[12px] text-gray-300">–</span>;
          if (!inherited && editing) {
            return (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={auto ? 1 : 0}
                onChange={(v) => setOpt({ autoanswerMode: v })}
                options={[
                  { value: 0, label: '안함' },
                  { value: 1, label: '사용' },
                ]}
              />
            );
          }
          return <span className={`text-[12px] font-medium ${inherited ? 'text-gray-400' : auto ? 'text-[#405189]' : 'text-gray-500'}`}>{auto ? '사용' : '안함'}</span>;
        },
      },
      // ── 자동응답 시간 (초) — 자동응답=사용일 때만 ─────────────────────────
      {
        headerName: '자동응답(초)',
        colId: 'mediaAutoTime',
        flex: 0.85,
        minWidth: 100,
        cellStyle: valueCellStyle,
        cellRenderer: numberCell('autoanswerTime', MEDIA_OPTION_BOUNDS.autoanswerTime, { suffix: 's', onlyWhenAuto: true }),
      },
    ];

    return base;
    // draftRev/mediaKey: 버퍼·미디어 변경 시 셀 재렌더 트리거
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAgentId, draftUseGrp, draftMatrix, draftRev, mediaKey, saving, startEdit, saveEdit, cancelEdit, setOpt, valueCellStyle, numberCell, inheritedOf, isEditingRow, optOf]);

  return (
    <div className="flex flex-col h-full">
      {/* 상단 Media Type 선택 툴바 (SWAT 검색바 Media Type 셀렉트 정합) */}
      <div className="flex items-center gap-2 px-3 h-[40px] border-b border-gray-100 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-600">미디어 종류</span>
        <Select
          size="small"
          style={{ width: 150 }}
          value={mediaKey}
          onChange={(v: MediaKey) => {
            setMediaKey(v);
            // 미디어 전환 시 진행 중 편집은 취소 (편집 버퍼는 미디어 전체를 유지하나, 혼동 방지)
            setEditingAgentId(null);
          }}
          options={MEDIA_TYPE_OPTIONS}
        />
        <span className="text-[11px] text-gray-400">선택한 미디어의 옵션 값을 행마다 직접 보고 수정합니다 (그룹 상속 행은 회색·읽기전용)</span>
      </div>
      <div className="flex-1 min-h-0">
        <AgGridReact<AgentResponse>
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => String(p.data.agentId)}
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
      </div>
    </div>
  );
}
