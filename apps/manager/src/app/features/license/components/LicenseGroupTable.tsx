import { Server } from 'lucide-react';
import { FunctionBadge } from './LicenseStatusBadge';
import type { LicenseUsageItem } from '../types/license.types';
import { getUsageBarColor, getUsageColorClass } from '../utils/licenseUtils';
import { cn } from '@/lib/utils';

interface LicenseGroupTableProps {
  groupCode: string;
  groupName: string;
  items: LicenseUsageItem[];
  onClusterAlloc?: (licenseKind: string) => void;
}

const GROUP_BADGE_STYLES: Record<string, string> = {
  IE: 'bg-blue-50 border-blue-200 text-blue-700',
  IC: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  IR: 'bg-violet-50 border-violet-200 text-violet-700',
  VELOCE: 'bg-amber-50 border-amber-200 text-amber-700',
};

const LicenseGroupTable = ({ groupCode, groupName, items, onClusterAlloc }: LicenseGroupTableProps) => {
  if (!items || items.length === 0) return null;

  const badgeStyle = GROUP_BADGE_STYLES[groupCode] ?? 'bg-slate-50 border-slate-200 text-slate-700';

  return (
    <div>
      {/* 그룹 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border', badgeStyle)}>{groupCode}</span>
        <span className="text-sm font-medium text-slate-700">{groupName}</span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500">
              <th className="text-left py-3 px-4 font-medium w-[240px]">라이선스 종류</th>
              <th className="text-right py-3 px-4 font-medium w-[100px]">총 수량</th>
              <th className="text-right py-3 px-4 font-medium w-[100px]">사용량</th>
              <th className="text-right py-3 px-4 font-medium w-[100px]">여유량</th>
              <th className="py-3 px-4 font-medium w-[200px]">사용률</th>
              <th className="py-3 px-4 font-medium w-[120px]" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              const borderClass = isLast ? '' : 'border-b border-slate-100';

              if (item.isFeature) {
                return (
                  <tr key={item.licenseKind} className={borderClass}>
                    <td className="py-3 px-4 text-sm text-slate-700">{item.licenseKindName}</td>
                    <td colSpan={3} className="py-3 px-4 text-center">
                      <FunctionBadge isEnabled={item.featureEnabled === true} />
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-400 text-center">기능 라이선스</td>
                    <td className="py-3 px-4" />
                  </tr>
                );
              }

              const pct = item.usageRate ?? 0;

              return (
                <tr key={item.licenseKind} className={borderClass}>
                  <td className="py-3 px-4">
                    <div className="text-sm text-slate-700 font-medium">{item.licenseKindName}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700 text-right tabular-nums">{(item.totalQuantity ?? 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 text-right tabular-nums">{(item.usedQuantity ?? 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 text-right tabular-nums">{(item.remainQuantity ?? 0).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: getUsageBarColor(pct) }} />
                      </div>
                      <span className={cn('text-xs font-semibold w-10 text-right tabular-nums', getUsageColorClass(pct))}>{Math.round(pct)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.hasClusterAlloc && onClusterAlloc ? (
                      <button
                        onClick={() => onClusterAlloc(item.licenseKind)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Server className="w-3.5 h-3.5" />
                        클러스터 할당
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LicenseGroupTable;
