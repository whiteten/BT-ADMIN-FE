/**
 * CTI 큐 목록 ag-Grid 테이블 (단일 그리드, 멤버 없음) — AcdGdnTable 패턴.
 *
 * 두 가지 모드:
 *  · 일반 모드: ☐ | CTIQ ID | [업무그룹] | 그룹DN번호 | 그룹DN이름 | DR노드 | 글로벌여부 |
 *              기본 라우팅그룹 | 활성화 | 블록 | 최대대기(초) | 호회수T/O(초) | SL(초) | 큐포기(초) | 정렬순서
 *  · 스킬 매트릭스 모드("스킬 배정 보기" 토글 ON): CTIQ ID | 업무그룹명 | 그룹DN번호 | 그룹DN이름(핀 고정)
 *              + 활성 미디어마다 [스킬셋 콤보 + 레벨 입력] 단일 열. 셀 직접 편집 → 더티 행 amber.
 *
 * 행 더블클릭 → 5탭 Drawer (수정, 일반 모드만). 삭제는 상위 툴바 삭제 버튼. 페이지네이션 없음.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams, RowClassParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { InputNumber, Select } from 'antd';
import { GripVertical } from 'lucide-react';
import { BOOL_OX_LABEL } from '../../dn/utils/dnEnums';
import type { CtiQueueMediaSkillRowRequest, CtiQueueOptionItem, CtiQueueResponse } from '../types';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/** D&D 채널 — CtiQueueGroupTree.onDrop 과 협의된 MIME. 페이로드: JSON ctiqId 배열. */
export const CTI_QUEUE_DRAG_MIME = 'application/x-bt-ctiq-ids';

/** 매트릭스 모드 미디어 열 정의 (활성 미디어 1종 = 스킬셋ID 필드 + 레벨 필드 1쌍). */
export interface MediaSkillCol {
  /** 미디어 타입 코드 (0=VOIP …). */
  mediaType: number;
  /** 헤더 라벨(풀네임, 약어 금지). 예: "VOIP 기본 스킬". */
  label: string;
  /** CtiQueueResponse / RowRequest 의 스킬셋 ID 필드명. */
  idField: keyof CtiQueueMediaSkillRowRequest & string;
  /** CtiQueueResponse / RowRequest 의 레벨 필드명. */
  levelField: keyof CtiQueueMediaSkillRowRequest & string;
}

interface CtiQueueTableProps {
  rowData: CtiQueueResponse[];
  isLoading?: boolean;
  /** 기본 라우팅그룹 ID → 이름 매핑 (firstGroupId 표시용). */
  groupOptions?: CtiQueueOptionItem[];
  /** 노드 ID → 이름 매핑 (DR노드 컬럼 raw ID 노출 차단용). */
  nodeOptions?: { value: number; label: string }[];
  /** "업무그룹 보기" 토글 — ON 시 업무그룹명(treeName) 컬럼을 좌측에 추가 노출 + 드래그 핸들 표시. */
  groupView?: boolean;
  /** 현재 선택된 테넌트 ID. null = 전체보기(테넌트 컬럼 표시), non-null = 단일 테넌트(테넌트 컬럼 숨김). */
  selectedTenantId?: number | null;
  onRowDoubleClicked: (row: CtiQueueResponse) => void;
  onSelectionChanged?: (selected: CtiQueueResponse[]) => void;
  /** drag 시점에 dataTransfer 에 실어 보낼 ctiqId 배열 결정. 선택된 게 있으면 그것, 없으면 단건. */
  getDragCtiqIds?: (dragRow: CtiQueueResponse) => number[];

  // ─── 스킬 매트릭스 모드 ─────────────────────────────────────────────────────
  /** "스킬 배정 보기" 토글 — ON 시 컬럼셋을 미디어 스킬 매트릭스로 전환. */
  skillMatrixMode?: boolean;
  /** 활성 미디어 열 목록(라이선스 활성 미디어만 — 빈 컬럼 금지). */
  mediaCols?: MediaSkillCol[];
  /** 스킬셋 콤보 옵션(현재 카드 테넌트 스코프). raw ID 노출 금지 → 이름 매핑. */
  skillsetOptions?: CtiQueueOptionItem[];
  /** 셀 편집 가능 여부 (전체 카드 선택 시 false → 콤보·입력 비활성). */
  matrixEditable?: boolean;
  /** 더티 오버라이드 맵 (ctiqId → 변경된 스킬/레벨). */
  dirtyMap?: Record<number, Partial<CtiQueueMediaSkillRowRequest>>;
  /** 셀 값 변경 콜백 (ctiqId, 필드명, 값). */
  onMatrixCellChange?: (ctiqId: number, field: keyof CtiQueueMediaSkillRowRequest & string, value: number | null) => void;
}

