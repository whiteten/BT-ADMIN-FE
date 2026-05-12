/**
 * 콜트래킹 검색 결과 ag-Grid (PBX 모드 — IE_BASICCDR).
 *
 * 컬럼 구성: doc/IPRON v6.3.1 IE 통계 및 CDR설계.xlsx — "교환기통화이력 표시항목"
 *
 * 기본 표시: 시작/종료/통화/벨울림/콜유형/홉유형/UCID/ANI/DNIS/종료유형/종료주체/연결
 * 숨김(컬럼 메뉴): 발신/착신 회선 상세, 종료사유, 노드/테넌트/시스템 ID 등
 */
import { useMemo } from 'react';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Copy, Phone, Users } from 'lucide-react';
import { toast } from '@/shared-util';
import type { CallSearchResult, TrackingMode } from '../types/tracking.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast.success('UCID 복사됨');
  } catch {
    toast.error('복사 실패');
  }
}

interface Props {
  rows: CallSearchResult[];
  loading?: boolean;
  /** 현재 트래킹 모드 — IVR 시 컬럼 셋 분기 */
  mode?: TrackingMode;
  onRowDoubleClick?: (row: CallSearchResult) => void;
  /** IVR 아이콘 클릭 시 IVR 모드 drill-down 검색 트리거 (PBX 모드만) */
  onIvrDrilldown?: (row: CallSearchResult) => void;
  /** CTI 아이콘 클릭 시 CTI 모드 drill-down 검색 트리거 (IVR 모드만) */
  onCtiDrilldown?: (row: CallSearchResult) => void;
}

