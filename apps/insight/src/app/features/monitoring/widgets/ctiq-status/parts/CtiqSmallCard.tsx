import { memo } from 'react';
import { fmtCount, fmtDuration, serviceLevelOf, toNum } from '../helpers';
import { SEVERITY_META } from '../statusMap';
import type { CtiqRow, CtiqSeverity } from '../types';

/**
 * 큐 작은카드 — 큐명 + 대기 + SLA 만 노출 (밀도↑).
 *
 * 성능: memo(row+sev 비교) + content-visibility 로 비가시 카드 렌더 스킵.
 */
export interface CtiqSmallCardProps {
  row: CtiqRow;
  sev: CtiqSeverity;
}

function CtiqSmallCardImpl({ row, sev }: CtiqSmallCardProps) {
  const meta = SEVERITY_META[sev];
  const pulse = sev === 'danger' ? 'animate-pulse' : '';
  const wait = toNum(row.RTS_WAIT_CNT) ?? 0;
  const slaPct = serviceLevelOf(row) * 100;

  return (
    <div className={`relative bg-white border ${meta.cardBorder} rounded-sm p-2 [content-visibility:auto] [contain-intrinsic-size:90px]`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.barCls}`} />
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotCls} ${pulse} shrink-0`} />
        <span className="font-mono text-[10px] text-gray-500 shrink-0">#{String(row.CTIQ_ID ?? row.GDN_NO ?? '—')}</span>
        <span className="truncate text-[12px] font-semibold text-gray-900">{row.CTIQ_NAME || '(이름 없음)'}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-wide text-gray-500 leading-none">대기</div>
          <div className={`font-mono font-bold text-[18px] leading-tight ${sev === 'ok' ? 'text-gray-900' : meta.textCls}`}>{fmtCount(wait)}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wide text-gray-500 leading-none">SLA</div>
          <div className="font-mono text-[12px] leading-tight text-gray-700">{`${slaPct.toFixed(0)}%`}</div>
        </div>
      </div>
      <div className="mt-1 text-[10px] text-gray-500 flex items-center justify-between">
        <span>
          최장 <span className="font-mono text-gray-700">{fmtDuration(row.RTS_MAXWAIT_TIME)}</span>
        </span>
        <span>
          상담사 <span className="font-mono text-gray-700">{toNum(row.RTS_EXP_LOGIN_AGT) ?? 0}</span>
        </span>
      </div>
    </div>
  );
}

export default memo(CtiqSmallCardImpl, (prev, next) => prev.row === next.row && prev.sev === next.sev);
