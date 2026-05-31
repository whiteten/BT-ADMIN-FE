import { memo } from 'react';
import { fmtCount, fmtDuration, fmtPct, toNum } from '../helpers';
import { SEVERITY_META } from '../statusMap';
import type { CtiqRow, CtiqSeverity } from '../types';

/**
 * 큐 큰카드 — 한 큐의 압력·KPI·처리·자원 전체 노출.
 *
 * 4 섹션 구조 (AgentCard 패턴 차용):
 *   ① 헤더 — #ID + severity Tag + 큐명
 *   ② 압력 3컬럼 — 대기 / 최장 / EWT
 *   ③ KPI 진행바 2개 — 응대율 / SLA
 *   ④ 처리 2×3 그리드 + 자원 푸터
 *
 * 성능: memo(row+sev 비교) + content-visibility 로 비가시 카드 렌더 스킵.
 */
export interface CtiqLargeCardProps {
  row: CtiqRow;
  sev: CtiqSeverity;
}

function CtiqLargeCardImpl({ row, sev }: CtiqLargeCardProps) {
  const meta = SEVERITY_META[sev];
  const pulse = sev === 'danger' ? 'animate-pulse' : '';
  const wait = toNum(row.RTS_WAIT_CNT) ?? 0;
  const login = toNum(row.RTS_EXP_LOGIN_AGT) ?? 0;
  const conn = toNum(row.SUM_CONN_CNT) ?? 0;
  const answered = toNum(row.SUM_ANSWER_CNT_TOT) ?? toNum(row.SUM_ANSWER_CNT) ?? 0;

  return (
    <div className={`relative bg-white border ${meta.cardBorder} rounded-sm p-3 transition-shadow hover:shadow-md [content-visibility:auto] [contain-intrinsic-size:240px]`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.barCls}`} />

      {/* ① 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${meta.dotCls} ${pulse}`} />
            <span className="font-mono text-[11px] text-gray-500">#{String(row.CTIQ_ID ?? row.GDN_NO ?? '—')}</span>
            <span className={`inline-flex items-center px-1.5 py-0 text-[10.5px] font-semibold rounded ${meta.chipCls} border`}>{meta.label}</span>
          </div>
          <div className="mt-0.5 truncate text-[13.5px] font-semibold text-gray-900">{row.CTIQ_NAME || '(이름 없음)'}</div>
        </div>
      </div>

      {/* ② 압력 3컬럼 */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <Cell label="대기" value={fmtCount(wait)} emphasis={sev === 'danger' || sev === 'warn' || sev === 'alert'} severity={sev} big />
        <Cell label="최장" value={fmtDuration(row.RTS_MAXWAIT_TIME)} emphasis={sev === 'alert' || sev === 'danger'} severity={sev} />
        <Cell label="EWT" value={fmtDuration(row.KPI_EWT_TIME)} severity={sev} />
      </div>

      {/* ③ KPI 진행바 */}
      <ProgressRow label="응대율" value={toNum(row.KPI_ANSWER_RATE)} />
      <ProgressRow label="SLA" value={toNum(row.KPI_SVCLEVEL)} severity={sev} />

      {/* ④ 처리 2×3 그리드 */}
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
        <KV label="인입" value={fmtCount(conn)} />
        <KV label="응대" value={fmtCount(answered)} />
        <KV label="포기" value={fmtCount(row.SUM_ABDN_CNT)} danger={(toNum(row.SUM_ABDN_CNT) ?? 0) > 0 && sev === 'danger'} />
        <KV label="포기율" value={fmtPct(row.KPI_ABANDON_RATIO)} danger={sev === 'danger'} />
        <KV label="평균통화" value={fmtDuration(row.AVG_ANSTALK_TIME)} />
        <KV label="평균대기" value={fmtDuration(row.AVG_ANSWAIT_TIME)} />
      </div>

      {/* 자원 푸터 */}
      <div className="mt-2 pt-1.5 border-t border-gray-200 text-[11px] text-gray-600 flex items-center justify-between">
        <span>
          로그인 <span className="font-mono text-gray-900">{login}</span>
        </span>
        <span className="text-gray-400">대기율 {fmtPct(row.KPI_WORKREADY_RATIO)}</span>
      </div>
    </div>
  );
}

// ─── 서브 컴포넌트 (큰카드 전용) ────────────────────────────────

function Cell({ label, value, severity, big, emphasis }: { label: string; value: string; severity: CtiqSeverity; big?: boolean; emphasis?: boolean }) {
  const color = emphasis ? SEVERITY_META[severity].textCls : 'text-gray-900';
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`font-mono font-bold leading-tight ${color} ${big ? 'text-[20px]' : 'text-[15px] pt-0.5'}`}>{value}</div>
    </div>
  );
}

function KV({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${danger ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function ProgressRow({ label, value, severity }: { label: string; value: number | null; severity?: CtiqSeverity }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value * 100));
  const barCls = severity === 'danger' ? 'bg-red-600' : severity === 'alert' ? 'bg-orange-500' : 'bg-emerald-600';
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[10.5px] mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono text-gray-900">{value == null ? '—' : `${pct.toFixed(1)}%`}</span>
      </div>
      <div className="h-[5px] bg-gray-100 rounded overflow-hidden">
        <div className={`h-full ${barCls} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * 성능 최적화 — row·sev 객체 참조가 같으면 리렌더 스킵.
 * 큐 데이터는 매초 갱신이 아니라 WS push 시점에만 객체 교체되므로 단순 비교로 충분.
 */
export default memo(CtiqLargeCardImpl, (prev, next) => prev.row === next.row && prev.sev === next.sev);
