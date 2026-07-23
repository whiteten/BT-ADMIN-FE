/**
 * 장애 이력 공통 배지·포맷 유틸.
 * 등급/상태 코드 의미는 AS-IS 공통코드(ERROR_LEVEL/ERROR_STATUS) 기준.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

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

const FAULT_LEVEL_META: Record<string, { label: string; className: string }> = {
  '1': { label: 'Minor', className: 'text-amber-600 bg-amber-50' },
  '2': { label: 'Major', className: 'text-orange-600 bg-orange-50' },
  '3': { label: 'Critical', className: 'text-red-500 bg-red-50' },
};

/** 그리드 filterValueGetter용 등급 라벨 */
export function faultLevelLabel(level: string | null | undefined): string {
  return level ? (FAULT_LEVEL_META[level]?.label ?? String(level)) : '';
}

/** 그리드 filterValueGetter용 상태 라벨 — 복구시각 존재 여부로 판정 */
export function faultStatusLabel(repairTime: string | null | undefined): string {
  return repairTime ? '복구' : '장애발생';
}

/** 등급 배지 — '1' Minor / '2' Major / '3' Critical */
export function LevelBadge({ level }: { level: string | null }) {
  const c = level ? FAULT_LEVEL_META[level] : undefined;
  if (!c) return <span className="text-gray-400">-</span>;
  return (
    <Badge variant="secondary" className={cn(BADGE_CLASS, 'font-bold', c.className)}>
      {c.label}
    </Badge>
  );
}

/** 상태 배지 — 복구시각 존재 여부로 판정(IS NULL = 미복구, AS-IS 확정 규약) */
export function FaultStatusBadge({ repairTime }: { repairTime: string | null }) {
  return (
    <Badge variant="secondary" className={cn(BADGE_CLASS, repairTime ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50')}>
      {faultStatusLabel(repairTime)}
    </Badge>
  );
}
