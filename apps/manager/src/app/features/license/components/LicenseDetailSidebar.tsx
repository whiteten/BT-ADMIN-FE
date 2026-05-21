import { Button } from 'antd';
import { X } from 'lucide-react';
import LicenseStatusBadge, { FunctionBadge } from './LicenseStatusBadge';
import { LICENSE_GROUP_LABELS, LICENSE_GROUP_ORDER, type LicenseDetailAggregated, type ServerGroupUsage } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { cn } from '@/lib/utils';

interface LicenseDetailSidebarProps {
  detail: LicenseDetailAggregated | undefined;
  isLoading: boolean;
  onClose: () => void;
}

const GROUP_DOT_COLORS: Record<string, string> = {
  IE: 'bg-blue-500',
  IC: 'bg-emerald-500',
  IR: 'bg-violet-500',
  VELOCE: 'bg-amber-500',
};

const LicenseDetailSidebar = ({ detail, isLoading, onClose }: LicenseDetailSidebarProps) => {
  const license = detail?.license;
  const serverGroups = detail?.usage?.serverGroups ?? [];

  // 그룹 순서 정렬
  const orderedGroups = [
    ...LICENSE_GROUP_ORDER.map((code) => serverGroups.find((g) => g.serverGroup === code)).filter((g): g is ServerGroupUsage => !!g),
    ...serverGroups.filter((g) => !LICENSE_GROUP_ORDER.includes(g.serverGroup as (typeof LICENSE_GROUP_ORDER)[number])),
  ];

  return (
    <div className="hidden xl:flex flex-col h-full w-[320px] min-w-[320px] border-l border-slate-200 bg-white bt-shadow">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">라이선스 항목</h3>
        <Button type="text" size="small" icon={<X className="size-4 text-slate-400" />} onClick={onClose} className="!p-0 !h-6 !w-6" />
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <FallbackSpinner />
          </div>
        ) : !license ? (
          <div className="text-center text-sm text-slate-400 py-10">라이선스를 선택하세요.</div>
        ) : (
          <>
            {/* 라이선스 기본 정보 */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1.5">
                <LicenseStatusBadge status={license.status} />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">{license.licenseName}</h4>
              <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span>발행일자</span>
                  <span className="text-slate-700">{license.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>만료일자</span>
                  <span className="text-slate-700">{license.finishDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>유효기간</span>
                  <span className="text-slate-700">{license.validMonth}개월</span>
                </div>
                <div className="flex justify-between">
                  <span>항목 수</span>
                  <span className="text-slate-700">{license.itemCount}개</span>
                </div>
              </div>
            </div>

            {/* 항목 목록 (서버군별 그룹) */}
            <div className="px-4 py-3">
              {orderedGroups.map((group) => (
                <div key={group.serverGroup} className="mb-3 last:mb-0">
                  {/* 그룹 라벨 */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={cn('w-2 h-2 rounded-full', GROUP_DOT_COLORS[group.serverGroup] ?? 'bg-slate-400')} />
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">{group.serverGroup}</span>
                    <span className="text-[11px] text-slate-400">{LICENSE_GROUP_LABELS[group.serverGroup]}</span>
                  </div>

                  {/* 항목 리스트 */}
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <div key={item.licenseKind} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50">
                        <span className="text-xs text-slate-700 truncate flex-1">{item.licenseKindName}</span>
                        {item.isFeature ? (
                          <FunctionBadge isEnabled={item.featureEnabled === true} className="!text-[10px] !px-1.5 !py-0" />
                        ) : (
                          <span className="text-xs font-medium text-slate-800 tabular-nums">{(item.totalQuantity ?? 0).toLocaleString()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LicenseDetailSidebar;
