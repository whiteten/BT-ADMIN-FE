/**
 * 1층 전역 KPI 배너 (노드 무관 집계) — 교환기 번호자원 현황 상단.
 *
 * 디자인 v2(2026-06-18) 구조:
 *  - 등록 DN 그룹: 총합(30px 볼드) + 6종 분해(내선/상담사ADN/SIP트렁크 채널/ACD 그룹DN/SIP트렁크 그룹DN/CTI큐 그룹DN)
 *    + 일반↔GlobalDN 분할 바
 *  - GlobalDN 그룹: 총합(violet) + 합산만(BE가 타입별 미제공이므로 분해 없음)
 *  - 우측: 새로고침 / 시각 / 자동갱신 토글
 *
 * 데이터: buildKpi 산출값(DnStatusKpi). GlobalDN 은 합산만 표시(BE가 타입별 집계 미제공 — 추정치 금지).
 * 로딩 중에도 배너 항상 노출(스피너는 카드/리스트 영역에만).
 */
import { Switch, Tooltip } from 'antd';
import { Globe, Info, RefreshCw } from 'lucide-react';

/** KPI 배너 집계값 (buildKpi 산출 — 합 일치 보장) */
export interface DnStatusKpi {
  /** 등록 DN = DN_MASTER 노드 소속 DN 합(내선+SIP트렁크 채널+그룹DN 예약+기타). 배너 분해의 합과 동일 */
  registeredDn: number;
  /** 내선(11) */
  ednTotal: number;
  ednAssigned: number;
  /** SIP트렁크 채널(13) */
  tdnTotal: number;
  /** 그룹DN 예약(DN_MASTER typeCode 14) — 등록 DN 구성요소 */
  gdnReservedTotal: number;
  /** 등록 DN 중 위 3종에 안 잡히는 잔여(PARK/AA 등) — 0이면 미표시. 합 일치용 */
  otherDnTotal: number;
  /** 그룹DN(GDN_MASTER) 건수 — 등록 DN 과 무관한 별도 자원. 16/17/18 합 */
  gdnMasterTotal: number;
  gdnAcd: number;
  gdnCtiq: number;
  gdnSip: number;
  /** GlobalDN 전역 — 전역 번호 공간 예약 DN 합 */
  globalDnTotal: number;
  /** 상담사 ADN(12, 노드 무관) */
  adnTotal: number;
  adnAssigned: number;
}

interface DnStatusKpiBannerProps {
  kpi: DnStatusKpi;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  /** 마지막 갱신 시각 (query.dataUpdatedAt) */
  lastUpdated: number | undefined;
}

