/**
 * 상담사 미디어 옵션 현황표 (AS-IS SWAT IPR20S4060 정합).
 *
 * SWAT 원본 동작:
 *   - 상단 [Media Type] 셀렉트로 미디어 1종을 선택.
 *   - 그리드는 그 미디어의 값을 상담사 행마다 평면 컬럼으로 직접 표시·인라인 편집.
 *   - useGrpMdaOpt=1(그룹 상속) 행은 그룹 실효값을 회색/비활성으로 표시(편집 불가).
 *
 * BSR 패턴 (2026-06-07):
 *   - 자동저장(blur/change → 즉시 PUT) 제거.
 *   - 셀 인라인 에디트(InputNumber/Select) 유지.
 *     값이 바뀐 행 = dirty → 행 배경 파란색 + 상단 배지.
 *   - 상단 "저장" 버튼 → dirty 행들 일괄 PUT (ipron-agent-master-update).
 *   - 무변경이면 저장 버튼 비활성.
 *   - 저장 성공 시 dirty 해제 + 토스트.
 *
 * [Fix 2026-06-07]
 *   [1] 자동저장 폐기 → 저장버튼+dirty행 BSR 패턴.
 *   [2] 자동응답(초) disable 제거: autoanswerMode off 행에서도 편집 가능.
 *       일괄적용의 mode-off skip 정책은 유지.
 *   [3] 체크박스: selectionColumnDef(ag-Grid 34 rowSelection.checkboxes=true)로
 *       맨 왼쪽 고정 단일 체크박스. colDef checkboxSelection 중복 금지.
 */
import { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CellStyle, ColDef, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, InputNumber, Select } from 'antd';
import { Lock } from 'lucide-react';
import { toast } from '@/shared-util';
import { MEDIA_OPTION_BOUNDS } from '../constants/codes';
import type { AgentMediaMatrix, AgentMediaOption, AgentResponse, AgentUpdateRequest } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * MediaKey: AgentMediaMatrix 필드명 (FE 내부 camelCase).
 * 서버 숫자코드 ↔ key 매핑은 codes.ts 의 MEDIA_TYPE_CODE_TO_KEY.
 */
export type MediaKey = 'chat' | 'videoVoice' | 'videoChat' | 'email' | 'fax' | 'voip' | 'mvoip' | 'sms';

/** 선택 가능한 미디어 한 항목 (동적 목록에서 파생). */
export interface MediaOption {
  key: MediaKey;
  label: string;
}

const DEFAULT_OPT: AgentMediaOption = {
  use: false,
  autoansUse: false,
  autoanswerMode: 0,
  autoanswerTime: 2,
  util: 1,
  max: 1,
  afctime: 30,
};

/** AgentResponse.mediaMatrix 를 편집용 매트릭스로 정규화 (활성 미디어 키만). */
function normalizeMatrix(src: AgentMediaMatrix | null | undefined, keys?: readonly MediaKey[]): AgentMediaMatrix {
  const ensure = (o: AgentMediaOption | null | undefined): AgentMediaOption => (o ? { ...o } : { ...DEFAULT_OPT });
  // keys 미지정 시 전체 8종 (하위 호환)
  const all: MediaKey[] = keys?.length ? [...keys] : ['chat', 'videoVoice', 'videoChat', 'email', 'fax', 'voip', 'mvoip', 'sms'];
  const result: AgentMediaMatrix = {} as AgentMediaMatrix;
  for (const k of all) {
    result[k] = ensure(src?.[k]);
  }
  return result;
}

/** 행(상담사) + 편집된 매트릭스/그룹옵션으로 상담사 update 페이로드 구성. */
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

/**
 * BSR dirty 상태 맵.
 * key = agentId, value = { matrix, useGrpMdaOpt } (현재 편집중 값).
 * 원본(rowData) 대비 달라진 행만 여기에 존재.
 */
interface DirtyEntry {
  matrix: AgentMediaMatrix;
  useGrpMdaOpt: number;
}

/**
 * 선택된 행에 일괄 적용할 컬럼+값 페어.
 * - autoanswerTime 일괄적용 시 autoanswerMode !== 1 행은 skip (SWAT 정합).
 */
