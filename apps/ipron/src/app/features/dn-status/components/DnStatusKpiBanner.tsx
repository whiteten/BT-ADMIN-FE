/**
 * 1층 전역 KPI 배너 (노드 무관 집계) — 교환기 번호자원 현황 상단.
 *
 * 표준 2단 재설계의 1층. react-flow HUD(DnStatusHud) 대체.
 *
 * 표기 의미 정합(2026-06-16 검수 반영 — 모든 숫자/라벨 자명·합 일치):
 *  - "등록 DN" = DN_MASTER 노드 소속 DN 합(내선 11 + SIP트렁크 채널 13 + 그룹DN 예약 14 + 기타).
 *    배너 분해(내선/SIP트렁크 채널/그룹DN 예약[+기타])의 합 = 등록 DN. "라이센스 한도 아님" 툴팁.
 *  - 그룹DN(GDN_MASTER) 건수(ACD/CTI큐/SIP트렁크)는 등록 DN 구성요소가 아니라 별도 섹션으로 분리.
 *  - 할당률 = 내선(11) 기준(SIP트렁크 채널·예약 DN 은 할당 개념이 옅어 희석 방지) — 라벨에 "내선 기준" 명시.
 *  - 상담사 ADN = 노드 무관(NODE_ID=0), 총/할당 분모 병기.
 *  - GlobalDN 전역 = 전역 번호 공간 예약 DN 합(노드 GlobalDN 의 합) — 툴팁 보강.
 *
 * 로딩 중에도 배너는 항상 노출(스피너는 카드 영역에만) — 진입 즉시 흰 화면 금지.
 * 노드 상태점/헬스 어포던스 없음(데이터 없음). 새로고침/자동갱신 토글만 우측.
 */
import { Switch, Tooltip } from 'antd';
import { Globe, Info, Phone, RadioTower, RefreshCw, Users } from 'lucide-react';

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

/** 단일 KPI 셀 — 라벨 + 큰 값 + 보조 */
function KpiStat({
  icon,
  label,
  value,
  sub,
  valueColor = 'text-gray-800',
  tip,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
  valueColor?: string;
  tip?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
        {icon}
        {label}
        {tip && (
          <Tooltip title={tip}>
            <Info className="size-3 text-gray-300" />
          </Tooltip>
        )}
      </span>
      <span className={`text-[20px] font-bold leading-tight ${valueColor}`}>{value}</span>
      {sub && <span className="text-[11px] text-gray-500">{sub}</span>}
    </div>
  );
}

export default function DnStatusKpiBanner({ kpi, autoRefresh, onToggleAutoRefresh, onRefresh, lastUpdated }: DnStatusKpiBannerProps) {
  // 할당률 = 내선 기준 (희석 방지)
  const ednPct = kpi.ednTotal > 0 ? Math.round((kpi.ednAssigned / kpi.ednTotal) * 100) : 0;

  return (
    <div className="bg-white bt-shadow flex-shrink-0 overflow-hidden">
      <div className="flex items-center gap-6 px-5 py-3">
        {/* 등록 DN + 내선 기준 할당률 바 */}
        <div className="flex min-w-[230px] flex-col gap-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
            등록 DN (교환기)
            <Tooltip title="실제 등록된 DN 수(내선 + SIP트렁크 채널 + 그룹DN 예약 등). 라이센스 한도가 아닙니다.">
              <Info className="size-3 text-gray-300" />
            </Tooltip>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold leading-tight text-gray-800">{kpi.registeredDn.toLocaleString()}</span>
            <Tooltip title="내선(11) 기준 할당률. SIP트렁크 채널·예약 DN 은 할당 개념이 없어 분모에서 제외합니다.">
              <span className="cursor-help text-[12px] font-semibold text-[#405189]">내선 기준 할당 {ednPct}%</span>
            </Tooltip>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
              <span className="block h-full rounded-full transition-all" style={{ width: `${ednPct}%`, background: '#405189' }} />
            </span>
            <span className="w-[110px] flex-shrink-0 text-right text-[11px] text-gray-500">
              내선 <b className="text-gray-700">{kpi.ednAssigned.toLocaleString()}</b> / {kpi.ednTotal.toLocaleString()}
            </span>
          </div>
        </div>

        <span className="h-10 w-px flex-shrink-0 bg-gray-200" />

        {/* 등록 DN 분해 (합 = 등록 DN) */}
        <KpiStat icon={<Phone className="size-3" />} label="내선" value={kpi.ednTotal.toLocaleString()} />
        <KpiStat icon={<RadioTower className="size-3" />} label="SIP트렁크 채널" value={kpi.tdnTotal.toLocaleString()} />
        <KpiStat label="그룹DN 예약" value={kpi.gdnReservedTotal.toLocaleString()} tip="DN_MASTER 에 예약된 그룹DN 번호(타입 14). 등록 DN 합계에 포함됩니다." />
        {kpi.otherDnTotal > 0 && <KpiStat label="기타" value={kpi.otherDnTotal.toLocaleString()} tip="PARK·AA 등 그 외 등록 DN." />}

        <span className="h-10 w-px flex-shrink-0 bg-gray-200" />

        {/* 그룹DN(GDN_MASTER) — 등록 DN 과 별개 자원 */}
        <KpiStat
          label="그룹DN (GDN)"
          value={kpi.gdnMasterTotal.toLocaleString()}
          tip="그룹DN 마스터 등록 건수(ACD·CTI큐·SIP트렁크). 등록 DN 합계와는 별개 자원입니다."
          sub={
            <span className="text-gray-500">
              ACD <b className="text-gray-700">{kpi.gdnAcd.toLocaleString()}</b> · CTI큐 <b className="text-gray-700">{kpi.gdnCtiq.toLocaleString()}</b> · SIP트렁크{' '}
              <b className="text-gray-700">{kpi.gdnSip.toLocaleString()}</b>
            </span>
          }
        />

        <span className="h-10 w-px flex-shrink-0 bg-gray-200" />

        {/* GlobalDN 전역 */}
        <KpiStat
          icon={<Globe className="size-3 text-violet-500" />}
          label="GlobalDN 전역"
          value={kpi.globalDnTotal.toLocaleString()}
          valueColor="text-violet-600"
          tip="전역 번호 공간을 점유하는 DN(전 노드 합). 한 노드 소속이라도 전역에서 중복 불가입니다."
        />

        {/* 상담사 ADN (노드 무관) */}
        <KpiStat
          icon={<Users className="size-3 text-emerald-600" />}
          label="상담사 ADN"
          value={kpi.adnTotal.toLocaleString()}
          tip="상담사 로그인용 ADN(타입 12). 특정 노드에 속하지 않는 공통 자원입니다."
          sub={
            <>
              할당 <b className="text-gray-700">{kpi.adnAssigned.toLocaleString()}</b> / {kpi.adnTotal.toLocaleString()}
            </>
          }
          valueColor="text-gray-800"
        />

        {/* 갱신 영역 */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            title="새로고침"
            className="flex size-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:border-[#405189] hover:text-[#405189]"
          >
            <RefreshCw className="size-3.5" />
          </button>
          <span className="text-[11px] text-gray-400">{formatUpdated(lastUpdated)}</span>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-600">
            <Switch size="small" checked={autoRefresh} onChange={onToggleAutoRefresh} />
            <span>자동갱신</span>
          </label>
        </div>
      </div>
    </div>
  );
}
