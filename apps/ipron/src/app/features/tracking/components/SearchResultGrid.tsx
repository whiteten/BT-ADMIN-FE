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
import { AlertTriangle, Copy, Phone, Search, UserX, Users } from 'lucide-react';
import { toast } from '@/shared-util';
import type { CallSearchResult, TrackingMode } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const DEFAULT_PAGE_SIZE = 100;

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
  /** 검색 결과 rows — 백엔드에서 한 번에 최대 10,000건 받아 메모리 보관 */
  rows: CallSearchResult[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 현재 트래킹 모드 — IVR 시 컬럼 셋 분기 */
  mode?: TrackingMode;
  onRowDoubleClick?: (row: CallSearchResult) => void;
  /** IVR 아이콘 클릭 시 IVR 모드 drill-down 검색 트리거 (PBX 모드만) */
  onIvrDrilldown?: (row: CallSearchResult) => void;
  /** CTI 아이콘 클릭 시 CTI 모드 drill-down 검색 트리거 (IVR 모드만) */
  onCtiDrilldown?: (row: CallSearchResult) => void;
  /** 교환기 CDR 아이콘 클릭 시 콜 상세 Drawer 열기 (PBX 모드만) */
  onPbxCdrInspect?: (row: CallSearchResult) => void;
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

// 발신 통화품질 (R-Factor) 등급 — AS-IS IPR30S1060 동일 임계값
function rFactorBadge(r: number | null | undefined, tType: number | null | undefined): { label: string; cls: string } | null {
  // 대상: T_TYPE in (1=국선, 2=내선, 3=트렁크). 그 외 (IVR큐/CTI큐/ACD큐/PDN) 는 미표기.
  if (tType !== 1 && tType !== 2 && tType !== 3) return null;
  if (r == null || r < 0) return { label: '미수집', cls: 'bg-gray-100 text-gray-500' };
  if (r >= 90) return { label: `탁월 ${r}`, cls: 'bg-emerald-50 text-emerald-700' };
  if (r >= 80) return { label: `좋음 ${r}`, cls: 'bg-lime-50 text-lime-700' };
  if (r >= 70) return { label: `보통 ${r}`, cls: 'bg-amber-50 text-amber-700' };
  if (r >= 60) return { label: `주의 ${r}`, cls: 'bg-orange-50 text-orange-700' };
  return { label: `불량 ${r}`, cls: 'bg-red-50 text-red-700' };
}

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
  3: '트렁크(TDN)',
  4: 'IVR큐',
  5: 'CTI큐',
  6: 'ACD큐',
  7: 'PDN',
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

// MEDIA_TYPE 정적 매핑 — DB TB_IC_MEDIA_USAGE 가 진실 source 지만 검색 그리드용 fallback 표기.
// 사이트별로 다를 수 있으니 미스매치 시 'Type N' 로 fallback.
const MEDIA_TYPE_LABEL: Record<number, string> = {
  10: 'Voice',
  20: 'Chat',
  30: 'Email',
  40: 'SMS',
  50: 'Video',
};

const RESULT_BADGE: Record<string, { color: string; label: string }> = {
  NORMAL: { color: 'bg-emerald-50 text-emerald-700', label: '정상' },
  ABANDONED: { color: 'bg-amber-50 text-amber-700', label: '포기' },
  TRANSFERRED: { color: 'bg-purple-50 text-purple-700', label: '전환' },
  DISCONNECTED: { color: 'bg-red-50 text-red-700', label: '호단절' },
};

export default function SearchResultGrid({ rows, loading = false, mode = 'PBX', onRowDoubleClick, onIvrDrilldown, onCtiDrilldown, onPbxCdrInspect }: Props) {
  const isIvr = mode === 'IVR';
  const isCti = mode === 'CTI';
  const isPbx = !isIvr && !isCti;
  const { gridOptions } = useAggridOptions();

  const columnDefs = useMemo<ColDef<CallSearchResult>[]>(
    () => [
      // ── 기본 (시간 우선) ──
      {
        headerName: '시작시각',
        headerTooltip: '콜이 시작된 시각',
        field: 'startTime',
        width: 160,
        sort: 'desc',
        valueFormatter: (p) => fmtDate(p.value as string),
      },
      {
        headerName: '종료시각',
        headerTooltip: '콜이 완전히 종료된 시각',
        field: 'endTime',
        width: 160,
        hide: isCti,
        valueFormatter: (p) => fmtDate(p.value as string | null),
      },
      {
        // 점유시간 = endTime - startTime (콜 전체 점유 = AS-IS 차감 계산 방식)
        headerName: '점유시간',
        headerTooltip: '콜이 이어진 전체 시간 (분:초)',
        colId: 'occupationSec',
        width: 95,
        hide: isCti,
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
        headerTooltip: '내선통화 / 국선수신(인바운드) / 국선발신(아웃바운드) / 데몬콜',
        field: 'callKind',
        width: 100,
        hide: isCti,
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
        headerTooltip: '콜 고유 번호. 옆 아이콘으로 복사 가능',
        field: 'ucid',
        width: 310,
        tooltipField: 'ucid',
        cellRenderer: (p: { value: string | null }) => {
          const v = p.value ?? '';
          if (!v) return '-';
          return (
            <span className="font-mono text-[11px] flex items-center justify-end gap-1.5 whitespace-nowrap overflow-hidden">
              <span className="truncate text-right min-w-0 flex-1" style={{ direction: 'rtl', unicodeBidi: 'plaintext' }}>
                {v}
              </span>
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
        headerTooltip: '건 쪽 번호 (인바운드=고객, 아웃바운드=내선/상담사)',
        field: 'ani',
        width: 140,
        cellClass: 'font-mono text-[11px]',
      },
      {
        headerName: '수신번호',
        headerTooltip: '받는 쪽 번호 (인바운드=대표/안내, 아웃바운드=고객)',
        field: 'dnis',
        width: 120,
        cellClass: 'font-mono text-[11px]',
      },
      // IVR 전용 — 서비스 번호 (ORIGIN_DNIS, 최초인입)
      {
        headerName: '서비스 번호',
        headerTooltip: 'IVR 안내에 인입된 최초 번호',
        field: 'originDnis',
        width: 120,
        hide: !isIvr,
        cellClass: 'font-mono text-[11px]',
      },
      // IVR 전용 — 시나리오명 (oName 자리에 SERVICE_NAME)
      {
        headerName: '시나리오명',
        headerTooltip: '콜이 거친 IVR 시나리오 이름',
        field: 'oName',
        width: 160,
        hide: !isIvr,
      },
      // IVR 전용 — 종료 타입 (CDR_STATUS — IR_CDR_STATUS 공통코드)
      {
        headerName: '종료 타입',
        headerTooltip: 'IVR 종료 사유 (IVR 정상 / 고객 포기 / CTI 호전환 / 시스템 강제 등)',
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
      // ─── CTI 모드 전용 컬럼 (옴니채널) ─────────────────────────────────────
      {
        headerName: '미디어',
        headerTooltip: 'TB_IC_MEDIA_USAGE.MEDIA_ALIAS (BE 가 MediaUsageCache 로 매핑). 없으면 정적 fallback.',
        colId: 'mediaType',
        field: 'mediaAlias',
        width: 90,
        hide: !isCti,
        valueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          if (!r) return '-';
          if (r.mediaAlias) return r.mediaAlias;
          if (r.mediaType == null) return '-';
          return MEDIA_TYPE_LABEL[r.mediaType] ?? `Type ${r.mediaType}`;
        },
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const r = p.data;
          if (!r) return <span className="text-gray-300">-</span>;
          const label = r.mediaAlias ?? (r.mediaType != null ? (MEDIA_TYPE_LABEL[r.mediaType] ?? `Type ${r.mediaType}`) : null);
          if (!label) return <span className="text-gray-300">-</span>;
          return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700">{label}</span>;
        },
      },
      {
        headerName: '인입 큐',
        headerTooltip: 'TB_DM_IC_QUEUE_STAT_CDR.QUEUE_NAME (QUEUE_DN). DN 은 originDnis 슬롯에 저장됨.',
        colId: 'queueDisplay',
        width: 200,
        hide: !isCti,
        valueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          if (!r) return '';
          const name = r.queueName ?? '';
          const dn = r.originDnis ?? '';
          return name + (dn ? ` (${dn})` : '');
        },
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const r = p.data;
          const name = r?.queueName;
          const dn = r?.originDnis;
          if (!name && !dn) return <span className="text-gray-300">-</span>;
          return (
            <span className="text-[12px] text-gray-800">
              {name ?? '-'}
              {dn && <span className="ml-1 text-[10px] text-gray-400 font-mono">({dn})</span>}
            </span>
          );
        },
      },
      {
        headerName: 'IVR 경유',
        headerTooltip: 'QUE_1020=1 → IVR 경유 인입 / QUE_1030=1 → 직통 인입',
        colId: 'entryPath',
        field: 'entryPath',
        width: 90,
        hide: !isCti,
        cellClass: 'text-center',
        valueGetter: (p) => {
          const v = (p.data as CallSearchResult | undefined)?.entryPath;
          if (v === 'IVR_TRANSFER') return 'IVR 경유';
          if (v === 'DIRECT') return '직통';
          return '-';
        },
        filter: 'agSetColumnFilter',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const v = p.data?.entryPath;
          if (v === 'IVR_TRANSFER') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700">IVR 경유</span>;
          if (v === 'DIRECT') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">직통</span>;
          return <span className="text-gray-300">-</span>;
        },
      },
      {
        headerName: '분배 상담사',
        headerTooltip: 'QUEUE_STAT_CDR.DIST_AGENT_NAME — 분배된 상담사. 미분배는 "-"',
        colId: 'distAgent',
        field: 'agentName',
        width: 140,
        hide: !isCti,
        valueGetter: (p) => (p.data as CallSearchResult | undefined)?.agentName ?? '-',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const name = p.data?.agentName;
          if (!name) return <span className="text-gray-300">— 미분배 —</span>;
          return <span className="text-[12px] text-gray-800">{name}</span>;
        },
      },
      {
        headerName: '대기시간',
        headerTooltip: 'SUM(QUE_1240) 실인입 총 대기시간 — 모든 큐 hop 합산 (콜 단위)',
        colId: 'queueWaitSec',
        field: 'queueWaitSec',
        width: 90,
        hide: !isCti,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        valueFormatter: (p) => fmtDuration(p.value as number | null),
      },
      {
        headerName: '통화시간',
        headerTooltip: 'SUM(QUE_5020) 응답호 총 통화시간 — 모든 큐 hop 합산 (콜 단위)',
        colId: 'talkSec',
        field: 'talkSec',
        width: 90,
        hide: !isCti,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        valueFormatter: (p) => fmtDuration(p.value as number | null),
      },
      {
        headerName: '응답/포기',
        headerTooltip: 'QUE_1080 응답 / QUE_3430+QUE_4570+QUE_3271 포기 (큐/벨/IVR)',
        colId: 'dispatchStatus',
        width: 110,
        hide: !isCti,
        cellClass: 'text-center',
        valueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          if (!r?.dispatchStatus) return '-';
          if (r.dispatchStatus === 'ANSWERED') return '응답';
          if (r.dispatchStatus === 'ABANDONED') {
            const phase = r.abandonedAtPhase;
            if (phase === 'QUEUE') return '큐 포기';
            if (phase === 'RING') return '벨 포기';
            if (phase === 'IVR') return 'IVR 포기';
            return '포기';
          }
          return '미분배';
        },
        filter: 'agSetColumnFilter',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const r = p.data;
          if (!r?.dispatchStatus) return <span className="text-gray-300">-</span>;
          if (r.dispatchStatus === 'ANSWERED') {
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">응답</span>;
          }
          if (r.dispatchStatus === 'ABANDONED') {
            const phase = r.abandonedAtPhase;
            const label = phase === 'QUEUE' ? '큐 포기' : phase === 'RING' ? '벨 포기' : phase === 'IVR' ? 'IVR 포기' : '포기';
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">{label}</span>;
          }
          return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">미분배</span>;
        },
      },
      {
        headerName: '서비스 레벨',
        headerTooltip: 'QUE_1190 (SL 이내) / QUE_1180 (응답) 기준',
        colId: 'serviceLevelStatus',
        width: 100,
        hide: !isCti,
        cellClass: 'text-center',
        valueGetter: (p) => {
          const v = (p.data as CallSearchResult | undefined)?.serviceLevelStatus;
          if (v === 'WITHIN') return 'SL 내 응대';
          if (v === 'OVER') return 'SL 초과';
          return '-';
        },
        filter: 'agSetColumnFilter',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const v = p.data?.serviceLevelStatus;
          if (v === 'WITHIN') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">SL 내</span>;
          if (v === 'OVER') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700">SL 초과</span>;
          return <span className="text-gray-300">-</span>;
        },
      },
      {
        // IVR 연결 여부 (T_TYPE=3 hop 존재) — 아이콘 클릭 시 IVR 모드로 drill-down 검색 (PBX 모드만)
        headerName: 'IVR 연결',
        headerTooltip: 'IVR(자동응답)을 거친 콜. 아이콘 클릭하면 IVR 기준으로 검색',
        colId: 'ivrEntered',
        field: 'ivrEntered',
        width: 95,
        hide: isIvr || isCti,
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
        // CTI 큐 인입 — T_TYPE=5 hop = 콜이 큐에 들어온 시점.
        // 환경 데이터상 IE_BASICCDR 에 T_TYPE=5 hop 이 기록되면 모두 CR_CONN=1 = 인입 성공
        // (분배 시도 자체가 실패한 경우는 IE 에 hop 안 남음 → IR/IC 별도 신호 필요).
        // 3 상태 시각 (큐 hop 여러 번 케이스 대비):
        //  · 모두 인입 성공(connected & !partial)  → 파랑 Users
        //  · 부분 실패(connected & partial)        → 주황 AlertTriangle (큐 hop 중 일부 CR_CONN=0)
        //  · 인입만/전부 실패(!connected)          → 회색 UserX
        headerName: 'CTI 연결',
        headerTooltip: '상담 큐로 들어온 콜.\n👥 큐 인입 성공  ⚠ 일부 실패  ✕ 인입 실패\n클릭하면 CTI 기준으로 검색',
        colId: 'ctiConnected',
        width: 100,
        hide: isIvr || isCti,
        cellClass: 'text-center',
        valueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          if (!r?.ctiAttempt) return '-';
          if (r.ctiConnected && r.ctiPartialFailed) return '부분실패';
          if (r.ctiConnected) return '성공';
          return '실패';
        },
        filter: 'agSetColumnFilter',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const r = p.data;
          if (!r?.ctiAttempt) return <span className="text-gray-300">-</span>;
          const partial = !!r.ctiPartialFailed;
          const connected = !!r.ctiConnected;
          let icon, cls, title;
          if (connected && partial) {
            icon = <AlertTriangle className="size-3.5" />;
            cls = 'inline-flex items-center justify-center text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded px-1 py-0.5 transition-colors';
            title = 'CTI 큐 부분 인입 — 큐 hop 중 일부 실패. 클릭하여 CTI 모드 검색';
          } else if (connected) {
            icon = <Users className="size-3.5" />;
            cls = 'inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors';
            title = 'CTI 큐 인입 성공 — 클릭하여 CTI 모드 검색';
          } else {
            icon = <UserX className="size-3.5" />;
            cls = 'inline-flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors';
            title = 'CTI 큐 인입 실패 — 클릭하여 CTI 모드 검색';
          }
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (r) onCtiDrilldown?.(r);
              }}
              title={title}
              aria-label="CTI 모드로 검색"
              className={cls}
            >
              {icon}
            </button>
          );
        },
      },
      {
        // 내선 분배 결과 — T_TYPE=2 hop = 큐 → 상담사 분배(라우팅) 산물.
        //  CR_CONN=1 = 상담사 응답, CR_CONN=0 = 호출됐으나 미응답/거절.
        // 3 상태:
        //  · 모두 응답(connected & !partial)    → 초록 Users  (분배+응답 성공)
        //  · 부분 미응답(connected & partial)   → 주황 AlertTriangle (재분배 발생)
        //  · 분배만/전부 미응답(!connected)     → 회색 UserX (호출했으나 응답 못 받음)
        headerName: '내선 연결',
        headerTooltip: '상담사에게 분배된 콜.\n👥 상담사 응답  ⚠ 일부 미응답 후 재분배  ✕ 호출했으나 미응답\n클릭하면 CTI 기준으로 검색',
        colId: 'agentConnected',
        width: 100,
        hide: isIvr || isCti,
        cellClass: 'text-center',
        valueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          if (!r?.agentAttempt) return '-';
          if (r.agentConnected && r.agentPartialFailed) return '부분응답';
          if (r.agentConnected) return '응답';
          return '미응답';
        },
        filter: 'agSetColumnFilter',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const r = p.data;
          if (!r?.agentAttempt) return <span className="text-gray-300">-</span>;
          const partial = !!r.agentPartialFailed;
          const connected = !!r.agentConnected;
          let icon, cls, title;
          if (connected && partial) {
            icon = <AlertTriangle className="size-3.5" />;
            cls = 'inline-flex items-center justify-center text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded px-1 py-0.5 transition-colors';
            title = '상담사 분배 부분 응답 — 일부 미응답 후 재분배 응답. 클릭하여 CTI 모드 검색';
          } else if (connected) {
            icon = <Users className="size-3.5" />;
            cls = 'inline-flex items-center justify-center text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded px-1 py-0.5 transition-colors';
            title = '상담사 분배 응답 성공 — 클릭하여 CTI 모드 검색';
          } else {
            icon = <UserX className="size-3.5" />;
            cls = 'inline-flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors';
            title = '상담사 분배 미응답 — 호출했으나 응답 못 받음. 클릭하여 CTI 모드 검색';
          }
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (r) onCtiDrilldown?.(r);
              }}
              title={title}
              aria-label="CTI 모드로 검색"
              className={cls}
            >
              {icon}
            </button>
          );
        },
      },
      // ── 종료 (PBX 전용 — IVR 시 숨김) ──
      {
        headerName: '종료유형',
        headerTooltip: '콜이 어떻게 끝났는지 (정상 종료 / 포기 / 호전환 / 회수 / 초과 등)',
        field: 'ccType',
        width: 90,
        hide: isIvr || isCti,
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
        headerName: '발신 통화품질',
        headerTooltip: '발신 R-Factor 기준 등급 (착신 회선이 국선/내선/트렁크 인 경우만 평가)',
        colId: 'oRFactor',
        field: 'oRFactor',
        width: 110,
        hide: isIvr || isCti,
        cellClass: 'text-center',
        valueGetter: (p) => {
          const r = p.data as CallSearchResult | undefined;
          const b = rFactorBadge(r?.oRFactor, r?.tType);
          return b ? b.label : '-';
        },
        filter: 'agSetColumnFilter',
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const r = p.data;
          const b = rFactorBadge(r?.oRFactor, r?.tType);
          if (!b) return <span className="text-gray-300">-</span>;
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${b.cls}`}>{b.label}</span>;
        },
      },
      {
        headerName: '종료주체',
        headerTooltip: '누가 끊었는지 (국선/내선/협의/시스템)',
        field: 'ccPart',
        width: 100,
        hide: isIvr || isCti,
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
      // ── 교환기 CDR 상세 진입 — 종료주체 옆 (PBX 모드만, 고정 해제) ──
      {
        headerName: '교환기 CDR',
        headerTooltip: '콜의 hop 별 교환기 CDR 상세 보기',
        colId: 'pbxCdrInspect',
        width: 110,
        hide: isIvr || isCti,
        cellClass: 'text-center',
        sortable: false,
        filter: false,
        cellRenderer: (p: { data?: CallSearchResult }) => {
          const r = p.data;
          if (!r) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPbxCdrInspect?.(r);
              }}
              title="교환기 CDR 상세 보기"
              aria-label="교환기 CDR 상세"
              className="inline-flex items-center justify-center text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
            >
              <Search className="size-3.5" />
            </button>
          );
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
    [isIvr, onCtiDrilldown, onIvrDrilldown, onPbxCdrInspect],
  );

  return (
    <div className="flex-1 min-h-0 w-full [&_.ag-loading]:!hidden [&_.ag-loading-row]:!hidden [&_.ag-loading-center]:!hidden [&_.ag-cell-wrapper>.ag-icon-loading]:!hidden">
      <AgGridReact<CallSearchResult>
        rowData={rows}
        columnDefs={columnDefs}
        gridOptions={gridOptions}
        sideBar={false}
        loading={loading}
        pagination
        paginationPageSize={DEFAULT_PAGE_SIZE}
        paginationPageSizeSelector={[20, 50, 100, 200, 500]}
        defaultColDef={{ filter: true, sortable: true, resizable: true, floatingFilter: false, suppressHeaderMenuButton: true }}
        getRowId={(p) => p.data.ucid}
        onRowDoubleClicked={(e: RowDoubleClickedEvent<CallSearchResult>) => {
          if (e.data && onRowDoubleClick) onRowDoubleClick(e.data);
        }}
      />
    </div>
  );
}