export type BulkNumericField = 'util' | 'max' | 'afctime' | 'autoanswerTime';
export type BulkSelectField = 'use' | 'autoanswerMode';
export type BulkField = BulkNumericField | BulkSelectField;

export interface BulkApplyTarget {
  field: BulkField;
  value: number;
}

export interface AgentMediaStatusTableHandle {
  /** dirty 행을 일괄 저장합니다. */
  save: () => void;
}

interface AgentMediaStatusTableProps {
  rowData: AgentResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (agent: AgentResponse) => void;
  /**
   * BSR 저장 버튼 클릭 시 호출.
   * entries: dirty 행들의 { agentId, body } 배열.
   * 성공 시 clearDirty() 호출해 dirty 해제.
   */
  onSaveDirty: (entries: { agentId: number; body: AgentUpdateRequest }[], clearDirty: () => void) => void;
  /** 저장 진행 중 (mutation isPending). */
  saving?: boolean;
  /** 현재 선택된 미디어 종류 — 부모 탭 헤더에서 제어. */
  mediaKey: MediaKey;
  /** dirty 행 수가 변경될 때 부모에 알림. */
  onDirtyChange?: (count: number) => void;
  /**
   * 등록·활성화된 미디어 목록 (서버 동적).
   * 미지정 시 8종 전체 표시 (하위 호환).
   */
  availableMediaOptions?: MediaOption[];
}

// ─── React Context — 셀 렌더러에 dirty 상태 공유 ────────────────────────────

interface MediaEditCtx {
  activeMediaKey: MediaKey;
  dirtyMap: Map<number, DirtyEntry>;
  setDirtyEntry: (agentId: number, entry: DirtyEntry | null) => void;
  getAgentCurrentEntry: (agentId: number) => DirtyEntry | null;
}

const MediaEditContext = createContext<MediaEditCtx | null>(null);

function useMediaEdit() {
  const ctx = useContext(MediaEditContext);
  if (!ctx) throw new Error('MediaEditContext missing');
  return ctx;
}

// ─── 셀 렌더러 컴포넌트 ───────────────────────────────────────────────────────

/** 상담사명 셀 */
function AgentNameCell({ params }: { params: ICellRendererParams<AgentResponse> }) {
  const { dirtyMap } = useMediaEdit();
  if (!params.data) return null;
  const inherited = isInherited(params.data);
  const dirty = dirtyMap.has(params.data.agentId);
  return (
    <span className={`font-semibold text-[12px] ${inherited ? 'text-gray-400' : dirty ? 'text-[#405189]' : 'text-gray-800'}`}>
      {params.data.agentName}
      {inherited && <Lock className="inline-block ml-1 size-3 text-gray-300" />}
      {dirty && !inherited && <span className="ml-1 inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-[#405189]" />}
    </span>
  );
}

/** 로그인ID 셀 */
function AgentLoginIdCell({ params }: { params: ICellRendererParams<AgentResponse> }) {
  if (!params.data) return null;
  return <span className="text-[11px] text-gray-500">{params.data.agentLoginId}</span>;
}

/**
 * 미디어옵션(개별/그룹) 셀 — 상시 Select 렌더.
 * 그룹상속(inherited) 행은 뱃지만 표시(읽기전용).
 * onChange → dirty 에 기록(즉시 PUT 없음).
 */
