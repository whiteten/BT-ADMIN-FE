/**
 * CTI 라우팅 결정 흐름 — TB_DM_IC_TRACKING_CDR.TRACKING_DATA 파싱 결과를 6단계 타임라인으로 표시.
 *
 * SD-CALL-TRACKING.md § 0:
 *   진입사유 → 라우팅 룰 → 스킬셋 매칭 → 우선순위 산정 → 시도 → 매칭 완료
 *
 * actionCode 매핑:
 *   0=라우팅 시도, 1=상담원 착신, 2=Host 조회, 3=BSR 대표큐, 4=BSR 수신대기
 */
import { Empty } from 'antd';
import type { CtiRoutingHop } from '../types';

interface Props {
  hops: CtiRoutingHop[];
  loading?: boolean;
}

const STATUS_STYLE: Record<CtiRoutingHop['status'], { bullet: string; text: string }> = {
  SUCCESS: { bullet: 'bg-emerald-100 text-emerald-700', text: 'text-gray-900' },
  PENDING: { bullet: 'bg-amber-100 text-amber-700', text: 'text-gray-900' },
  BUSY: { bullet: 'bg-orange-100 text-orange-700', text: 'text-orange-700' },
  NO_ANSWER: { bullet: 'bg-red-100 text-red-700', text: 'text-red-700' },
  SKIP: { bullet: 'bg-gray-100 text-gray-500', text: 'text-gray-500' },
  FAILED: { bullet: 'bg-red-100 text-red-700', text: 'text-red-700' },
};

const FALLBACK_STYLE = { bullet: 'bg-gray-100 text-gray-500', text: 'text-gray-700' };

const fmtTime = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function CtiRoutingTimeline({ hops, loading }: Props) {
  if (loading) {
    return <div className="p-4 text-[12px] text-gray-500">불러오는 중...</div>;
  }
  if (!hops || hops.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[12px]">CTI 라우팅 정보가 없습니다</span>} />
      </div>
    );
  }
  return (
    <ol className="space-y-3 px-4 py-3">
      {hops.map((hop, idx) => {
        const isLast = idx === hops.length - 1;
        const style = STATUS_STYLE[hop.status] ?? FALLBACK_STYLE;
        return (
          <li key={hop.hopNumber} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`size-7 rounded-full text-[11px] flex items-center justify-center font-semibold ${style.bullet}`}>{hop.hopNumber}</div>
              {!isLast && <div className="w-px flex-1 bg-amber-200 my-1" />}
            </div>
            <div className="flex-1 pb-2 min-w-0">
              <div className={`text-[12px] font-medium ${style.text}`}>{hop.title}</div>
              <div className="text-[11px] text-gray-600 mt-0.5">{hop.description}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 flex flex-wrap gap-x-2">
                {hop.enterTime && <span className="font-mono">{fmtTime(hop.enterTime)}</span>}
                {hop.actionCode != null && <span>동작: {hop.actionCode}</span>}
                {hop.endReason && <span>· {hop.endReason}</span>}
                {hop.agentName && (
                  <span>
                    매칭: {hop.agentName}
                    {hop.agentId ? ` (${hop.agentId})` : ''}
                  </span>
                )}
              </div>
              {hop.meta && Object.keys(hop.meta).length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {Object.entries(hop.meta).map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                      {k}={String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
