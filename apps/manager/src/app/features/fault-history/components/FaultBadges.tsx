/**
 * 장애 이력 공통 배지·포맷 유틸.
 * 등급/상태 코드 의미는 AS-IS 공통코드(ERROR_LEVEL/ERROR_STATUS) 기준.
 */

/** 발생일(yyyyMMdd)+발생시각(HHmmss) → 'YYYY-MM-DD HH:mm:ss' */
export function formatOccurredAt(errDate?: string | null, errTime?: string | null): string {
  if (!errDate || errDate.length < 8) return '-';
  const d = `${errDate.slice(0, 4)}-${errDate.slice(4, 6)}-${errDate.slice(6, 8)}`;
  if (!errTime || errTime.length < 6) return d;
  return `${d} ${errTime.slice(0, 2)}:${errTime.slice(2, 4)}:${errTime.slice(4, 6)}`;
}

/** 복구시각(yyyyMMddHHmmss) → 'YYYY-MM-DD HH:mm:ss' */
export function formatRepairTime(ts?: string | null): string {
  if (!ts || ts.length < 14) return '-';
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}`;
}

/** 등급 배지 — '1' Minor / '2' Major / '3' Critical */
export function LevelBadge({ level }: { level: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    '1': { label: 'Minor', className: 'bg-yellow-100 text-yellow-800' },
    '2': { label: 'Major', className: 'bg-orange-100 text-orange-800' },
    '3': { label: 'Critical', className: 'bg-red-100 text-red-800' },
  };
  const c = level ? config[level] : undefined;
  if (!c) return <span className="text-gray-400">-</span>;
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.className}`}>{c.label}</span>;
}

/** 상태 배지 — 복구시각 존재 여부로 판정(IS NULL = 미복구, AS-IS 확정 규약) */
export function FaultStatusBadge({ repairTime }: { repairTime: string | null }) {
  return repairTime ? (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">복구</span>
  ) : (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">장애발생</span>
  );
}