function UseGrpMdaOptCell({ params }: { params: ICellRendererParams<AgentResponse> }) {
  const { activeMediaKey, dirtyMap, setDirtyEntry, getAgentCurrentEntry } = useMediaEdit();
  const data = params.data;

  // 로컬 state: 현재 행의 useGrpMdaOpt (dirty 포함) — hooks 규칙: early return 이전에 선언
  const dirtyEntry = data ? dirtyMap.get(data.agentId) : undefined;
  const currentVal = dirtyEntry?.useGrpMdaOpt ?? data?.useGrpMdaOpt ?? 0;
  const origRef = useRef(data?.useGrpMdaOpt ?? 0);

  // rowData 교체 시 로컬 동기화
  useEffect(() => {
    origRef.current = data?.useGrpMdaOpt ?? 0;
  }, [data?.useGrpMdaOpt, data?.agentId, activeMediaKey]);

  if (!data) return null;
  const inherited = isInherited(data);

  if (inherited) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ cursor: 'default' }}>
        <span className="inline-flex items-center justify-center gap-1 w-[48px] h-[20px] leading-none px-1.5 rounded text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200">
          그룹
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Select
        size="small"
        style={{ width: 84 }}
        value={currentVal}
        onChange={(v) => {
          const current = getAgentCurrentEntry(data.agentId);
          const matrix = current?.matrix ?? normalizeMatrix(data.mediaMatrix);
          const entry: DirtyEntry = { matrix, useGrpMdaOpt: v };
          // 원본과 같으면 dirty 해제, 다르면 등록
          const origMatrix = normalizeMatrix(data.mediaMatrix);
          const sameAsOrig = v === (data.useGrpMdaOpt ?? 0) && JSON.stringify(matrix) === JSON.stringify(origMatrix);
          setDirtyEntry(data.agentId, sameAsOrig ? null : entry);
        }}
        options={[
          { value: 0, label: '개별' },
          { value: 1, label: '그룹' },
        ]}
      />
    </div>
  );
}

/**
 * 사용 여부 셀 — 상시 Select 렌더.
 * 그룹상속 행은 뱃지 표시만.
 */
function MediaUseCell({ params }: { params: ICellRendererParams<AgentResponse> }) {
  const { activeMediaKey, dirtyMap, setDirtyEntry, getAgentCurrentEntry } = useMediaEdit();
  const agent = params.data;
  if (!agent) return null;
  const inherited = isInherited(agent);
  const srcOpt = agent.mediaMatrix?.[activeMediaKey] ?? DEFAULT_OPT;

  const dirtyEntry = dirtyMap.get(agent.agentId);
  const currentMatrix = dirtyEntry?.matrix ?? normalizeMatrix(agent.mediaMatrix);
  const currentVal = currentMatrix[activeMediaKey]?.use ? 1 : 0;

  if (inherited) {
    const on = !!srcOpt.use;
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ cursor: 'default' }}>
        <span className="inline-flex items-center justify-center w-[48px] h-[20px] leading-none px-1.5 rounded text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-200">
          {on ? '사용' : '미사용'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Select
        size="small"
        style={{ width: '100%' }}
        value={currentVal}
        onChange={(v) => {
          const current = getAgentCurrentEntry(agent.agentId);
          const matrix = current?.matrix ?? normalizeMatrix(agent.mediaMatrix);
          const patched: AgentMediaMatrix = {
            ...matrix,
            [activeMediaKey]: { ...matrix[activeMediaKey]!, use: v === 1 },
          };
          const useGrpMdaOpt = current?.useGrpMdaOpt ?? agent.useGrpMdaOpt ?? 0;
          const origMatrix = normalizeMatrix(agent.mediaMatrix);
          const sameAsOrig = useGrpMdaOpt === (agent.useGrpMdaOpt ?? 0) && JSON.stringify(patched) === JSON.stringify(origMatrix);
          setDirtyEntry(agent.agentId, sameAsOrig ? null : { matrix: patched, useGrpMdaOpt });
        }}
        options={[
          { value: 1, label: '사용' },
          { value: 0, label: '미사용' },
        ]}
      />
    </div>
  );
}

/**
 * 숫자 편집 셀 (가중치/동시최대/후처리/자동응답시간) — 상시 InputNumber 렌더.
 * - inherited 행: span 읽기전용.
 * - [Fix-2] onlyWhenAuto 제거: 자동응답(초)도 항상 편집 가능 (SWAT 정합).
 * - onBlur 에서 dirty 맵에 기록 (즉시 PUT 없음).
 */