function formatUpdated(ts: number | undefined): string {
  if (!ts) return '-- : --';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} 기준`;
}

/** 색상 토큰 (디자인 v2 C 객체와 동일) */
const C = {
  edn: '#405189',
  tdn: '#d97706',
  acd: '#0891b2',
  ctiq: '#0e7490',
  sip: '#155e75',
  gflag: '#7c3aed',
  sca: '#059669',
};

/** 6종 분해 그리드 항목 */
interface BreakItem {
  key: string;
  label: string;
  color: string;
  value: number;
}

/** 6종 분해 — 3×2 그리드 */
function BannerBreak({ items }: { items: BreakItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-5 gap-y-2">
      {items.map((it) => (
        <div key={it.key} className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 whitespace-nowrap text-[10.5px] text-gray-500">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-sm" style={{ background: it.color }} />
            {it.label}
          </span>
          <span className="font-tabular text-[16px] font-bold leading-none text-gray-800">{it.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/** 배너 그룹 (등록 DN 또는 GlobalDN) */
function BannerGroup({
  title,
  titleColor,
  titleIcon,
  tip,
  total,
  totalColor = 'text-gray-800',
  splitNormal,
  splitGlobal,
  note,
  items,
}: {
  title: string;
  titleColor?: string;
  titleIcon?: React.ReactNode;
  tip?: string;
  total: number;
  totalColor?: string;
  /** 일반/GlobalDN 분할 바 (등록DN 그룹에만) */
  splitNormal?: number;
  splitGlobal?: number;
  note?: React.ReactNode;
  items: BreakItem[];
}) {
  const splitPct = splitNormal != null && splitGlobal != null && splitNormal + splitGlobal > 0 ? Math.round((splitGlobal / (splitNormal + splitGlobal)) * 100) : null;

  return (
    <div className="flex items-center gap-[18px]">
      {/* 총합 컬럼 */}
      <div className={`flex flex-col gap-0.5 flex-shrink-0 ${splitPct != null ? 'min-w-[188px]' : 'min-w-[120px]'}`}>
        <span className={`flex items-center gap-1 text-[11px] font-semibold ${titleColor ?? 'text-gray-500'}`}>
          {titleIcon}
          {title}
          {tip && (
            <Tooltip title={tip}>
              <Info className="size-3 text-gray-300" />
            </Tooltip>
          )}
        </span>
        <span className={`font-tabular text-[30px] font-extrabold leading-none tracking-tight ${totalColor}`}>{total.toLocaleString()}</span>
        {splitPct != null && splitNormal != null && splitGlobal != null ? (
          <div className="mt-0.5 flex flex-col gap-1">
            <span className="flex h-1.5 overflow-hidden rounded-full bg-gray-200">
              <span className="block h-full" style={{ width: `${100 - splitPct}%`, background: '#94a3b8' }} />
              <span className="block h-full" style={{ width: `${splitPct}%`, background: C.gflag }} />
            </span>
            <span className="text-[10px] text-gray-400">
              일반 <b className="font-tabular text-gray-500">{splitNormal.toLocaleString()}</b> ·{' '}
              <span className="text-violet-600">
                GlobalDN <b className="font-tabular">{splitGlobal.toLocaleString()}</b> 포함
              </span>
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-400">{note}</span>
        )}
      </div>
      {/* 6종 분해 */}
      <BannerBreak items={items} />
    </div>
  );
}

export default function DnStatusKpiBanner({ kpi, autoRefresh, onToggleAutoRefresh, onRefresh, lastUpdated }: DnStatusKpiBannerProps) {
  // 등록 DN 6종 분해
  const regItems: BreakItem[] = [
    { key: 'edn', label: '내선', color: C.edn, value: kpi.ednTotal },
    { key: 'adn', label: '상담사 ADN', color: C.sca, value: kpi.adnTotal },
    { key: 'tdn', label: 'SIP트렁크 채널', color: C.tdn, value: kpi.tdnTotal },
    { key: 'acd', label: 'ACD 그룹DN', color: C.acd, value: kpi.gdnAcd },
    { key: 'sip', label: 'SIP트렁크 그룹DN', color: C.sip, value: kpi.gdnSip },
    { key: 'ctiq', label: 'CTI큐 그룹DN', color: C.ctiq, value: kpi.gdnCtiq },
  ];

  // 등록 DN 합계 (6종 합)
  const regTotal = regItems.reduce((s, i) => s + i.value, 0);

  return (
    <div className="bg-white bt-shadow flex-shrink-0 overflow-hidden">
      <div className="flex items-stretch gap-6 px-5 py-3.5">
        {/* 등록 DN */}
        <BannerGroup
          title="등록 DN (전체 번호자원)"
          tip="교환기에 실제 등록된 전체 번호자원. 아래 6종 분해의 합과 일치합니다. GlobalDN 은 이 안에 포함된 전역 플래그 분량입니다."
          total={regTotal}
          splitNormal={regTotal - kpi.globalDnTotal}
          splitGlobal={kpi.globalDnTotal}
          items={regItems}
        />

        {/* 디바이더 */}
        <span className="w-px self-stretch flex-shrink-0 bg-gray-200" />

        {/* GlobalDN — BE가 타입별 집계 미제공이므로 합산만 표시(분해 추정치 없음) */}
        <div className="flex items-center gap-[18px]">
          <div className="flex flex-col gap-0.5 flex-shrink-0 min-w-[188px]">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-600">
              <Globe className="size-3 text-violet-600" />
              GlobalDN (등록 DN 중 전역 점유)
              <Tooltip title="전역 번호 공간을 점유하는 GlobalDN. 위 등록 DN에 포함된 부분집합으로, 더해지는 별도 수량이 아닙니다.">
                <Info className="size-3 text-gray-300" />
              </Tooltip>
            </span>
            <span className="font-tabular text-[30px] font-extrabold leading-none tracking-tight text-violet-600">{kpi.globalDnTotal.toLocaleString()}</span>
            <div className="mt-0.5 flex flex-col gap-1">
              <span className="flex h-1.5 overflow-hidden rounded-full bg-gray-200">
                <span className="block h-full" style={{ width: `${regTotal > 0 ? Math.round(((regTotal - kpi.globalDnTotal) / regTotal) * 100) : 100}%`, background: '#94a3b8' }} />
                <span className="block h-full" style={{ width: `${regTotal > 0 ? Math.round((kpi.globalDnTotal / regTotal) * 100) : 0}%`, background: C.gflag }} />
              </span>
              <span className="text-[10px] text-gray-400">
                일반 <b className="font-tabular text-gray-500">{(regTotal - kpi.globalDnTotal).toLocaleString()}</b> ·{' '}
                <span className="text-violet-600">
                  GlobalDN <b className="font-tabular">{kpi.globalDnTotal.toLocaleString()}</b> 포함
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 갱신 영역 */}
        <div className="ml-auto flex flex-shrink-0 items-start gap-3">
          <button
            type="button"
            onClick={onRefresh}
            title="새로고침"
            className="flex size-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:border-[#405189] hover:text-[#405189]"
          >
            <RefreshCw className="size-3.5" />
          </button>
          <span className="mt-1.5 text-[11px] text-gray-400">{formatUpdated(lastUpdated)}</span>
          <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-600">
            <Switch size="small" checked={autoRefresh} onChange={onToggleAutoRefresh} />
            <span>자동갱신</span>
          </label>
        </div>
      </div>
    </div>
  );
}
