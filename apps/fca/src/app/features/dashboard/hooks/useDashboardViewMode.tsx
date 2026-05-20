import { useState } from 'react';
import { DASHBOARD_VIEW, type DashboardViewMode } from '../types';
import { IconChartLine, IconGrid } from '@/libs/shared-ui/src/components/custom/Icons';

const useDashboardViewMode = (supportedModes: DashboardViewMode[]) => {
  const [viewMode, setViewMode] = useState<DashboardViewMode>(DASHBOARD_VIEW.CHART);

  const viewModeToggleNode =
    supportedModes.length >= 2 ? (
      <div className="flex items-center gap-1">
        <span
          className={`inline-flex items-center justify-center w-8 h-8 cursor-pointer rounded border transition-colors hover:bg-gray-100 ${viewMode === DASHBOARD_VIEW.CHART ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300'}`}
          onClick={() => setViewMode(DASHBOARD_VIEW.CHART)}
        >
          <IconChartLine />
        </span>
        <span
          className={`inline-flex items-center justify-center w-8 h-8 cursor-pointer rounded border transition-colors hover:bg-gray-100 ${viewMode === DASHBOARD_VIEW.TABLE ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300'}`}
          onClick={() => setViewMode(DASHBOARD_VIEW.TABLE)}
        >
          <IconGrid />
        </span>
      </div>
    ) : undefined;

  return { viewMode, viewModeToggleNode };
};

export default useDashboardViewMode;