function NumberEditCell({
  params,
  field,
  bounds,
  suffix,
}: {
  params: ICellRendererParams<AgentResponse>;
  field: 'util' | 'max' | 'afctime' | 'autoanswerTime';
  bounds: { min: number; max: number };
  suffix?: string;
}) {
  const { activeMediaKey, dirtyMap, setDirtyEntry, getAgentCurrentEntry } = useMediaEdit();
  const agent = params.data;

  // hooks 규칙: early return 이전에 모두 선언
  const dirtyEntry = agent ? dirtyMap.get(agent.agentId) : undefined;
  const currentMatrix = dirtyEntry?.matrix ?? normalizeMatrix(agent?.mediaMatrix);
  const currentVal = (currentMatrix[activeMediaKey]?.[field] as number | undefined) ?? bounds.min;

  // 로컬 UI state — 입력 중 임시값 (blur 시 dirty 기록)
  const [localVal, setLocalVal] = useState<number>(currentVal);

  // dirty 맵 또는 rowData 교체 시 로컬 동기화
  useEffect(() => {
    setLocalVal(currentVal);
  }, [currentVal]);

  if (!agent) return null;
  const inherited = isInherited(agent);
  const srcOpt = agent.mediaMatrix?.[activeMediaKey] ?? DEFAULT_OPT;

  if (inherited) {
    const used = !!srcOpt.use;
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ cursor: 'default' }}>
        <span className="text-[12px] text-gray-400">{used ? `${srcOpt[field] ?? 0}${suffix ?? ''}` : '–'}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <InputNumber
        size="small"
        style={{ width: '100%' }}
        min={bounds.min}
        max={bounds.max}
        value={localVal}
        onChange={(v) => setLocalVal(typeof v === 'number' ? v : localVal)}
        onBlur={() => {
          const clamped = Math.min(bounds.max, Math.max(bounds.min, localVal));
          if (clamped !== localVal) setLocalVal(clamped);
          const current = getAgentCurrentEntry(agent.agentId);
          const matrix = current?.matrix ?? normalizeMatrix(agent.mediaMatrix);
          const patched: AgentMediaMatrix = {
            ...matrix,
            [activeMediaKey]: { ...matrix[activeMediaKey]!, [field]: clamped },
          };
          const useGrpMdaOpt = current?.useGrpMdaOpt ?? agent.useGrpMdaOpt ?? 0;
          const origMatrix = normalizeMatrix(agent.mediaMatrix);
          const sameAsOrig = useGrpMdaOpt === (agent.useGrpMdaOpt ?? 0) && JSON.stringify(patched) === JSON.stringify(origMatrix);
          setDirtyEntry(agent.agentId, sameAsOrig ? null : { matrix: patched, useGrpMdaOpt });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLElement).blur();
        }}
      />
    </div>
  );
}

/**
 * 자동응답 여부 셀 — 상시 Select 렌더.
 * inherited 행: span 읽기전용.
 */
function AutoModeCell({ params }: { params: ICellRendererParams<AgentResponse> }) {
  const { activeMediaKey, dirtyMap, setDirtyEntry, getAgentCurrentEntry } = useMediaEdit();
  const agent = params.data;
  if (!agent) return null;
  const inherited = isInherited(agent);
  const srcOpt = agent.mediaMatrix?.[activeMediaKey] ?? DEFAULT_OPT;

  const dirtyEntry = dirtyMap.get(agent.agentId);
  const currentMatrix = dirtyEntry?.matrix ?? normalizeMatrix(agent.mediaMatrix);
  const currentVal = currentMatrix[activeMediaKey]?.autoanswerMode ?? 0;

  if (inherited) {
    const auto = srcOpt.autoanswerMode === 1;
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ cursor: 'default' }}>
        <span className="text-[12px] font-medium text-gray-400">{auto ? '사용' : '안함'}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Select
        size="small"
        style={{ width: '100%' }}
        value={currentVal}
        onChange={(v) => {
          const current = getAgentCurrentEntry(agent.agentId);
          const matrix = current?.matrix ?? normalizeMatrix(agent.mediaMatrix);
          const patched: AgentMediaMatrix = {
            ...matrix,
            [activeMediaKey]: { ...matrix[activeMediaKey]!, autoanswerMode: v },
          };
          const useGrpMdaOpt = current?.useGrpMdaOpt ?? agent.useGrpMdaOpt ?? 0;
          const origMatrix = normalizeMatrix(agent.mediaMatrix);
          const sameAsOrig = useGrpMdaOpt === (agent.useGrpMdaOpt ?? 0) && JSON.stringify(patched) === JSON.stringify(origMatrix);
          setDirtyEntry(agent.agentId, sameAsOrig ? null : { matrix: patched, useGrpMdaOpt });
        }}
        options={[
          { value: 0, label: '안함' },
          { value: 1, label: '사용' },
        ]}
      />
    </div>
  );
}

