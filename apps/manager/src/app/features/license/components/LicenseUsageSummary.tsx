import type { ServerGroupUsage } from '../types/license.types';
import { calcTotalUsageStats, getUsageBarColor, getUsageColorClass } from '../utils/licenseUtils';
import { cn } from '@/lib/utils';

interface LicenseUsageSummaryProps {
  serverGroups: ServerGroupUsage[];
  label?: string;
  licenseCount?: number;
  isSelected?: boolean;
  onClearSelection?: () => void;
}

const LicenseUsageSummary = ({ serverGroups, label = '전체', licenseCount, isSelected, onClearSelection }: LicenseUsageSummaryProps) => {
  const stats = calcTotalUsageStats(serverGroups);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-800">라이선스 사용 현황</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{label}</span>
          {isSelected && onClearSelection && (
            <button onClick={onClearSelection} className="text-xs text-blue-600 hover:text-blue-700 ml-2">
              전체보기
            </button>
          )}
        </div>
        <div className="flex items-center gap-5 text-sm">
          {licenseCount !== undefined && (
            <div className="text-slate-500">
              라이선스 <span className="font-semibold text-slate-800">{licenseCount}</span>건
            </div>
          )}
          <div className="text-slate-500">
            수량 항목 <span className="font-semibold text-slate-800">{stats.totalQty.toLocaleString()}</span>
          </div>
          {stats.totalFunc > 0 && (
            <div className="text-slate-500">
              기능 항목{' '}
              <span className="font-semibold text-slate-800">
                {stats.enabledFunc}/{stats.totalFunc}
              </span>{' '}
              활성
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${stats.percent}%`,
              backgroundColor: getUsageBarColor(stats.percent),
            }}
          />
        </div>
        <span className={cn('text-sm font-semibold w-12 text-right', getUsageColorClass(stats.percent))}>{stats.percent}%</span>
        <span className="text-xs text-slate-400">
          {stats.usedQty.toLocaleString()} / {stats.totalQty.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default LicenseUsageSummary;