const STATE_PILL_ON_CLASS = {
  emerald: 'text-emerald-600 bg-emerald-50',
  red: 'text-red-500 bg-red-50',
  blue: 'text-blue-600 bg-blue-50',
} as const;

function StatePill({ value, onText, offText, tone }: { value: number | null; onText: string; offText: string; tone: keyof typeof STATE_PILL_ON_CLASS }) {
  const on = value === 1;
  return (
    <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${on ? STATE_PILL_ON_CLASS[tone] : 'text-gray-500 bg-gray-100'}`}>
      {on ? onText : offText}
    </Badge>
  );
}

/**
 * 매트릭스 셀 — 스킬셋 콤보 + 레벨 입력. 더티 시 황색 점.
 * 콤보는 스킬셋 이름(raw ID 노출 금지), 미배정(빈 옵션). 레벨 0~99, 스킬 해제 시 자동 0·비활성.
 */
function MatrixSkillCell({
  ctiqId,
  skillId,
  level,
  col,
  skillSelectOptions,
  editable,
  dirty,
  onChange,
}: {
  ctiqId: number;
  skillId: number | null;
  level: number;
  col: MediaSkillCol;
  skillSelectOptions: { value: number | null; label: string }[];
  editable: boolean;
  dirty: boolean;
  onChange: (ctiqId: number, field: keyof CtiQueueMediaSkillRowRequest & string, value: number | null) => void;
}) {
  const hasSkill = skillId != null && skillId !== 0;

  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className={`size-[7px] rounded-full flex-shrink-0 ${dirty ? 'bg-amber-500' : 'bg-transparent'}`} title={dirty ? '변경됨' : undefined} />
      <Select<number | null>
        size="small"
        value={hasSkill ? skillId : null}
        options={skillSelectOptions}
        disabled={!editable}
        placeholder="미배정"
        allowClear
        style={{ flex: 1, minWidth: 130 }}
        popupMatchSelectWidth={false}
        onChange={(v) => {
          const next = v ?? null;
          onChange(ctiqId, col.idField, next);
          // 스킬 해제 시 레벨 자동 0
          if (next == null) onChange(ctiqId, col.levelField, 0);
        }}
      />
      <span className="text-[11px] text-gray-400 flex-shrink-0">레벨</span>
      <InputNumber
        size="small"
        min={0}
        max={99}
        value={hasSkill ? level : null}
        disabled={!editable || !hasSkill}
        placeholder="0"
        controls={false}
        style={{ width: 52 }}
        onChange={(v) => {
          const n = v == null ? 0 : Math.min(99, Math.max(0, Math.trunc(Number(v))));
          onChange(ctiqId, col.levelField, n);
        }}
      />
    </div>
  );
}

export default function CtiQueueTable({
  rowData,
  isLoading,
  groupOptions = [],
  nodeOptions = [],
  groupView = false,
  selectedTenantId = null,
  onRowDoubleClicked,
  onSelectionChanged,
  getDragCtiqIds,
  skillMatrixMode = false,
  mediaCols = [],
  skillsetOptions = [],
  matrixEditable = false,
  dirtyMap = {},
  onMatrixCellChange,
}: CtiQueueTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const groupNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of groupOptions) m.set(g.id, g.name);
    return m;
  }, [groupOptions]);

  // 노드 ID → 이름 매핑 맵 (DR노드 컬럼 raw ID 노출 차단, rule 4)
  const nodeNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const n of nodeOptions) m.set(n.value, n.label);
    return m;
  }, [nodeOptions]);

  const skillSelectOptions = useMemo<{ value: number | null; label: string }[]>(
    () => [{ value: null, label: '미배정' }, ...skillsetOptions.map((s) => ({ value: s.id, label: s.name }))],
    [skillsetOptions],
  );

  const num = (v: number | null | undefined) => (v == null ? '-' : Number(v).toLocaleString());

  // 현재 스킬ID/레벨(원본 + 더티 오버라이드) 헬퍼 — 필드별 단일 값으로 읽어 타입 충돌 회피.
  const readSkill = useMemo(() => {
    return (row: CtiQueueResponse, field: keyof CtiQueueMediaSkillRowRequest & string): number | null => {
      const d = dirtyMap[row.ctiqId];
      if (d && Object.prototype.hasOwnProperty.call(d, field)) {
        return (d as Record<string, number | null | undefined>)[field] ?? null;
      }
      return (row as unknown as Record<string, number | null | undefined>)[field] ?? null;
    };
  }, [dirtyMap]);

  // ─── 공통 핀 컬럼 (양 모드 공유: CTIQ ID / 업무그룹명 / 그룹DN번호 / 그룹DN이름) ──
  const pinnedIdentityCols: ColDef<CtiQueueResponse>[] = useMemo(
    () => [
      {
        headerName: 'CTIQ ID',
        field: 'ctiqId',
        pinned: 'left',
        minWidth: 90,
        maxWidth: 110,
        filter: 'agNumberColumnFilter',
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <span className="font-mono text-gray-700">{p.value ?? ''}</span>,
      },
      {
        headerName: '업무그룹명',
        field: 'treeName',
        colId: 'workGroupName',
        pinned: 'left',
        minWidth: 120,
        tooltipField: 'treeName',
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => {
          const v = p.data?.treeName;
          if (!v) return <span className="text-gray-400 text-xs">미배정</span>;
          return <span className="text-gray-800">{v}</span>;
        },
      },
      {
        headerName: '그룹DN번호',
        field: 'gdnNo',
        pinned: 'left',
        minWidth: 110,
        maxWidth: 140,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <span className="font-mono font-semibold text-gray-800">{p.value ?? '-'}</span>,
      },
      { headerName: '그룹DN이름', field: 'gdnName', pinned: 'left', minWidth: 140, maxWidth: 220, tooltipField: 'gdnName', valueFormatter: (p) => p.value ?? '-' },
    ],
    [],
  );

  // ─── 매트릭스 모드 미디어 컬럼 ──────────────────────────────────────────────
  const matrixColumnDefs: ColDef<CtiQueueResponse>[] = useMemo(() => {
    const mediaColDefs: ColDef<CtiQueueResponse>[] = mediaCols.map((mc) => ({
      headerName: mc.label,
      colId: `media-${mc.mediaType}`,
      minWidth: 230,
      flex: 1,
      sortable: false,
      // 콤보·입력 셀 — 필터 무의미 컬럼(규칙 3 개별 예외).
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', overflow: 'visible' } as CellStyle,
      cellRenderer: (params: ICellRendererParams<CtiQueueResponse>) => {
        const row = params.data;
        if (!row) return null;
        const d = dirtyMap[row.ctiqId];
        const cellDirty = !!d && (Object.prototype.hasOwnProperty.call(d, mc.idField) || Object.prototype.hasOwnProperty.call(d, mc.levelField));
        const skillId = readSkill(row, mc.idField);
        const level = readSkill(row, mc.levelField) ?? 0;
        return (
          <MatrixSkillCell
            ctiqId={row.ctiqId}
            skillId={skillId}
            level={level}
            col={mc}
            skillSelectOptions={skillSelectOptions}
            editable={matrixEditable}
            dirty={cellDirty}
            onChange={(id, field, value) => onMatrixCellChange?.(id, field, value)}
          />
        );
      },
    }));
    return [...pinnedIdentityCols, ...mediaColDefs];
  }, [mediaCols, pinnedIdentityCols, readSkill, dirtyMap, skillSelectOptions, matrixEditable, onMatrixCellChange]);

  // ─── 일반 모드 컬럼 ─────────────────────────────────────────────────────────
  const normalColumnDefs: ColDef<CtiQueueResponse>[] = useMemo(
    () => [
      {
        headerName: '',
        colId: 'dragHandle',
        width: 28,
        maxWidth: 28,
        pinned: 'left',
        sortable: false,
        filter: false,
        hide: !groupView,
        suppressHeaderMenuButton: true,
        cellStyle: { padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<CtiQueueResponse>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div
              draggable
              onDragStart={(e) => {
                const ids = getDragCtiqIds?.(data) ?? [data.ctiqId];
                e.dataTransfer.setData(CTI_QUEUE_DRAG_MIME, JSON.stringify(ids));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600"
              title="드래그하여 업무그룹 이동"
            >
              <GripVertical className="size-3.5" />
            </div>
          );
        },
      },
      {
        headerName: '테넌트',
        field: 'tenantName',
        flex: 1,
        minWidth: 120,
        tooltipField: 'tenantName',
        valueFormatter: (p) => p.value ?? '-',
        hide: selectedTenantId !== null,
      },
      {
        headerName: 'CTIQ ID',
        field: 'ctiqId',
        minWidth: 90,
        filter: 'agNumberColumnFilter',
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <span className="font-mono text-gray-700">{p.value ?? ''}</span>,
      },
      {
        headerName: '업무그룹명',
        field: 'treeName',
        colId: 'workGroupName',
        minWidth: 120,
        tooltipField: 'treeName',
        hide: !groupView,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => {
          const v = p.data?.treeName;
          if (!v) return <span className="text-gray-400 text-xs">미배정</span>;
          return <span className="text-gray-800">{v}</span>;
        },
      },
      {
        headerName: '그룹DN번호',
        field: 'gdnNo',
        flex: 1,
        minWidth: 110,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <span className="font-mono font-semibold text-gray-800">{p.value ?? '-'}</span>,
      },
      { headerName: '그룹DN이름', field: 'gdnName', flex: 2, minWidth: 140, tooltipField: 'gdnName', valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: 'DR노드',
        field: 'backUpNodeId',
        minWidth: 100,
        maxWidth: 160,
        cellStyle: { textAlign: 'center', color: '#9ca3af' } as CellStyle,
        // 노드명 매핑 (raw ID 노출 차단 — rule 4, null/0='-', 고아노드='-')
        valueFormatter: (p) => {
          if (p.value == null || p.value === 0) return '-';
          return nodeNameById.get(p.value) ?? '-';
        },
        // 필터도 이름으로 동작 — 셀 formatter 1:1 미러 (rule 3+4, Set Filter raw 누출 차단)
        filterValueGetter: (params) => {
          const v = params.data?.backUpNodeId;
          if (v == null || v === 0) return '-';
          return nodeNameById.get(v) ?? '-';
        },
      },
      {
        headerName: '글로벌여부',
        field: 'globalDnYn',
        minWidth: 110,
        maxWidth: 120,
        filterValueGetter: (params) => BOOL_OX_LABEL(params.data?.globalDnYn),
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => {
          const label = BOOL_OX_LABEL(p.value);
          return label === 'O' ? (
            <span className="inline-flex items-center justify-center h-[20px] px-1.5 leading-none rounded font-medium border text-green-700 bg-green-50 border-green-200">O</span>
          ) : (
            <span className="inline-flex items-center justify-center h-[20px] px-1.5 leading-none rounded font-medium border text-gray-400 bg-gray-50 border-gray-200">
              {label}
            </span>
          );
        },
      },
      {
        headerName: '기본 라우팅그룹',
        field: 'firstGroupId',
        flex: 1,
        minWidth: 130,
        valueFormatter: (p) => (p.value == null || p.value === 0 ? '없음' : (groupNameById.get(Number(p.value)) ?? '없음')),
        tooltipValueGetter: (p) => (p.value == null || p.value === 0 ? '없음' : (groupNameById.get(Number(p.value)) ?? '없음')),
        // 필터도 그룹명으로 동작 — 셀 formatter 1:1 미러 (rule 3+4, Set Filter raw 누출 차단)
        filterValueGetter: (params) => {
          const v = params.data?.firstGroupId;
          if (v == null || v === 0) return '없음';
          return groupNameById.get(Number(v)) ?? '없음';
        },
      },
      {
        headerName: '활성화',
        field: 'activateYn',
        minWidth: 80,
        maxWidth: 90,
        filterValueGetter: (params) => (params.data?.activateYn === 1 ? 'ON' : 'OFF'),
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <StatePill value={p.data?.activateYn ?? null} onText="ON" offText="OFF" tone="emerald" />,
      },
      {
        headerName: '블록',
        field: 'blockYn',
        minWidth: 80,
        maxWidth: 90,
        filterValueGetter: (params) => (params.data?.blockYn === 1 ? '설정' : '해제'),
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<CtiQueueResponse>) => <StatePill value={p.data?.blockYn ?? null} onText="설정" offText="해제" tone="red" />,
      },
      {
        headerName: '최대대기(초)',
        field: 'maxWaittime',
        minWidth: 110,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => num(p.value),
      },
      {
        headerName: '호회수 타임아웃(초)',
        field: 'collectTimeout',
        minWidth: 124,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => num(p.value),
      },
      {
        headerName: '서비스레벨(초)',
        field: 'serviceLevelTime',
        minWidth: 84,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => num(p.value),
      },
      {
        headerName: '큐포기(초)',
        field: 'abandonAcktime',
        minWidth: 100,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => num(p.value),
      },
      {
        headerName: '정렬순서',
        field: 'sortSeq',
        minWidth: 90,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'right' } as CellStyle,
        valueFormatter: (p) => num(p.value),
      },
    ],
    [groupView, groupNameById, nodeNameById, getDragCtiqIds, selectedTenantId],
  );

  const columnDefs = skillMatrixMode ? matrixColumnDefs : normalColumnDefs;

  // 매트릭스 모드 더티 행 amber 틴트.
  const getRowStyle = useMemo(() => {
    if (!skillMatrixMode) return undefined;
    return (params: RowClassParams<CtiQueueResponse>) => {
      const id = params.data?.ctiqId;
      if (id != null && dirtyMap[id]) return { backgroundColor: '#fffbeb' };
      return undefined;
    };
  }, [skillMatrixMode, dirtyMap]);

  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  return (
    <AgGridReact<CtiQueueResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      rowSelection={rowSelection}
      getRowStyle={getRowStyle}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
      }}
      loading={isLoading}
      onRowDoubleClicked={(e) => {
        // 매트릭스 모드: 셀 직접 편집 의도 → 드로어 억제.
        if (skillMatrixMode) return;
        if (e.data) onRowDoubleClicked(e.data);
      }}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