// ─── columnDefs 모듈 상수 ─────────────────────────────────────────────────────

const EDITABLE_CELL_STYLE_BASE: CellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 6px',
};

/**
 * [Fix-3] 체크박스: rowSelection.checkboxes=true 가 selectionColumnDef 로
 * 맨 왼쪽 고정 단일 체크박스 삽입. colDef 에 checkboxSelection 추가 금지.
 */
const STATIC_COL_DEFS: ColDef<AgentResponse>[] = [
  {
    headerName: '상담사명',
    field: 'agentName',
    width: 100,
    minWidth: 90,
    pinned: 'left',
    cellStyle: { display: 'flex', alignItems: 'center' } as CellStyle,
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <AgentNameCell params={params} />,
  },
  {
    headerName: '로그인 ID',
    field: 'agentLoginId',
    width: 110,
    minWidth: 90,
    pinned: 'left',
    cellStyle: { display: 'flex', alignItems: 'center' } as CellStyle,
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <AgentLoginIdCell params={params} />,
  },
  { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 90, valueFormatter: (p) => p.value ?? '-' },
  { headerName: '그룹', field: 'groupName', flex: 1, minWidth: 90, valueFormatter: (p) => p.value ?? '-' },
  {
    headerName: '미디어옵션',
    colId: 'useGrpMdaOpt',
    flex: 0.85,
    minWidth: 100,
    cellStyle: EDITABLE_CELL_STYLE_BASE,
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <UseGrpMdaOptCell params={params} />,
  },
  {
    headerName: '사용',
    colId: 'mediaUse',
    flex: 0.7,
    minWidth: 80,
    cellStyle: EDITABLE_CELL_STYLE_BASE,
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <MediaUseCell params={params} />,
  },
  {
    headerName: '가중치(%)',
    colId: 'mediaUtil',
    flex: 0.8,
    minWidth: 90,
    cellStyle: EDITABLE_CELL_STYLE_BASE,
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <NumberEditCell params={params} field="util" bounds={MEDIA_OPTION_BOUNDS.util} />,
  },
  {
    headerName: '동시최대',
    colId: 'mediaMax',
    flex: 0.7,
    minWidth: 84,
    cellStyle: EDITABLE_CELL_STYLE_BASE,
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <NumberEditCell params={params} field="max" bounds={MEDIA_OPTION_BOUNDS.max} />,
  },
  {
    headerName: '후처리(초)',
    colId: 'mediaAfc',
    flex: 0.8,
    minWidth: 90,
    cellStyle: EDITABLE_CELL_STYLE_BASE,
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <NumberEditCell params={params} field="afctime" bounds={MEDIA_OPTION_BOUNDS.afctime} />,
  },
  {
    headerName: '자동응답',
    colId: 'mediaAutoMode',
    flex: 0.8,
    minWidth: 96,
    cellStyle: EDITABLE_CELL_STYLE_BASE,
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <AutoModeCell params={params} />,
  },
  {
    headerName: '자동응답(초)',
    colId: 'mediaAutoTime',
    flex: 0.85,
    minWidth: 100,
    cellStyle: EDITABLE_CELL_STYLE_BASE,
    // [Fix-2] onlyWhenAuto 제거 — 항상 편집 가능
    cellRenderer: (params: ICellRendererParams<AgentResponse>) => <NumberEditCell params={params} field="autoanswerTime" bounds={MEDIA_OPTION_BOUNDS.autoanswerTime} suffix="s" />,
  },
];

/** 일괄적용 컬럼 옵션 */
const BULK_FIELD_OPTIONS: { value: BulkField; label: string }[] = [
  { value: 'use', label: '사용여부' },
  { value: 'util', label: '가중치(%)' },
  { value: 'max', label: '동시최대' },
  { value: 'afctime', label: '후처리(초)' },
  { value: 'autoanswerMode', label: '자동응답모드' },
  { value: 'autoanswerTime', label: '자동응답(초)' },
];

