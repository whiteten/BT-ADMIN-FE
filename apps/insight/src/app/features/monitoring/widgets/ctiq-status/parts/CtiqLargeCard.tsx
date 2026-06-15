import { memo } from 'react';
import { abandonRateOf, answerRateOf, fmtCount, fmtDuration, fmtPct, serviceLevelOf, toNum } from '../helpers';
import { SEVERITY_META } from '../statusMap';
import type { CtiqRow, CtiqSeverity } from '../types';

/**
 * 큐 큰카드 — 상담사 카드(AgentCard, card density)와 동일한 크기(~156px)·골격으로 통일.
 *
 * 3 섹션 구조 (AgentCard 패턴 차용):
 *   ① 헤더 — dot + #ID + severity chip / 큐명
 *   ② 헤드라인 — 대기 콜수(큰 숫자) + 최장대기(보조)
 *   ③ KPI 2×2 — 응대율 / SLA / 포기율 / 로그인
 *
 * 정보 우선순위상 진행바·누적 처리량·평균값·자원 푸터는 제외(작은카드/표 뷰에서 확인).
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

  const emphasizeWait = sev === 'danger' || sev === 'alert' || sev === 'warn';
  const waitColor = emphasizeWait ? meta.textCls : 'text-slate-800';

  // 상담사 카드와 동일한 높이·외곽선·배경 톤(severity 강조).
  const cardCls = [
    'group relative flex h-full min-h-[156px] flex-col rounded-xl border bg-white text-left transition-all duration-200 w-full',
    '[content-visibility:auto] [contain-intrinsic-size:156px]',
    'hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5',
    sev === 'danger'
      ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500'
      : sev === 'alert'
        ? 'border-orange-400 bg-orange-50/30'
        : sev === 'warn'
          ? 'border-amber-400 bg-amber-50/20'
          : 'border-slate-200 hover:border-slate-300',
  ].join(' ');

  return (
    <div className={cardCls}>
      {/* ① 헤더 — #ID + severity chip / 큐명 */}
      <div className="px-4 pt-3.5">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${meta.dotCls} ${pulse}`} />
          <span className="font-mono text-[11px] text-slate-400">#{String(row.CTIQ_ID ?? row.GDN_NO ?? '—')}</span>
          <span className={`ml-auto inline-flex items-center rounded border px-1.5 py-0 text-[10.5px] font-semibold ${meta.chipCls}`}>{meta.label}</span>
        </div>
        <div className="mt-0.5 truncate text-[14px] font-bold text-slate-900">{row.CTIQ_NAME ? String(row.CTIQ_NAME) : '(이름 없음)'}</div>
      </div>

      {/* ② 헤드라인 — 대기(큰 숫자) + 최장(보조) */}
      <div className="flex items-baseline gap-2 px-4 pt-2">
        <span className={`font-mono text-[26px] font-extrabold leading-none tabular-nums tracking-tighter ${waitColor}`}>{fmtCount(wait)}</span>
        <span className="text-[11px] text-slate-400">대기</span>
        <span className="ml-auto text-[11px] text-slate-500">
          최장 <span className="font-mono tabular-nums text-slate-700">{fmtDuration(row.RTS_MAXWAIT_TIME)}</span>
        </span>
      </div>

      {/* ③ KPI 2×2 — 응대율 / SLA / 포기율 / 로그인 */}
      <div className="mt-auto rounded-b-xl border-t border-slate-100 bg-slate-50/50 px-4 pb-3.5 pt-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          <Stat label="응대율" value={fmtPct(answerRateOf(row))} />
          <Stat label="SLA" value={fmtPct(serviceLevelOf(row))} align="right" />
          <Stat label="포기율" value={fmtPct(abandonRateOf(row))} danger={sev === 'danger'} />
          <Stat label="로그인" value={String(login)} align="right" />
        </div>
      </div>
    </div>
  );
}

// ─── 서브요소 (AgentCard 의 Stat 와 동일 패턴) ──────────────────
function Stat({ label, value, danger, align }: { label: string; value: string; danger?: boolean; align?: 'left' | 'right' }) {
  return (
    <div className={`flex min-w-0 items-center justify-between gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className="shrink-0 font-medium text-slate-500">{label}</span>
      <span className={`truncate font-mono font-bold tabular-nums ${danger ? 'text-red-600' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

/**
 * 성능 최적화 — row·sev 객체 참조가 같으면 리렌더 스킵.
 * 큐 데이터는 매초 갱신이 아니라 WS push 시점에만 객체 교체되므로 단순 비교로 충분.
 */
export default memo(CtiqLargeCardImpl, (prev, next) => prev.row === next.row && prev.sev === next.sev);