const fmtDate = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const fmtDuration = (sec: number | null): string => {
  if (sec == null) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ── 코드값 라벨 매핑 (CDR 설계 문서 기준) ──
const CALL_KIND_LABEL: Record<number, { color: string; label: string }> = {
  0: { color: 'bg-emerald-50 text-emerald-700', label: '내선통화' },
  1: { color: 'bg-blue-50 text-blue-700', label: '국선수신' },
  2: { color: 'bg-purple-50 text-purple-700', label: '국선발신' },
  5: { color: 'bg-orange-50 text-orange-700', label: '데몬콜' },
};

const CALL_TYPE_LABEL: Record<number, string> = {
  0: '일반콜',
  1: '호이동',
  2: '호전달',
  3: '감청',
};

const CC_TYPE_LABEL: Record<number, { color: string; label: string }> = {
  0: { color: 'bg-emerald-50 text-emerald-700', label: '종료' },
  1: { color: 'bg-amber-50 text-amber-700', label: '포기' },
  2: { color: 'bg-gray-100 text-gray-600', label: 'FAC' },
  3: { color: 'bg-blue-50 text-blue-700', label: '분배' },
  4: { color: 'bg-purple-50 text-purple-700', label: '전환' },
  5: { color: 'bg-orange-50 text-orange-700', label: '회수' },
  6: { color: 'bg-red-50 text-red-700', label: '초과' },
};

const CC_PART_LABEL: Record<number, { color: string; label: string }> = {
  0: { color: 'bg-gray-100 text-gray-700', label: '계속진행' },
  1: { color: 'bg-blue-50 text-blue-700', label: '국선종료' },
  2: { color: 'bg-purple-50 text-purple-700', label: '내선종료' },
  3: { color: 'bg-amber-50 text-amber-700', label: '협의종료' },
  4: { color: 'bg-red-50 text-red-700', label: '시스템종료' },
};

const LINE_TYPE_LABEL: Record<number, string> = {
  0: 'None',
  1: '국선',
  2: '내선(EDN)',
  3: 'IVR',
  4: 'CTI',
};

// IR_CDR_STATUS — IVR 모드 종료 타입 (AS-IS 공통코드)
const IVR_END_STATUS_LABEL: Record<number, { color: string; label: string }> = {
  11: { color: 'bg-emerald-50 text-emerald-700', label: 'IVR 정상종료' },
  12: { color: 'bg-emerald-50 text-emerald-700', label: '고객 정상종료' },
  13: { color: 'bg-amber-50 text-amber-700', label: '고객 포기종료' },
  21: { color: 'bg-red-50 text-red-700', label: '시스템 강제종료' },
  22: { color: 'bg-red-50 text-red-700', label: '운영자 강제종료' },
  31: { color: 'bg-purple-50 text-purple-700', label: 'CTI 호전환' },
  32: { color: 'bg-purple-50 text-purple-700', label: '교환기 호전환' },
  88: { color: 'bg-blue-50 text-blue-700', label: '서비스 전환' },
  99: { color: 'bg-gray-100 text-gray-600', label: 'Unknown' },
};

const RESULT_BADGE: Record<string, { color: string; label: string }> = {
  NORMAL: { color: 'bg-emerald-50 text-emerald-700', label: '정상' },
  ABANDONED: { color: 'bg-amber-50 text-amber-700', label: '포기' },
  TRANSFERRED: { color: 'bg-purple-50 text-purple-700', label: '전환' },
  DISCONNECTED: { color: 'bg-red-50 text-red-700', label: '호단절' },
};

export default function SearchResultGrid({ rows, loading, mode = 'PBX', onRowDoubleClick, onIvrDrilldown, onCtiDrilldown }: Props) {
  const isIvr = mode === 'IVR';
  const { gridOptions } = useAggridOptions();

  const columnDefs = useMemo<ColDef<CallSearchResult>[]>(
    () => [
      // ── 기본 (시간 우선) ──
      {
        headerName: '시작시각',
        field: 'startTime',
        width: 160,
        sort: 'desc',
        valueFormatter: (p) => fmtDate(p.value as string),
      },
      {
        headerName: '종료시각',
        field: 'endTime',
        width: 160,
        valueFormatter: (p) => fmtDate(p.value as string | null),
      },
      {
        // 점유시간 = endTime - startTime (콜 전체 점유 = AS-IS 차감 계산 방식)
        headerName: '점유시간',
        colId: 'occupationSec',
        width: 95,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        valueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          if (!r?.startTime || !r?.endTime) return null;
          const s = new Date(r.startTime).getTime();
          const e = new Date(r.endTime).getTime();
          if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
          return Math.round((e - s) / 1000);
        },
        valueFormatter: (p) => fmtDuration(p.value as number | null),
      },
      // ── 분류 ──
      {
        headerName: '콜유형',
        field: 'callKind',
        width: 100,
        // 헤더 필터에 라벨로 노출되도록 valueGetter 사용 (셀은 cellRenderer 배지)
        valueGetter: (p) => {
          const v = p.data?.callKind;
          if (v == null) return '';
          return CALL_KIND_LABEL[v]?.label ?? String(v);
        },
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const v = p.data?.callKind;
          if (v == null) return '-';
          const meta = CALL_KIND_LABEL[v] ?? { color: 'bg-gray-100 text-gray-600', label: String(v) };
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.color}`}>{meta.label}</span>;
        },
      },
      {
        // CALL_TYPE 은 그 hop 단일 유형이라 마지막 hop만 보면 의미 약함 → 기본 숨김
        headerName: '홉유형',
        field: 'callType',
        width: 80,
        hide: true,
        valueGetter: (p) => {
          const v = p.data?.callType;
          if (v == null) return '';
          return CALL_TYPE_LABEL[v] ?? String(v);
        },
      },
      // ── UCID / 번호 ──
      {
        headerName: 'UCID',
        field: 'ucid',
        width: 240,
        tooltipField: 'ucid',
        cellRenderer: (p: { value: string | null }) => {
          const v = p.value ?? '';
          if (!v) return '-';
          return (
            <span className="font-mono text-[11px] flex items-center gap-1.5">
              <span className="truncate">{v}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  copyToClipboard(v);
                }}
                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition flex-shrink-0 p-0.5"
                title="UCID 복사"
              >
                <Copy className="size-3" />
              </button>
            </span>
          );
        },
      },
      {
        headerName: '발신번호',
        field: 'ani',
        width: 140,
        cellClass: 'font-mono text-[11px]',
      },
      {
        headerName: '수신번호',
        field: 'dnis',
        width: 120,
        cellClass: 'font-mono text-[11px]',
      },
      // IVR 전용 — 서비스 번호 (ORIGIN_DNIS, 최초인입)
      {
        headerName: '서비스 번호',
        field: 'originDnis',
        width: 120,
        hide: !isIvr,
        cellClass: 'font-mono text-[11px]',
      },
      // IVR 전용 — 시나리오명 (oName 자리에 SERVICE_NAME)
      {
        headerName: '시나리오명',
        field: 'oName',
        width: 160,
        hide: !isIvr,
      },
      // IVR 전용 — 종료 타입 (CDR_STATUS — IR_CDR_STATUS 공통코드)
      {
        headerName: '종료 타입',
        field: 'endStatus',
        width: 130,
        hide: !isIvr,
        valueGetter: (p) => {
          const v = p.data?.endStatus;
          return v != null ? (IVR_END_STATUS_LABEL[v]?.label ?? String(v)) : '';
        },
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const v = p.data?.endStatus;
          if (v == null) return '-';
          const meta = IVR_END_STATUS_LABEL[v] ?? { color: 'bg-gray-100 text-gray-600', label: String(v) };
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.color}`}>{meta.label}</span>;
        },
      },
      // IVR 전용 — CTI 진입 여부 + drill-down (REQ_AGENT_YN 으로 판단)
      {
        headerName: 'CTI',
        colId: 'ctiEntered',
        field: 'reqAgent',
        width: 70,
        hide: !isIvr,
        cellClass: 'text-center',
        valueGetter: (p) => ((p.data as CallSearchResult | undefined)?.reqAgent ? 'Y' : 'N'),
        filter: 'agSetColumnFilter',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          if (!p.data?.reqAgent) return <span className="text-gray-300">-</span>;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (p.data) onCtiDrilldown?.(p.data);
              }}
              title="CTI 모드로 이 콜 검색 (상담 분배 추적)"
              aria-label="CTI 모드로 검색"
              className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
            >
              <Users className="size-3.5" />
            </button>
          );
        },
      },
      {
        // IVR 연결 여부 (T_TYPE=3 hop 존재) — 아이콘 클릭 시 IVR 모드로 drill-down 검색 (PBX 모드만)
        headerName: 'IVR',
        colId: 'ivrEntered',
        field: 'ivrEntered',
        width: 70,
        hide: isIvr,
        cellClass: 'text-center',
        valueGetter: (p) => ((p.data as CallSearchResult | undefined)?.ivrEntered ? 'Y' : 'N'),
        filter: 'agSetColumnFilter',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          if (!p.data?.ivrEntered) return <span className="text-gray-300">-</span>;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (p.data) onIvrDrilldown?.(p.data);
              }}
              title="IVR 모드로 이 콜 검색"
              aria-label="IVR 모드로 검색"
              className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
            >
              <Phone className="size-3.5" />
            </button>
          );
        },
      },
      {
        // 첫 CTI 큐 분배 (T_TYPE=5 AND T_FIRST=1) — 같은 UCID hop 중에서 BE 가 IN 절 보강
        headerName: '상담요청 큐',
        field: 'queueName',
        width: 130,
        tooltipValueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          return r?.queueId ? String(r.queueId) : undefined;
        },
        valueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          return r?.queueName ?? (r?.queueId ? String(r.queueId) : '');
        },
      },
      {
        // 응대 상담사 그룹 (TB_DM_IC_AGT_CNT_CDR 첫 응대 row) — IVR 모드는 enrich 안 함 → 숨김
        headerName: '상담그룹',
        field: 'groupName',
        width: 120,
        hide: isIvr,
        valueGetter: (p) => p.data?.groupName ?? '',
      },
      {
        headerName: '상담사',
        field: 'agentName',
        width: 110,
        hide: isIvr,
        tooltipValueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          return r?.agentId ? String(r.agentId) : undefined;
        },
        valueGetter: (p) => p.data?.agentName ?? '',
      },
      // ── 종료 (PBX 전용 — IVR 시 숨김) ──
      {
        headerName: '종료유형',
        field: 'ccType',
        width: 90,
        hide: isIvr,
        valueGetter: (p) => {
          const v = p.data?.ccType;
          if (v == null) return '';
          return CC_TYPE_LABEL[v]?.label ?? String(v);
        },
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const v = p.data?.ccType;
          if (v == null) return '-';
          const meta = CC_TYPE_LABEL[v] ?? { color: 'bg-gray-100 text-gray-600', label: String(v) };
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.color}`}>{meta.label}</span>;
        },
      },
      {
        headerName: '종료주체',
        field: 'ccPart',
        width: 100,
        hide: isIvr,
        valueGetter: (p) => {
          const v = p.data?.ccPart;
          if (v == null) return '';
          return CC_PART_LABEL[v]?.label ?? String(v);
        },
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const v = p.data?.ccPart;
          if (v == null) return '-';
          const meta = CC_PART_LABEL[v] ?? { color: 'bg-gray-100 text-gray-600', label: String(v) };
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.color}`}>{meta.label}</span>;
        },
      },
      {
        // CR_CONN 은 마지막 hop만의 통화 성공 여부 — CC_TYPE 과 정보 중복이라 기본 숨김
        headerName: '연결',
        field: 'crConn',
        width: 60,
        hide: true,
        valueFormatter: (p) => (p.value == null ? '-' : p.value === 1 ? 'O' : 'X'),
      },
      // ── 발신 회선 (기본 숨김) ──
      { headerName: 'O_LRDN', field: 'oLrdn', width: 120, hide: true, cellClass: 'font-mono text-[11px]' },
      { headerName: 'O_RN', field: 'oRn', width: 120, hide: true, cellClass: 'font-mono text-[11px]' },
      { headerName: 'O_AC', field: 'oAc', width: 80, hide: true },
      {
        headerName: 'O_TYPE',
        field: 'oType',
        width: 90,
        hide: true,
        valueFormatter: (p) => (p.value == null ? '-' : (LINE_TYPE_LABEL[p.value as number] ?? String(p.value))),
      },
      { headerName: 'O_NAME', field: 'oName', width: 120, hide: true },
      // ── 착신 회선 (기본 숨김) ──
      { headerName: 'T_LRDN', field: 'tLrdn', width: 120, hide: true, cellClass: 'font-mono text-[11px]' },
      { headerName: 'T_RN', field: 'tRn', width: 120, hide: true, cellClass: 'font-mono text-[11px]' },
      { headerName: 'T_AC', field: 'tAc', width: 80, hide: true },
      {
        headerName: 'T_TYPE',
        field: 'tType',
        width: 90,
        hide: true,
        valueFormatter: (p) => (p.value == null ? '-' : (LINE_TYPE_LABEL[p.value as number] ?? String(p.value))),
      },
      { headerName: 'T_NAME', field: 'tName', width: 120, hide: true },
      // ── 종료 사유 (기본 숨김) ──
      {
        headerName: '종료사유',
        field: 'ccErrCode',
        width: 100,
        hide: true,
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      // ── ID (기본 숨김 — 상세 화면에서 명칭 매핑) ──
      { headerName: 'NODE_ID', field: 'nodeId', width: 90, hide: true, type: 'numericColumn' },
      { headerName: 'TENANT_ID', field: 'tenantId', width: 100, hide: true, type: 'numericColumn' },
      { headerName: 'SYSTEM_ID', field: 'systemId', width: 100, hide: true, type: 'numericColumn' },
    ],
    [isIvr, onCtiDrilldown, onIvrDrilldown],
  );

  return (
    <div className="flex-1 min-h-0 w-full">
      <AgGridReact<CallSearchResult>
        rowData={rows}
        columnDefs={columnDefs}
        gridOptions={gridOptions}
        loading={loading}
        defaultColDef={{ filter: true, sortable: true, resizable: true, suppressHeaderMenuButton: true }}
        getRowId={(p) => p.data.ucid}
        onRowDoubleClicked={(e: RowDoubleClickedEvent<CallSearchResult>) => {
          if (e.data && onRowDoubleClick) onRowDoubleClick(e.data);
        }}
      />
    </div>
  );
}