const BULK_SELECT_YES_NO: { value: number; label: string }[] = [
  { value: 1, label: '사용' },
  { value: 0, label: '미사용' },
];

function isBulkSelectField(field: BulkField): field is BulkSelectField {
  return field === 'use' || field === 'autoanswerMode';
}

function getBulkBounds(field: BulkField): { min: number; max: number } | null {
  if (isBulkSelectField(field)) return null;
  return MEDIA_OPTION_BOUNDS[field] ?? null;
}

/**
 * [Fix-3] ag-Grid 34 rowSelection 직접 prop.
 * checkboxes: true → selectionColumnDef 가 맨 왼쪽에 pinned 체크박스 1개 삽입.
 * colDef 에 checkboxSelection 추가 금지 (중복 → 2개 렌더 버그).
 */
const MEDIA_ROW_SELECTION = {
  mode: 'multiRow' as const,
  checkboxes: true,
  enableClickSelection: false,
  headerCheckbox: true,
};

/**
 * [Fix-5] SelectionColumn 을 pinned:'left' 로 고정.
 * rowSelection.checkboxes=true 의 자동 SelectionColumn 은 기본 비고정이라
 * pinned 텍스트 컬럼(상담사명/로그인ID) 뒤로 밀림 → 명시적 pinned:'left' 부여.
 * IPRON 레이아웃 표준: 체크박스 첫 컬럼 width44 pinned:left.
 */
const MEDIA_SELECTION_COL_DEF = {
  pinned: 'left' as const,
  width: 44,
  minWidth: 44,
  maxWidth: 44,
};

/**
 * dirty 행 배경색 (BSR 미저장 변경 행 패턴).
 * ag-Grid rowClassRules 로 적용.
 */
const ROW_CLASS_RULES = {
  'ag-row-dirty-blue': (params: { data?: AgentResponse; context?: { dirtySet?: Set<number> } }) => {
    if (!params.data || !params.context?.dirtySet) return false;
    return params.context.dirtySet.has(params.data.agentId);
  },
};

/** 전체 8종 기본 옵션 (availableMediaOptions 미지정 시 폴백). */
const ALL_MEDIA_OPTIONS: MediaOption[] = [
  { key: 'voip', label: 'VOIP' },
  { key: 'chat', label: 'Chat' },
  { key: 'videoVoice', label: 'Video Voice' },
  { key: 'videoChat', label: 'Video Chat' },
  { key: 'email', label: 'Email' },
  { key: 'fax', label: 'Fax' },
  { key: 'mvoip', label: 'MVOIP' },
  { key: 'sms', label: 'SMS / WEB' },
];

