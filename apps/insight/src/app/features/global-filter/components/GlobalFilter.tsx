import ComparisonToggle from './ComparisonToggle';
import TimeUnitToggle from './TimeUnitToggle';
import { useReportViewStore } from '../../../stores/useReportViewStore';
import { useGetSearchBindings } from '../../report/hooks/useReportQueries';
import type { ComparisonType, TimeUnit } from '../types';
import { Button } from '@/components/ui/button';

interface GlobalFilterProps {
  reportId: number;
  mode: 'editor' | 'view';
}

export default function GlobalFilter({ reportId, mode }: GlobalFilterProps) {
  const { globalFilter, setTimeUnit, setComparison, setPeriod } = useReportViewStore();
  const { data: searchBindings = [] } = useGetSearchBindings({ params: { reportId } });

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-white border-b border-bt-border flex-wrap">
      {/* 기간 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-bt-fg-muted">기간</span>
        <div className="flex items-center gap-1 rounded border border-bt-border bg-bt-bg-muted/30 px-2 py-1 text-[11px]">
          <input
            type="date"
            value={globalFilter.period.from}
            onChange={(e) => setPeriod(e.target.value, globalFilter.period.to)}
            className="bg-transparent text-[11px] focus:outline-none"
          />
          <span className="text-bt-fg-muted">~</span>
          <input
            type="date"
            value={globalFilter.period.to}
            onChange={(e) => setPeriod(globalFilter.period.from, e.target.value)}
            className="bg-transparent text-[11px] focus:outline-none"
          />
        </div>
      </div>

      {/* 단위 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-bt-fg-muted">단위</span>
        <TimeUnitToggle value={globalFilter.timeUnit} onChange={(unit: TimeUnit) => setTimeUnit(unit)} />
      </div>

      {/* 검색조건 바인딩 (TODO: 실제 INPUT_TYPE별 렌더링) */}
      {searchBindings.map((binding) => (
        <div key={binding.bindId} className="flex items-center gap-1.5">
          <span className="text-[11px] text-bt-fg-muted">{binding.title}</span>
          <div className="rounded border border-bt-border bg-bt-bg-muted/30 px-2 py-1 text-[11px] min-w-[80px]">
            <span className="text-bt-fg-muted">선택…</span>
          </div>
        </div>
      ))}

      {/* 비교 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-bt-fg-muted">비교</span>
        <ComparisonToggle value={globalFilter.comparison} timeUnit={globalFilter.timeUnit} onChange={(comparison: ComparisonType | null) => setComparison(comparison)} />
      </div>

      {/* 조회 버튼 */}
      <Button size="sm" className="ml-auto bg-bt-primary hover:bg-bt-primary-hover text-white text-[11px] h-7">
        조회
      </Button>
    </div>
  );
}