const AgentMediaStatusTable = forwardRef<AgentMediaStatusTableHandle, AgentMediaStatusTableProps>(function AgentMediaStatusTable(
  { rowData, isLoading, onRowDoubleClicked, onSaveDirty, saving, mediaKey, onDirtyChange, availableMediaOptions },
  ref,
) {
  const activeMediaOptions = availableMediaOptions?.length ? availableMediaOptions : ALL_MEDIA_OPTIONS;
  const activeMediaKeys = useMemo(() => activeMediaOptions.map((o) => o.key), [activeMediaOptions]);
  const { gridOptions } = useAggridOptions();

  const stableGridOptions = useMemo(
    () => ({
      ...gridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: false,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const gridRef = useRef<AgGridReactType<AgentResponse>>(null);

  const [selectedAgents, setSelectedAgents] = useState<AgentResponse[]>([]);
  const [bulkField, setBulkField] = useState<BulkField>('use');
  const [bulkValue, setBulkValue] = useState<number>(1);

  // ─── BSR dirty 상태 ──────────────────────────────────────────────────────
  const [dirtyMap, setDirtyMap] = useState<Map<number, DirtyEntry>>(new Map());

  const setDirtyEntry = useCallback((agentId: number, entry: DirtyEntry | null) => {
    setDirtyMap((prev) => {
      const next = new Map(prev);
      if (entry === null) {
        next.delete(agentId);
      } else {
        next.set(agentId, entry);
      }
      return next;
    });
  }, []);

  const getAgentCurrentEntry = useCallback(
    (agentId: number): DirtyEntry | null => {
      return dirtyMap.get(agentId) ?? null;
    },
    [dirtyMap],
  );

  const clearDirty = useCallback(() => {
    setDirtyMap(new Map());
  }, []);

  // rowData 교체(미디어키 전환 포함) 시 dirty 초기화
  useEffect(() => {
    setDirtyMap(new Map());
  }, [rowData, mediaKey]);

  const hasDirty = dirtyMap.size > 0;
  const dirtySet = useMemo(() => new Set(dirtyMap.keys()), [dirtyMap]);

  // dirty 카운트 변경 시 부모에 알림
  useEffect(() => {
    onDirtyChange?.(dirtyMap.size);
  }, [dirtyMap.size, onDirtyChange]);

  // ag-Grid context (rowClassRules 에서 dirtySet 참조)
  const gridContext = useMemo(() => ({ dirtySet }), [dirtySet]);

  // [Fix-2] dirtyMap 변경 시 ag-Grid 에 rowClassRules 재평가 강제.
  // ag-Grid 는 React context/state 변경을 감지하지 않으므로
  // redrawRows() 를 명시 호출해야 dirty 행 배경(#eff3ff)이 반영됨.
  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.redrawRows();
  }, [dirtySet]);

  // ─── 저장 버튼 핸들러 ────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!hasDirty) return;
    const entries: { agentId: number; body: AgentUpdateRequest }[] = [];
    for (const [agentId, entry] of dirtyMap) {
      const agent = rowData.find((a) => a.agentId === agentId);
      if (!agent) continue;
      entries.push({
        agentId,
        body: toUpdateBody(agent, entry.matrix, entry.useGrpMdaOpt),
      });
    }
    if (entries.length === 0) return;
    onSaveDirty(entries, clearDirty);
  }, [hasDirty, dirtyMap, rowData, onSaveDirty, clearDirty]);

  // 부모에서 저장을 트리거할 수 있도록 save 메서드 노출
  useImperativeHandle(
    ref,
    () => ({
      save: handleSave,
    }),
    [handleSave],
  );

  // ─── Context value ───────────────────────────────────────────────────────
  const ctxValue = useMemo<MediaEditCtx>(
    () => ({
      activeMediaKey: mediaKey,
      dirtyMap,
      setDirtyEntry,
      getAgentCurrentEntry,
    }),
    [mediaKey, dirtyMap, setDirtyEntry, getAgentCurrentEntry],
  );

  // ─── 일괄적용 ────────────────────────────────────────────────────────────
  const handleBulkApply = useCallback(() => {
    const eligible = selectedAgents.filter((a) => !isInherited(a));
    if (eligible.length === 0) return;

    let skippedAutoTime = 0;
    eligible.forEach((agent) => {
      if (bulkField === 'autoanswerTime') {
        const currentMode = dirtyMap.get(agent.agentId)?.matrix?.[mediaKey]?.autoanswerMode ?? agent.mediaMatrix?.[mediaKey]?.autoanswerMode ?? 0;
        if (currentMode !== 1) {
          skippedAutoTime++;
          return;
        }
      }

      const currentEntry = dirtyMap.get(agent.agentId);
      const matrix = currentEntry?.matrix ?? normalizeMatrix(agent.mediaMatrix);
      const patchValue = bulkField === 'use' ? bulkValue === 1 : bulkValue;
      const patched: AgentMediaMatrix = {
        ...matrix,
        [mediaKey]: { ...matrix[mediaKey]!, [bulkField]: patchValue },
      };
      const useGrpMdaOpt = currentEntry?.useGrpMdaOpt ?? agent.useGrpMdaOpt ?? 0;

      // dirty 비교 (원본 대비)
      const origMatrix = normalizeMatrix(agent.mediaMatrix);
      const sameAsOrig = useGrpMdaOpt === (agent.useGrpMdaOpt ?? 0) && JSON.stringify(patched) === JSON.stringify(origMatrix);
      setDirtyEntry(agent.agentId, sameAsOrig ? null : { matrix: patched, useGrpMdaOpt });
    });

    if (skippedAutoTime > 0) {
      toast.warning(`자동응답모드 꺼진 ${skippedAutoTime}명은 자동응답(초) 적용에서 제외되었습니다.`);
    }
  }, [selectedAgents, mediaKey, bulkField, bulkValue, dirtyMap, setDirtyEntry]);

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const handleSelectionChanged = useCallback((e: SelectionChangedEvent<AgentResponse>) => {
    const nodes = e.api.getSelectedNodes();
    setSelectedAgents(nodes.map((n) => n.data!).filter(Boolean));
  }, []);

  const bulkBoundsOrNull = getBulkBounds(bulkField);
  const isSelectBulkField = isBulkSelectField(bulkField);
  const canBulkApply = selectedAgents.length > 0;

  const handleBulkFieldChange = useCallback((v: BulkField) => {
    setBulkField(v);
    if (v === 'use' || v === 'autoanswerMode') {
      setBulkValue(1);
    } else {
      const bounds = MEDIA_OPTION_BOUNDS[v as BulkNumericField];
      setBulkValue(bounds?.min ?? 0);
    }
  }, []);

  return (
    <MediaEditContext.Provider value={ctxValue}>
      <style>{`
        .ag-row-dirty-blue {
          background-color: #eff3ff !important;
        }
        .ag-row-dirty-blue:hover {
          background-color: #e5ebff !important;
        }
      `}</style>
      <div className="flex flex-col h-full gap-2">
        {/* ── 툴바: 일괄적용(좌) + 저장 버튼(우) ── */}
        <div className="flex items-center gap-2 px-1 py-1.5 bg-gray-50 border border-gray-200 rounded text-[12px]">
          {/* 일괄적용 */}
          <span className="text-gray-500 whitespace-nowrap">
            {selectedAgents.length > 0 ? (
              <>
                <span className="font-semibold text-[#405189]">{selectedAgents.length}명</span> 선택됨
              </>
            ) : (
              <span className="text-gray-400">행 체크 후 일괄적용</span>
            )}
          </span>
          <Select size="small" style={{ width: 120 }} value={bulkField} onChange={handleBulkFieldChange} options={BULK_FIELD_OPTIONS} />
          <span className="text-gray-400">=</span>
          {isSelectBulkField ? (
            <Select size="small" style={{ width: 90 }} value={bulkValue} onChange={(v) => setBulkValue(v)} options={BULK_SELECT_YES_NO} />
          ) : (
            <InputNumber
              size="small"
              style={{ width: 80 }}
              min={bulkBoundsOrNull?.min ?? 0}
              max={bulkBoundsOrNull?.max ?? 9999}
              value={bulkValue}
              onChange={(v) => setBulkValue(typeof v === 'number' ? v : 0)}
            />
          )}
          {bulkField === 'autoanswerTime' && <span className="text-[10px] text-amber-600 whitespace-nowrap">자동응답모드 ON 행에만 적용</span>}
          <button
            className={`px-3 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              canBulkApply ? 'bg-[#405189] text-white border-[#405189] hover:bg-[#405189]/90 cursor-pointer' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
            onClick={handleBulkApply}
            disabled={!canBulkApply}
            type="button"
          >
            선택 행에 적용
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <AgGridReact<AgentResponse>
            ref={gridRef}
            rowData={rowData}
            columnDefs={STATIC_COL_DEFS}
            defaultColDef={defaultColDef}
            getRowId={(p) => String(p.data.agentId)}
            gridOptions={stableGridOptions}
            rowSelection={MEDIA_ROW_SELECTION}
            selectionColumnDef={MEDIA_SELECTION_COL_DEF}
            rowClassRules={ROW_CLASS_RULES}
            context={gridContext}
            loading={isLoading}
            onSelectionChanged={handleSelectionChanged}
            onRowDoubleClicked={(e) => {
              if (e.data) onRowDoubleClicked(e.data);
            }}
          />
        </div>
      </div>
    </MediaEditContext.Provider>
  );
});

export default AgentMediaStatusTable;
